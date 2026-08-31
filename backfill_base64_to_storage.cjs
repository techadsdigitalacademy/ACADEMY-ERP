/**
 * One-time backfill: move base64 data URLs out of Postgres into Supabase Storage.
 *
 * Historically `sales.payment_proof_url` and `staff.avatar_url` stored full
 * base64 image data URLs because the upload code named buckets that did not
 * exist and silently fell back to FileReader. That made `sales` ~12MB for 151
 * rows and dominated egress.
 *
 * Reports by default. Pass --apply to actually upload and rewrite the columns.
 * A JSON backup of every original value is written before any mutation.
 */
const fs = require('fs');
const path = require('path');

const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_SERVICE_KEY;
const APPLY = process.argv.includes('--apply');

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// table -> column -> storage bucket + path prefix
const TARGETS = [
  { table: 'sales', column: 'payment_proof_url', bucket: 'payment_slips', prefix: 'slips' },
  { table: 'staff', column: 'avatar_url', bucket: 'avatars', prefix: '' },
];

const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function main() {
  console.log(APPLY ? '=== APPLY MODE (will write) ===\n' : '=== DRY RUN (no writes; pass --apply to execute) ===\n');

  // Phase 1: read every base64 value and persist a backup BEFORE mutating anything.
  const plan = [];
  const backup = {};
  let grandBytes = 0, grandRows = 0;

  for (const t of TARGETS) {
    const res = await fetch(`${URL}/rest/v1/${t.table}?select=id,${t.column}`, { headers: H });
    if (!res.ok) { console.log(`${t.table}: skipped (${res.status})`); continue; }
    const rows = await res.json();
    const blobs = rows.filter(r => typeof r[t.column] === 'string' && r[t.column].startsWith('data:'));
    const bytes = blobs.reduce((a, r) => a + r[t.column].length, 0);
    grandBytes += bytes; grandRows += blobs.length;

    console.log(`${t.table}.${t.column}: ${blobs.length} base64 row(s), ${(bytes / 1048576).toFixed(2)} MB`);
    if (!blobs.length) continue;

    backup[`${t.table}.${t.column}`] = blobs;
    plan.push({ t, blobs });
  }

  console.log(`\nTotal: ${grandRows} row(s), ${(grandBytes / 1048576).toFixed(2)} MB of base64 in the database.`);
  if (!plan.length) return;

  let backupFile = null;
  if (Object.keys(backup).length) {
    backupFile = path.join(__dirname, `base64_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup));
    console.log(`Backup of original values written: ${path.basename(backupFile)} (${(fs.statSync(backupFile).size / 1048576).toFixed(2)} MB)`);
  }

  if (!APPLY) { console.log('\nDry run complete. Re-run with --apply to migrate.'); return; }

  // Phase 2: upload to Storage, then repoint the column at the public URL.
  for (const { t, blobs } of plan) {
    console.log(`\nMigrating ${t.table}.${t.column} -> ${t.bucket}/`);
    let ok = 0, failed = 0;
    for (const row of blobs) {
      try {
        const val = row[t.column];
        const m = val.match(/^data:([^;]+);base64,(.*)$/s);
        if (!m) throw new Error('unparseable data URL');
        const mime = m[1];
        const buf = Buffer.from(m[2], 'base64');
        const ext = EXT[mime] || 'bin';
        const objPath = `${t.prefix ? t.prefix + '/' : ''}backfill_${row.id}.${ext}`;

        const up = await fetch(`${URL}/storage/v1/object/${t.bucket}/${objPath}`, {
          method: 'POST',
          headers: { ...H, 'Content-Type': mime, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
          body: buf,
        });
        if (!up.ok) throw new Error(`upload ${up.status}: ${(await up.text()).slice(0, 160)}`);

        const publicUrl = `${URL}/storage/v1/object/public/${t.bucket}/${objPath}`;
        const patch = await fetch(`${URL}/rest/v1/${t.table}?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ [t.column]: publicUrl }),
        });
        if (!patch.ok) throw new Error(`patch ${patch.status}: ${(await patch.text()).slice(0, 160)}`);

        ok++;
        process.stdout.write(`\r  migrated ${ok}/${blobs.length}`);
      } catch (e) {
        failed++;
        console.error(`\n  FAILED ${t.table} id=${row.id}: ${e.message}`);
      }
    }
    console.log(`\n  done: ${ok} migrated, ${failed} failed`);
  }

  if (backupFile) console.log(`\nOriginals preserved in ${path.basename(backupFile)} if you need to roll back.`);
}

main().catch(e => { console.error(e); process.exit(1); });
