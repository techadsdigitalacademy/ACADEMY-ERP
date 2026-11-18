import { supabase } from '../services/supabase';
import {
  evaluateAttendanceStatus,
  calculateWorkingHours as calcWorkingHours,
  normalizeTo24HourTime as norm24,
  formatDisplayTime as fmtDisplayTime,
  timeToSeconds,
  timeToMinutes,
  isMissedPunchOut,
  getDisplayPunchOut,
  getEffectiveAttendanceStatus,
  type AttendanceStatus
} from './attendanceRules';

export {
  evaluateAttendanceStatus,
  timeToSeconds,
  timeToMinutes,
  isMissedPunchOut,
  getDisplayPunchOut,
  getEffectiveAttendanceStatus,
  type AttendanceStatus
};

export interface PunchMeta {
  id?: string;
  staff_id: string;
  attendance_date: string;
  punch_in?: string | null;  // Stored in 24-hour format "HH:MM:SS" (e.g. "09:30:15") or 12-hour "09:30 AM"
  punch_out?: string | null; // Stored in 24-hour format "HH:MM:SS" (e.g. "18:30:00") or 12-hour "06:30 PM"
  selfie_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;    // Stored in uppercase: "PRESENT" | "LATE" | "HALF_DAY" | "LEAVE" | "MEDICAL_LEAVE"
  working_hours?: string | null;
}

const memoryPunchCache = new Map<string, PunchMeta>();
const storageFileCache = new Map<string, string[]>(); // staffId -> list of file names in attendance bucket

/**
 * Normalizes any time representation into canonical 24-hr 'HH:MM:SS'.
 */
export function normalize24HourTime(raw?: string | null): string | null {
  if (!raw || raw === '-') return null;
  const normalized = norm24(raw);
  return normalized || null;
}

/**
 * Formats any time string into a clean 12-hour format e.g. "09:32 AM", "06:30 PM".
 */
export function formatDisplayTime(raw?: string | null): string {
  if (!raw || raw === '-') return '-';
  return fmtDisplayTime(raw);
}

/**
 * Backward compatibility alias for formatDisplayTime
 */
export function formatISTTime(raw?: string | null): string {
  return formatDisplayTime(raw);
}

/**
 * Evaluates punch status according to strict standardized ERP rules:
 * - On time (<= 09:32:00 AM) and shift completed (>= 03:30:00 PM or in office) -> PRESENT
 * - Late arrival (> 09:32:00 AM and <= 11:30:00 AM) and shift completed -> LATE
 * - Late arrival (> 11:30:00 AM) OR Early departure (< 03:30:00 PM) -> HALF_DAY
 */
export function evaluatePunchStatus(
  punchInTime?: string | null,
  _shiftStartTime?: string | null,
  punchOutTime?: string | null,
  _shiftEndTime?: string | null,
  existingStatus?: string | null
): 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'ABSENT' {
  const evaluated = evaluateAttendanceStatus(punchInTime, punchOutTime, existingStatus);
  if (evaluated === 'MISSED PUNCH OUT') return 'LEAVE';
  if (evaluated === 'HOLIDAY') return 'LEAVE';
  if (evaluated === 'MEDICAL_LEAVE') return 'PRESENT';
  return evaluated as 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'ABSENT';
}

/**
 * Calculates working minutes between punch-in and punch-out as a number.
 */
export function calculateWorkingMinutes(
  punchIn?: string | null,
  punchOut?: string | null
): number {
  if (!punchIn || punchIn === '-' || !punchOut || punchOut === '-' || punchOut === 'Missed Punch Out') return 0;
  const inNorm = norm24(punchIn);
  const outNorm = norm24(punchOut);
  if (!inNorm || !outNorm) return 0;

  const inSecs = timeToSeconds(inNorm);
  const outSecs = timeToSeconds(outNorm);
  const diffSecs = outSecs - inSecs;
  return diffSecs > 0 ? Math.floor(diffSecs / 60) : 0;
}

