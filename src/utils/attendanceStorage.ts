import { supabase } from '../services/supabase';

export interface PunchMeta {
  staff_id: string;
  attendance_date: string;
  punch_in?: string | null;
  punch_out?: string | null;
  selfie_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;
}

const memoryPunchCache = new Map<string, PunchMeta>();

/**
 * Save punch metadata to both localStorage and public Supabase Storage
 */
export async function savePunchMetaToStorage(staffId: string, dateStr: string, data: Partial<PunchMeta>): Promise<void> {
  if (!staffId || !dateStr) return;
  const key = `${staffId}_${dateStr}`;
  const existing = getStoredPunchLocal(staffId, dateStr) || {};
  const merged: PunchMeta = {
    staff_id: staffId,
    attendance_date: dateStr,
    ...existing,
    ...data
  };

  memoryPunchCache.set(key, merged);

  try {
    localStorage.setItem(`staff_punch_${staffId}_${dateStr}`, JSON.stringify(merged));
  } catch (_) {}

  try {
    const fileName = `${staffId}/${dateStr}.json`;
    await supabase.storage
      .from('attendance')
      .upload(fileName, JSON.stringify(merged), {
        contentType: 'application/json',
        upsert: true
      });
  } catch (err) {
    console.warn('Storage punch upload notice:', err);
  }
}

/**
 * Read punch from localStorage
 */
export function getStoredPunchLocal(staffId: string, dateStr: string): PunchMeta | null {
  const key = `${staffId}_${dateStr}`;
  if (memoryPunchCache.has(key)) return memoryPunchCache.get(key)!;

  try {
    const raw = localStorage.getItem(`staff_punch_${staffId}_${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryPunchCache.set(key, parsed);
      return parsed;
    }
  } catch (_) {}
  return null;
}

/**
 * Fetch punch metadata from storage or local cache
 */
export async function getPunchMeta(staffId: string, dateStr: string): Promise<PunchMeta | null> {
  const local = getStoredPunchLocal(staffId, dateStr);
  if (local && local.selfie_url && local.punch_in) {
    return local;
  }

  const key = `${staffId}_${dateStr}`;
  try {
    const fileName = `${staffId}/${dateStr}.json`;
    const { data: { publicUrl } } = supabase.storage.from('attendance').getPublicUrl(fileName);
    if (publicUrl) {
      const res = await fetch(publicUrl, { cache: 'no-cache' });
      if (res.ok) {
        const meta = await res.json();
        memoryPunchCache.set(key, meta);
        try {
          localStorage.setItem(`staff_punch_${staffId}_${dateStr}`, JSON.stringify(meta));
        } catch (_) {}
        return meta;
      }
    }
  } catch (_) {}

  return local;
}

/**
 * Enrich attendance array with selfie, accurate punch times, and status
 */
export async function enrichAttendanceRecords(records: any[]): Promise<any[]> {
  if (!records || records.length === 0) return [];

  return Promise.all(
    records.map(async (record) => {
      const staffId = record.staff_id;
      const dateStr = record.attendance_date ? String(record.attendance_date).substring(0, 10) : '';
      if (!staffId || !dateStr) return record;

      const meta = await getPunchMeta(staffId, dateStr);
      if (!meta) return record;

      return {
        ...record,
        punch_in: meta.punch_in || record.punch_in,
        punch_out: meta.punch_out || record.punch_out,
        selfie_url: meta.selfie_url || record.selfie_url,
        lat: meta.lat ?? record.lat,
        lng: meta.lng ?? record.lng,
        status: meta.status || record.status
      };
    })
  );
}

