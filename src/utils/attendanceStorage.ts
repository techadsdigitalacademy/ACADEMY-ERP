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
  working_hours?: string | null;
}

const memoryPunchCache = new Map<string, PunchMeta>();
const storageFileCache = new Map<string, string[]>(); // staffId -> list of file names in attendance bucket

/**
 * Format timestamp or time string cleanly in Indian Standard Time (IST)
 */
export function formatISTTime(raw?: string | null): string {
  if (!raw || raw === '-') return '-';

  // If already in 12-hour format like "09:30 AM" or "4:41 PM", return as is
  if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(am|pm)$/i.test(raw.trim())) {
    return raw.trim();
  }

  // If ISO date string e.g. "2026-11-02T11:11:41.511913+00:00"
  if (raw.includes('T') || (raw.includes('-') && raw.length >= 19)) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (_) {}
  }

  // If 24-hour time e.g. "09:30:00" or "16:41:00"
  const parts = raw.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const mins = parts[1].padStart(2, '0');
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
    }
  }

  return raw;
}

/**
 * Parse time string (12h or 24h) to Date object on today's reference date
 */
export function parseTimeToDate(timeStr?: string | null): Date | null {
  if (!timeStr || timeStr === '-') return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // ISO string check
  if (timeStr.includes('T')) {
    const parsedIso = new Date(timeStr);
    return isNaN(parsedIso.getTime()) ? null : parsedIso;
  }

  const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const seconds = match12[3] ? parseInt(match12[3], 10) : 0;
    const modifier = match12[4] ? match12[4].toLowerCase() : null;

    if (modifier === 'pm' && hours < 12) hours += 12;
    if (modifier === 'am' && hours === 12) hours = 0;

    d.setHours(hours, minutes, seconds, 0);
    return d;
  }

  return null;
}

/**
 * Calculate working hours between punch in and punch out or elapsed time in office
 */
export function calculateWorkingHours(
  punchIn?: string | null,
  punchOut?: string | null,
  isToday: boolean = false
): string {
  if (!punchIn || punchIn === '-') return '-';

  const inDate = parseTimeToDate(punchIn);
  if (!inDate) return '-';

  if (punchOut && punchOut !== '-') {
    const outDate = parseTimeToDate(punchOut);
    if (!outDate) return '-';
    const diffMs = outDate.getTime() - inDate.getTime();
    if (diffMs <= 0) return '0.0 hrs';
    const diffHrs = diffMs / (1000 * 60 * 60);
    const hours = Math.floor(diffHrs);
    const mins = Math.round((diffHrs - hours) * 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
  }

  if (isToday) {
    const now = new Date();
    const diffMs = now.getTime() - inDate.getTime();
    if (diffMs > 0) {
      const diffHrs = diffMs / (1000 * 60 * 60);
      const hours = Math.floor(diffHrs);
      const mins = Math.round((diffHrs - hours) * 60);
      return `${hours}h ${mins}m (In Office)`;
    }
  }

  return '-';
}

/**
 * Save punch metadata to localStorage and Supabase Storage across target ID and linked alias IDs
 */
export async function savePunchMetaToStorage(
  staffId: string,
  dateStr: string,
  data: Partial<PunchMeta>,
  linkedIds: string[] = []
): Promise<void> {
  if (!staffId || !dateStr) return;

  const allIds = Array.from(new Set([staffId, ...linkedIds].filter(Boolean)));

  for (const id of allIds) {
    const key = `${id}_${dateStr}`;
    const existing = getStoredPunchLocal(id, dateStr) || {};
    const merged: PunchMeta = {
      staff_id: id,
      attendance_date: dateStr,
      ...existing,
      ...data
    };

    memoryPunchCache.set(key, merged);

    try {
      localStorage.setItem(`staff_punch_${id}_${dateStr}`, JSON.stringify(merged));
    } catch (_) {}

    // Save to Supabase Storage via admin proxy to avoid RLS block
    const fileName = `${id}/${dateStr}.json`;
    const jsonBlob = JSON.stringify(merged);

    try {
      const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${fileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-upsert': 'true'
        },
        body: jsonBlob
      });

      if (!proxyRes.ok) {
        await supabase.storage
          .from('attendance')
          .upload(fileName, jsonBlob, {
            contentType: 'application/json',
            upsert: true
          });
      }
    } catch (err) {
      console.warn('Storage punch upload notice:', err);
    }
  }
}

