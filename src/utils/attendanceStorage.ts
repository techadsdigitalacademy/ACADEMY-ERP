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
  if (raw.includes('T') || raw.includes('-')) {
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
 * Save punch metadata to both localStorage and Supabase Storage (with admin proxy fallback)
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

  // Save to Supabase Storage via admin proxy to avoid RLS block
  const fileName = `${staffId}/${dateStr}.json`;
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
        const combined = { ...(local || {}), ...meta };
        memoryPunchCache.set(key, combined);
        try {
          localStorage.setItem(`staff_punch_${staffId}_${dateStr}`, JSON.stringify(combined));
        } catch (_) {}
        return combined;
      }
    }
  } catch (_) {}

  return local;
}

/**
 * Enrich attendance array with selfie, accurate punch times, working hours, and status
 */
export async function enrichAttendanceRecords(records: any[]): Promise<any[]> {
  if (!records || records.length === 0) return [];
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return Promise.all(
    records.map(async (record) => {
      const staffId = record.staff_id;
      const dateStr = record.attendance_date ? String(record.attendance_date).substring(0, 10) : '';
      if (!staffId || !dateStr) return record;

      const meta = await getPunchMeta(staffId, dateStr);

      const rawIn = meta?.punch_in || record.punch_in || (record.created_at ? formatISTTime(record.created_at) : null);
      const rawOut = meta?.punch_out || record.punch_out || null;
      const formattedIn = formatISTTime(rawIn);
      const formattedOut = rawOut ? formatISTTime(rawOut) : null;
      const isToday = dateStr === todayStr;
      const hoursWorked = calculateWorkingHours(formattedIn, formattedOut, isToday);

      const resolvedStatus = (meta?.status || record.status || 'present').toUpperCase();

      return {
        ...record,
        punch_in: formattedIn || '-',
        punch_out: formattedOut || '-',
        working_hours: hoursWorked,
        selfie_url: meta?.selfie_url || record.selfie_url || null,
        lat: meta?.lat ?? record.lat ?? null,
        lng: meta?.lng ?? record.lng ?? null,
        status: resolvedStatus
      };
    })
  );
}
