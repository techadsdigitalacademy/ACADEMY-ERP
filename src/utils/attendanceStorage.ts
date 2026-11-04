import { supabase } from '../services/supabase';

export interface PunchMeta {
  id?: string;
  staff_id: string;
  attendance_date: string;
  punch_in?: string | null;  // Stored in 24-hour format "HH:MM:SS" (e.g. "09:30:15")
  punch_out?: string | null; // Stored in 24-hour format "HH:MM:SS" (e.g. "18:30:00")
  selfie_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;    // Stored in uppercase: "PRESENT" | "LATE" | "HALF_DAY" | "LEAVE"
  working_hours?: string | null;
}

const memoryPunchCache = new Map<string, PunchMeta>();
const storageFileCache = new Map<string, string[]>(); // staffId -> list of file names in attendance bucket

/**
 * Normalize any time input (12h, 24h, ISO timestamp) into canonical 24-hour time "HH:MM:SS"
 */
export function normalize24HourTime(raw?: string | null): string | null {
  if (!raw || raw === '-') return null;
  const str = String(raw).trim();

  // If ISO date string e.g. "2026-11-04T09:30:15.511913+00:00"
  if (str.includes('T')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch (_) {}
  }

  // 12-hour format e.g. "09:30 AM", "4:41 PM", "12:05 pm"
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2];
    const secs = match12[3] || '00';
    const mod = match12[4].toLowerCase();
    if (mod === 'pm' && hours < 12) hours += 12;
    if (mod === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}:${secs}`;
  }

  // 24-hour format e.g. "09:30:00" or "09:30"
  const match24 = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = match24[2];
    const secs = match24[3] || '00';
    return `${String(hours).padStart(2, '0')}:${mins}:${secs}`;
  }

  return str;
}

/**
 * Format any time string into a clean, human-readable 12-hour string (e.g. "09:30 AM") for UI display only
 */
export function formatDisplayTime(raw?: string | null): string {
  if (!raw || raw === '-') return '-';
  const str = String(raw).trim();

  // If already in clean 12-hour format like "09:30 AM", uppercase and return
  if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(am|pm)$/i.test(str)) {
    return str.toUpperCase();
  }

  const t24 = normalize24HourTime(str);
  if (!t24) return str;

  const parts = t24.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const mins = parts[1].padStart(2, '0');
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
    }
  }

  return str;
}

/**
 * Backward compatibility alias for views calling formatISTTime
 */
export function formatISTTime(raw?: string | null): string {
  return formatDisplayTime(raw);
}

/**
 * Evaluate punch status based on shift timings and working hours:
 * - On time or within 15 mins grace period: PRESENT
 * - Late arrival (up to 2.5 hours after shift start or up to 2:00 PM): LATE
 * - Afternoon shifts (starts >= 12:00 PM): evaluated relative to afternoon shift start
 * - Afternoon clock-in for morning shift: evaluated as LATE/PRESENT; only marked HALF_DAY if worked 2.5h-5h
 * - Punch-in days are NEVER marked as LEAVE or ABSENT
 */
export function evaluatePunchStatus(
  punchInTime?: string | null,
  shiftStartTime?: string | null,
  punchOutTime?: string | null,
  shiftEndTime?: string | null,
  existingStatus?: string | null
): 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'ABSENT' {
  if (!punchInTime || punchInTime === '-' || punchInTime.trim() === '') {
    if (existingStatus && existingStatus.toUpperCase() === 'LEAVE') return 'LEAVE';
    return 'ABSENT';
  }

  const cleanExisting = existingStatus ? String(existingStatus).toUpperCase().trim() : '';

  const in24 = normalize24HourTime(punchInTime);
  if (!in24) return 'PRESENT';

  const [pH, pM] = in24.split(':').map(Number);
  if (isNaN(pH) || isNaN(pM)) return 'PRESENT';
  const punchMin = pH * 60 + pM;

  // Resolve shift start time (default 09:30 AM)
  const s24 = normalize24HourTime(shiftStartTime) || '09:30:00';
  const [sH, sM] = s24.split(':').map(Number);
  const shiftMin = !isNaN(sH) && !isNaN(sM) ? sH * 60 + sM : 570;

  // Resolve shift end time (default 18:00 / 06:00 PM)
  const e24 = normalize24HourTime(shiftEndTime) || '18:00:00';
  const [eH, eM] = e24.split(':').map(Number);
  const endMin = !isNaN(eH) && !isNaN(eM) ? eH * 60 + eM : 1080;
  const shiftDurationMin = Math.max(240, endMin - shiftMin);

  // Calculate actual worked minutes if punch-out is available
  let workedMinutes = 0;
  if (punchOutTime && punchOutTime !== '-' && punchOutTime.trim() !== '') {
    const out24 = normalize24HourTime(punchOutTime);
    if (out24) {
      const [oH, oM] = out24.split(':').map(Number);
      if (!isNaN(oH) && !isNaN(oM)) {
        let diff = (oH * 60 + oM) - punchMin;
        if (diff < 0) diff += 24 * 60; // Cross-midnight
        workedMinutes = diff;
      }
    }
  }

  // 1. If staff worked 5+ hours (or >= 60% of shift), they are FULLY PRESENT regardless of punch-in hour
  const fullDayThreshold = Math.min(300, Math.round(shiftDurationMin * 0.6));
  if (workedMinutes >= fullDayThreshold) {
    return 'PRESENT';
  }

  // 2. Afternoon/Evening Shift (Shift starts at or after 12:00 PM)
  if (shiftMin >= 720) {
    if (punchMin <= shiftMin + 15) return 'PRESENT';
    if (punchMin <= shiftMin + 120) return 'LATE';
    return 'PRESENT';
  }

  // 3. Morning Shift (Starts before 12:00 PM, e.g. 09:00 or 09:30 AM):
  // - On-time window with 15-minute grace period
  if (punchMin <= shiftMin + 15) {
    return 'PRESENT';
  }

  // - Late arrival window: up to 2.5 hours after shift start (e.g. up to 12:00 PM)
  if (punchMin <= shiftMin + 150) {
    return 'LATE';
  }

  // 4. Afternoon punches (clock-in after 12:00 PM):
  // - If clocked out and worked between 2.5h and 5h -> HALF_DAY
  if (workedMinutes >= 150 && workedMinutes < 300) {
    return 'HALF_DAY';
  }

  // - If clock-in is in early afternoon (between 12:00 PM and 02:00 PM), mark as LATE (employee attended)
  if (punchMin <= 840) {
    return 'LATE';
  }

  // - If existing record was already marked PRESENT in database/punch, preserve PRESENT
  if (cleanExisting === 'PRESENT') {
    return 'PRESENT';
  }

  return 'PRESENT';
}

/**
 * Calculate total working minutes between punch-in and punch-out as a safe number (never NaN)
 */
export function calculateWorkingMinutes(
  punchIn?: string | null,
  punchOut?: string | null
): number {
  if (!punchIn || punchIn === '-' || !punchOut || punchOut === '-') return 0;
  const in24 = normalize24HourTime(punchIn);
  const out24 = normalize24HourTime(punchOut);
  if (!in24 || !out24) return 0;

  const [inH, inM] = in24.split(':').map(Number);
  const [outH, outM] = out24.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;

  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60; // Cross-midnight
  return diff > 0 && !isNaN(diff) ? diff : 0;
}

/**
 * Calculate working hours between punch-in and punch-out or elapsed time in office
 * Guaranteed to never return 'NaN hrs' or malformed strings
 */
export function calculateWorkingHours(
  punchIn?: string | null,
  punchOut?: string | null,
  isToday: boolean = false
): string {
  if (!punchIn || punchIn === '-' || punchIn.trim() === '') return '-';
  const in24 = normalize24HourTime(punchIn);
  if (!in24) return '-';

  const [inH, inM, inS] = in24.split(':').map(Number);
  if (isNaN(inH) || isNaN(inM)) return '-';
  const inMs = (inH * 3600 + inM * 60 + (inS || 0)) * 1000;

  if (punchOut && punchOut !== '-' && punchOut.trim() !== '') {
    const out24 = normalize24HourTime(punchOut);
    if (!out24) return '-';
    const [outH, outM, outS] = out24.split(':').map(Number);
    if (isNaN(outH) || isNaN(outM)) return '-';
    let outMs = (outH * 3600 + outM * 60 + (outS || 0)) * 1000;
    let diffMs = outMs - inMs;
    if (diffMs < 0) diffMs += 24 * 3600 * 1000; // Cross-midnight
    if (diffMs <= 0 || isNaN(diffMs)) return '0.0 hrs';
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (isNaN(diffHrs) || !isFinite(diffHrs)) return '0.0 hrs';
    const hours = Math.floor(diffHrs);
    const mins = Math.round((diffHrs - hours) * 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
  }

  if (isToday) {
    const now = new Date();
    const nowMs = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
    let diffMs = nowMs - inMs;
    if (diffMs < 0) diffMs += 24 * 3600 * 1000;
    if (diffMs > 0 && !isNaN(diffMs)) {
      const diffHrs = diffMs / (1000 * 60 * 60);
      if (!isNaN(diffHrs) && isFinite(diffHrs)) {
        const hours = Math.floor(diffHrs);
        const mins = Math.round((diffHrs - hours) * 60);
        return `${hours}h ${mins}m (In Office)`;
      }
    }
    return '0.0 hrs (In Office)';
  }

  return '-';
}

/**
 * Save punch metadata to localStorage, in-memory cache, and Supabase Storage across target ID and linked alias IDs
 */
export async function savePunchMetaToStorage(
  staffId: string,
  dateStr: string,
  data: Partial<PunchMeta>,
  linkedIds: string[] = []
): Promise<void> {
  if (!staffId || !dateStr) return;

  const allIds = Array.from(new Set([staffId, ...linkedIds].filter(Boolean)));

  const normalizedData: Partial<PunchMeta> = {
    ...data,
    punch_in: data.punch_in ? (normalize24HourTime(data.punch_in) || data.punch_in) : data.punch_in,
    punch_out: data.punch_out ? (normalize24HourTime(data.punch_out) || data.punch_out) : data.punch_out,
    status: data.status ? String(data.status).toUpperCase() : undefined
  };

  for (const id of allIds) {
    const key = `${id}_${dateStr}`;
    const existing = getStoredPunchLocal(id, dateStr) || {};
    const merged: PunchMeta = {
      staff_id: id,
      attendance_date: dateStr,
      ...existing,
      ...normalizedData
    };

    // If punch_out was explicitly passed as null/undefined (e.g. on Punch In), ensure it is wiped clean
    if ('punch_out' in data && (data.punch_out === null || data.punch_out === undefined || data.punch_out === '')) {
      delete merged.punch_out;
      delete merged.working_hours;
    }

    if (merged.punch_in && merged.punch_out && !merged.working_hours) {
      merged.working_hours = calculateWorkingHours(merged.punch_in, merged.punch_out);
    }

    // 1. Update in-memory cache
    memoryPunchCache.set(key, merged);

    // 2. Update localStorage
    try {
      localStorage.setItem(`staff_punch_${id}_${dateStr}`, JSON.stringify(merged));
    } catch (_) {}

    // 3. Save to Supabase Storage via admin proxy (with direct fallback)
    const fileName = `${id}/${dateStr}.json`;
    const jsonBlob = new Blob([JSON.stringify(merged)], { type: 'application/json' });

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
 * Backward compatibility alias for savePunchMetaToStorage
 */
export const saveStoredPunch = savePunchMetaToStorage;

/**
 * Read punch from localStorage or memory cache, checking primary ID and any alias IDs
 */
export function getStoredPunchLocal(
  staffId: string,
  dateStr: string,
  linkedIds: string[] = []
): PunchMeta | null {
  const idsToCheck = Array.from(new Set([staffId, ...linkedIds].filter(Boolean)));

  for (const id of idsToCheck) {
    const key = `${id}_${dateStr}`;
    if (memoryPunchCache.has(key)) {
      return memoryPunchCache.get(key)!;
    }

    try {
      const raw = localStorage.getItem(`staff_punch_${id}_${dateStr}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.punch_in) {
          parsed.punch_in = normalize24HourTime(parsed.punch_in) || parsed.punch_in;
        }
        if (parsed.punch_out) {
          parsed.punch_out = normalize24HourTime(parsed.punch_out) || parsed.punch_out;
        }
        memoryPunchCache.set(key, parsed);
        return parsed;
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Backward compatibility alias for getStoredPunchLocal
 */