/**
 * Calculates working hours cleanly e.g. "7.5 hrs" or "(In Office)" or "-" without NaN errors.
 */
export function calculateWorkingHours(
  punchIn?: string | null,
  punchOut?: string | null,
  isToday: boolean = false
): string {
  return calcWorkingHours(punchIn, punchOut, !isToday);
}

/**
 * Save punch metadata to localStorage, in-memory cache, and Supabase Storage across target ID and linked alias IDs.
 * Ensures existing fields (such as punch_in and selfie_url) are NEVER lost when punching out.
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
    punch_in: data.punch_in ? (norm24(data.punch_in) || data.punch_in) : data.punch_in,
    punch_out: data.punch_out ? (norm24(data.punch_out) || data.punch_out) : data.punch_out,
    status: data.status ? String(data.status).toUpperCase() : undefined
  };

  for (const id of allIds) {
    const key = `${id}_${dateStr}`;
    
    // Load existing metadata from local cache or remote storage to prevent wiping punch_in / selfie_url
    let existing = getStoredPunchLocal(id, dateStr);
    if (!existing || !existing.punch_in) {
      existing = await getPunchMeta(id, dateStr, linkedIds);
    }

    const merged: PunchMeta = {
      staff_id: id,
      attendance_date: dateStr,
      ...(existing || {}),
      ...normalizedData
    };

    // If punch_out was explicitly passed as null/undefined (e.g. on Punch In), ensure it is wiped clean
    if ('punch_out' in data && (data.punch_out === null || data.punch_out === undefined || data.punch_out === '')) {
      delete merged.punch_out;
      delete merged.working_hours;
    }

    if (merged.punch_in && merged.punch_out && !merged.working_hours) {
      merged.working_hours = calculateWorkingHours(merged.punch_in, merged.punch_out, false);
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
          parsed.punch_in = norm24(parsed.punch_in) || parsed.punch_in;
        }
        if (parsed.punch_out) {
          parsed.punch_out = norm24(parsed.punch_out) || parsed.punch_out;
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
        punch_in: norm24(meta.punch_in || local?.punch_in) || meta.punch_in,
        punch_out: norm24(meta.punch_out || local?.punch_out) || meta.punch_out,
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
 * Reconciles multi-punch rows on the same date into a single unified record per day per employee.
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
    dayRecords.sort((a, b) => {
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tA - tB;
    });

    const primaryRec = dayRecords[0];
    const staffId = primaryRec.staff_id;
    const dateStr = primaryRec.attendance_date ? String(primaryRec.attendance_date).substring(0, 10) : '';

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
      in24 = norm24(meta.punch_in);
    } else if (primaryRec.punch_in) {
      in24 = norm24(primaryRec.punch_in);
    } else if (primaryRec.created_at) {
      in24 = norm24(primaryRec.created_at);
    }

    // Punch OUT: ONLY when explicitly recorded via user's Punch Out button action.
    let out24: string | null = null;
    if (meta?.punch_out && meta.punch_out !== '-' && meta.punch_out !== 'Missed Punch Out') {
      out24 = norm24(meta.punch_out);
    } else if (primaryRec.punch_out && primaryRec.punch_out !== '-' && primaryRec.punch_out !== 'Missed Punch Out') {
      out24 = norm24(primaryRec.punch_out);
    }

    const isToday = dateStr === todayStr;
    const hoursWorked = calcWorkingHours(in24, out24, !isToday);

    const existingStatus = meta?.status || primaryRec.status;
    const resolvedStatus = evaluateAttendanceStatus(in24, out24, existingStatus);

    enrichedResults.push({
      ...primaryRec,
      punch_in: in24 || '-',
      punch_out: out24 || undefined,
      working_hours: hoursWorked,
      selfie_url: meta?.selfie_url || primaryRec.selfie_url || null,
      lat: meta?.lat ?? primaryRec.lat ?? null,
      lng: meta?.lng ?? primaryRec.lng ?? null,
      status: resolvedStatus
    });
  }

  return enrichedResults;
}