/**
 * Read punch from localStorage, checking primary ID and any alias IDs
 */
export function getStoredPunchLocal(staffId: string, dateStr: string, linkedIds: string[] = []): PunchMeta | null {
  const idsToCheck = [staffId, ...linkedIds].filter(Boolean);

  for (const id of idsToCheck) {
    const key = `${id}_${dateStr}`;
    if (memoryPunchCache.has(key)) return memoryPunchCache.get(key)!;

    try {
      const raw = localStorage.getItem(`staff_punch_${id}_${dateStr}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryPunchCache.set(key, parsed);
        return parsed;
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Helper to discover punch-in/out selfie photo directly from Supabase Storage bucket
 * based on image timestamp matching the attendance date in Indian Standard Time (IST)
 */
async function findStorageSelfieForDate(staffId: string, dateStr: string): Promise<string | null> {
  if (!staffId || !dateStr) return null;

  try {
    let files = storageFileCache.get(staffId);
    if (!files) {
      const { data } = await supabase.storage.from('attendance').list(staffId);
      if (data) {
        files = data.map(f => f.name);
        storageFileCache.set(staffId, files);
      }
    }

    if (files && files.length > 0) {
      const imageFiles = files.filter(f =>
        f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')
      );

      for (const f of imageFiles) {
        const tsStr = f.split('.')[0];
        const ts = parseInt(tsStr, 10);
        if (!isNaN(ts)) {
          const fDate = new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          if (fDate === dateStr) {
            const { data: { publicUrl } } = supabase.storage
              .from('attendance')
              .getPublicUrl(`${staffId}/${f}`);
            return publicUrl;
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Fetch punch metadata from storage or local cache, checking primary ID and all linked alias IDs
 */
export async function getPunchMeta(
  staffId: string,
  dateStr: string,
  linkedIds: string[] = []
): Promise<PunchMeta | null> {
  const idsToCheck = Array.from(new Set([staffId, ...linkedIds].filter(Boolean)));

  // 1. Check local storage / memory cache across all IDs
  for (const id of idsToCheck) {
    const local = getStoredPunchLocal(id, dateStr);
    if (local && local.selfie_url && local.punch_in) {
      return local;
    }
  }

  // 2. Check Supabase Storage .json across all IDs
  for (const id of idsToCheck) {
    const key = `${id}_${dateStr}`;
    try {
      const fileName = `${id}/${dateStr}.json`;
      const { data: { publicUrl } } = supabase.storage.from('attendance').getPublicUrl(fileName);
      if (publicUrl) {
        const res = await fetch(publicUrl, { cache: 'no-cache' });
        if (res.ok) {
          const meta = await res.json();
          const local = getStoredPunchLocal(id, dateStr);
          const combined = { ...(local || {}), ...meta };
          memoryPunchCache.set(key, combined);
          try {
            localStorage.setItem(`staff_punch_${id}_${dateStr}`, JSON.stringify(combined));
          } catch (_) {}
          return combined;
        }
      }
    } catch (_) {}
  }

  // 3. Fallback: Check if an image exists in storage bucket for this date across IDs
  for (const id of idsToCheck) {
    const selfieUrl = await findStorageSelfieForDate(id, dateStr);
    if (selfieUrl) {
      const local = getStoredPunchLocal(id, dateStr) || {
        staff_id: id,
        attendance_date: dateStr
      };
      const updated = { ...local, selfie_url: selfieUrl };
      memoryPunchCache.set(`${id}_${dateStr}`, updated);
      return updated;
    }
  }

  return getStoredPunchLocal(staffId, dateStr);
}

/**
 * Enrich attendance array with selfie, accurate punch times, working hours, and status.
 * Reconciles multi-punch rows on the same date (e.g. punch-in row and punch-out row)
 * into a single unified record per day per employee.
 */
export async function enrichAttendanceRecords(
  records: any[],
  aliasMap?: Map<string, string[]> | Record<string, string[]>
): Promise<any[]> {
  if (!records || records.length === 0) return [];
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Group records by (employeeIdentifier, attendance_date)
  const grouped = new Map<string, any[]>();

  records.forEach((record) => {
    const rawStaffId = record.staff_id;
    const dateStr = record.attendance_date ? String(record.attendance_date).substring(0, 10) : '';
    if (!rawStaffId || !dateStr) return;

    // Resolve canonical staff ID if aliasMap is provided
    let canonicalId = rawStaffId;
    if (aliasMap) {
      if (aliasMap instanceof Map) {
        for (const [canon, aliases] of aliasMap.entries()) {
          if (canon === rawStaffId || aliases.includes(rawStaffId)) {
            canonicalId = canon;
            break;
          }
        }
      } else if (typeof aliasMap === 'object') {
        for (const [canon, aliases] of Object.entries(aliasMap)) {
          if (canon === rawStaffId || (Array.isArray(aliases) && aliases.includes(rawStaffId))) {
            canonicalId = canon;
            break;
          }
        }
      }
    }

    const groupKey = `${canonicalId}_${dateStr}`;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(record);
  });

  const enrichedResults: any[] = [];

  for (const [_key, dayRecords] of grouped.entries()) {
    // Sort records chronologically by created_at
    dayRecords.sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });

    const primaryRec = dayRecords[0];
    const latestRec = dayRecords.length > 1 ? dayRecords[dayRecords.length - 1] : null;

    const staffId = primaryRec.staff_id;
    const dateStr = primaryRec.attendance_date ? String(primaryRec.attendance_date).substring(0, 10) : '';

    // Collect all linked IDs for this staff member
    let linkedIds: string[] = [];
    if (aliasMap) {
      if (aliasMap instanceof Map && aliasMap.has(staffId)) {
        linkedIds = aliasMap.get(staffId)!;
      } else if (typeof aliasMap === 'object' && Array.isArray((aliasMap as any)[staffId])) {
        linkedIds = (aliasMap as any)[staffId];
      }
    }
    // Also include any staff_ids from the grouped records
    dayRecords.forEach(r => {
      if (r.staff_id && !linkedIds.includes(r.staff_id)) {
        linkedIds.push(r.staff_id);
      }
    });

    const meta = await getPunchMeta(staffId, dateStr, linkedIds);

    // Punch IN: earliest record timestamp or metadata
    let rawIn = meta?.punch_in || primaryRec.punch_in;
    if (!rawIn && primaryRec.created_at) {
      rawIn = formatISTTime(primaryRec.created_at);
    }

    // Punch OUT: latest record timestamp (if different from primary) or metadata
    let rawOut = meta?.punch_out || primaryRec.punch_out || null;
    if (!rawOut && latestRec && latestRec.id !== primaryRec.id && latestRec.created_at) {
      rawOut = formatISTTime(latestRec.created_at);
    }

    const formattedIn = formatISTTime(rawIn);
    const formattedOut = rawOut ? formatISTTime(rawOut) : null;
    const isToday = dateStr === todayStr;
    const hoursWorked = calculateWorkingHours(formattedIn, formattedOut, isToday);

    const resolvedStatus = (meta?.status || primaryRec.status || 'present').toUpperCase();

    enrichedResults.push({
      ...primaryRec,
      punch_in: formattedIn || '-',
      punch_out: formattedOut || '-',
      working_hours: hoursWorked,
      selfie_url: meta?.selfie_url || primaryRec.selfie_url || null,
      lat: meta?.lat ?? primaryRec.lat ?? null,
      lng: meta?.lng ?? primaryRec.lng ?? null,
      status: resolvedStatus
    });
  }

  return enrichedResults;
}