export const getStoredPunch = getStoredPunchLocal;

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
    const fileName = `${id}/${dateStr}.json`;
    let meta: any = null;

    try {
      const { data: { publicUrl } } = supabase.storage.from('attendance').getPublicUrl(fileName);
      if (publicUrl) {
        const res = await fetch(publicUrl, { cache: 'no-cache' });
        if (res.ok) {
          meta = await res.json();
        }
      }
    } catch (_) {}

    if (!meta) {
      try {
        let proxyRes = await fetch(`/supabase-admin/storage/v1/object/public/attendance/${fileName}`, { cache: 'no-cache' });
        if (!proxyRes.ok) {
          proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${fileName}`, { cache: 'no-cache' });
        }
        if (proxyRes.ok) {
          meta = await proxyRes.json();
        }
      } catch (_) {}
    }

    if (meta) {
      const local = getStoredPunchLocal(id, dateStr);
      const combined: PunchMeta = {
        ...(local || {}),
        ...meta,
        punch_in: normalize24HourTime(meta.punch_in || local?.punch_in) || meta.punch_in,
        punch_out: normalize24HourTime(meta.punch_out || local?.punch_out) || meta.punch_out,
        status: (meta.status || local?.status || 'PRESENT').toUpperCase()
      };

      memoryPunchCache.set(key, combined);
      try {
        localStorage.setItem(`staff_punch_${id}_${dateStr}`, JSON.stringify(combined));
      } catch (_) {}

      return combined;
    }
  }

  // 3. Fallback: discover selfie from storage if JSON is not present
  for (const id of idsToCheck) {
    const discoveredSelfie = await findStorageSelfieForDate(id, dateStr);
    if (discoveredSelfie) {
      const local = getStoredPunchLocal(id, dateStr);
      const fallbackMeta: PunchMeta = {
        staff_id: id,
        attendance_date: dateStr,
        selfie_url: discoveredSelfie,
        status: local?.status || 'PRESENT',
        punch_in: local?.punch_in || null,
        punch_out: local?.punch_out || null
      };
      return fallbackMeta;
    }
  }

  return getStoredPunchLocal(staffId, dateStr);
}

/**
 * Safely fetch staff attendance records across both dev server and production (Vercel),
 * bypassing Postgres RLS restrictions via the secure admin proxy.
 */
export async function fetchStaffAttendanceRecords(options: {
  staffIds?: string[];
  startDate?: string;
  endDate?: string;
} = {}): Promise<any[]> {
  const { staffIds, startDate, endDate } = options;
  const params: string[] = ['select=*', 'order=created_at.asc'];

  if (staffIds && staffIds.length > 0) {
    const validIds = staffIds.filter(Boolean);
    if (validIds.length === 1) {
      params.push(`staff_id=eq.${validIds[0]}`);
    } else if (validIds.length > 1) {
      params.push(`staff_id=in.(${validIds.join(',')})`);
    }
  }

  if (startDate) {
    params.push(`attendance_date=gte.${startDate}`);
  }
  if (endDate) {
    params.push(`attendance_date=lte.${endDate}`);
  }

  const queryString = params.join('&');

  // 1. Try secure admin proxy (works on localhost:5180 and on Vercel deployment, bypassing RLS)
  try {
    const proxyRes = await fetch(`/supabase-admin/rest/v1/staff_attendance?${queryString}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (proxyErr) {
    console.warn('Admin proxy attendance fetch notice:', proxyErr);
  }

  // 2. Direct Supabase client fallback
  try {
    let query = supabase.from('staff_attendance').select('*');
    if (staffIds && staffIds.length > 0) {
      query = query.in('staff_id', staffIds);
    }
    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }
    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }
    query = query.order('created_at', { ascending: true });

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (clientErr) {
    console.warn('Direct client attendance fetch notice:', clientErr);
  }

  return [];
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
    dayRecords.forEach(r => {
      if (r.staff_id && !linkedIds.includes(r.staff_id)) {
        linkedIds.push(r.staff_id);
      }
    });

    const meta = await getPunchMeta(staffId, dateStr, linkedIds);

    // Punch IN: earliest record timestamp or metadata in 24-hr format "HH:MM:SS"
    let in24: string | null = null;
    if (meta?.punch_in) {
      in24 = normalize24HourTime(meta.punch_in);
    } else if (primaryRec.punch_in) {
      in24 = normalize24HourTime(primaryRec.punch_in);
    } else if (primaryRec.created_at) {
      in24 = normalize24HourTime(primaryRec.created_at);
    }

    // Punch OUT: ONLY when explicitly recorded via user's Punch Out button action.
    // NEVER synthesize or guess punch_out from duplicate staff_attendance rows.
    let out24: string | null = null;
    if (meta?.punch_out && meta.punch_out !== '-') {
      out24 = normalize24HourTime(meta.punch_out);
    } else if (primaryRec.punch_out && primaryRec.punch_out !== '-') {
      out24 = normalize24HourTime(primaryRec.punch_out);
    }

    const isToday = dateStr === todayStr;
    const hoursWorked = calculateWorkingHours(in24, out24, isToday);

    // Resolved Status: evaluate status accurately based on shift timings and punch times
    const existingStatus = meta?.status || primaryRec.status;
    const resolvedStatus = evaluatePunchStatus(
      in24,
      primaryRec.shift_start_time || '09:30:00',
      out24,
      primaryRec.shift_end_time || '18:00:00',
      existingStatus
    );

    enrichedResults.push({
      ...primaryRec,
      punch_in: in24 || '-',
      punch_out: out24 || '-',
      working_hours: hoursWorked,
      selfie_url: meta?.selfie_url || primaryRec.selfie_url || null,
      lat: meta?.lat ?? primaryRec.lat ?? null,
      lng: meta?.lng ?? primaryRec.lng ?? null,
      status: resolvedStatus
    });
  }

  return enrichedResults;
}
