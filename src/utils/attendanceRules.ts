/**
 * Standard Attendance Evaluation Engine & Thresholds for Tech Ads ERP
 * 
 * Strict Evaluation Rules:
 * 1. Half-Day Early Departure Precedence (03:30 PM):
 *    - Punch-Out before 03:30:00 PM (< 15:30:00 PM, < 55800 secs) takes strict precedence and is marked as HALF_DAY,
 *      regardless of whether morning punch-in was on-time or late.
 * 
 * 2. Strict Late Threshold (09:32 AM):
 *    - Punch-In at or before 09:32:00 AM (<= 09:32:00 AM, 34320 secs) is evaluated as PRESENT (subject to full day completion >= 03:30 PM).
 *    - Any punch-in strictly after 09:32:00 AM (> 34320 secs) and <= 11:30:00 AM with shift completed (punch out >= 03:30 PM or in office)
 *      must be marked and displayed as LATE.
 * 
 * 3. Half-Day Late Arrival Threshold (11:30 AM):
 *    - Punch-In after 11:30:00 AM (> 11:30:00 AM, > 41400 secs) is marked as HALF_DAY.
 * 
 * 4. Full Day Present:
 *    - Punch-In on time (<= 09:32:00 AM) and punch-out after 03:30:00 PM (>= 15:30:00 PM), or actively working
 *      in office before shift end cutoff, is marked as fully PRESENT.
 * 
 * 4. Missed Punch-Out Logic:
 *    - Female staff shift ends around 05:00 PM (17:00:00).
 *    - Male staff shift ends around 05:30 PM (17:30:00) / 06:30 PM (18:30:00).
 *    - If no punch-out is recorded past the grace cutoff (e.g., 07:00 PM / 19:00:00 for males, 06:00-07:00 PM for females),
 *      the clock-out column and status display must explicitly show "Missed Punch Out" instead of a blank dash (-).
 */

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'ABSENT' | 'HOLIDAY' | 'MISSED PUNCH OUT' | 'MEDICAL_LEAVE';

/**
 * Normalizes any time representation (12-hour AM/PM, 24-hour, ISO) into canonical 24-hr 'HH:MM:SS'.
 */
export function normalizeTo24HourTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();

  // Match 12-hour AM/PM strings like "09:30 AM", "09:32:00 AM", "09:39:37 AM", "3:30 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
    const modifier = ampmMatch[4].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  }

  // Match 24-hour strings like "09:32", "09:32:00", "09:39:37", "15:30:00.123"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:[+-]\d{2}(?::?\d{2})?)?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    const seconds = match24[3] ? parseInt(match24[3], 10) : 0;
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
  }

  // Handle ISO or date-time strings
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.includes(':'))) {
    try {
      const d = new Date(trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T'));
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      }
    } catch { }
  }

  return trimmed;
}

/**
 * Converts a 24-hr or 12-hr time string to total seconds since midnight (0 to 86399)
 * for exact second-level threshold comparisons.
 */
export function timeToSeconds(timeStr: string | null | undefined): number {
  const norm = normalizeTo24HourTime(timeStr);
  if (!norm) return 0;
  const parts = norm.split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
}

/**
 * Converts a 24-hr or 12-hr time string to total minutes since midnight (0 to 1439).
 */
export function timeToMinutes(timeStr: string | null | undefined): number {
  return Math.floor(timeToSeconds(timeStr) / 60);
}

/**
 * Converts 24-hr time to human-friendly 12-hour format e.g. "09:32 AM", "03:30 PM".
 */
export function formatDisplayTime(timeStr: string | null | undefined): string {
  if (!timeStr || timeStr === '-' || timeStr === 'Missed Punch Out') return timeStr || '-';
  const norm = normalizeTo24HourTime(timeStr);
  if (!norm) return timeStr;
  const parts = norm.split(':').map(Number);
  const hours24 = parts[0] || 0;
  const minutes = parts[1] || 0;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Calculates working hours cleanly e.g. "7.5 hrs" or "-" without NaN errors.
 */
export function calculateWorkingHours(
  punchIn: string | null | undefined,
  punchOut: string | null | undefined,
  isCompleted: boolean = false
): string {
  if (!punchIn || punchIn === '-') return '-';
  if (!punchOut || punchOut === '-' || punchOut === 'Missed Punch Out') {
    return isCompleted ? '-' : '(In Office)';
  }

  const normIn = normalizeTo24HourTime(punchIn);
  const normOut = normalizeTo24HourTime(punchOut);
  if (!normIn || !normOut) return '-';

  const inSecs = timeToSeconds(normIn);
  const outSecs = timeToSeconds(normOut);
  const diffSecs = outSecs - inSecs;

  if (diffSecs < 0) return '0.0 hrs';
  const diffHrs = diffSecs / 3600;
  return `${diffHrs.toFixed(1)} hrs`;
}

/**
 * Checks whether an attendance record represents a "Missed Punch Out":
 * - Staff clocked in (punchIn exists).
 * - Staff did NOT clock out.
 * - If past date: day is over -> true.
 * - If today's date:
 *   - Female staff: shift ends ~05:00 PM, cutoff ~06:00-07:00 PM.
 *   - Male staff: shift ends ~05:30/06:30 PM, cutoff ~07:00 PM.
 *   - Past 07:00 PM (or past female cutoff) -> true.
 */
export function isMissedPunchOut(
  attendanceDate: string | null | undefined,
  punchIn: string | null | undefined,
  punchOut: string | null | undefined,
  gender?: string | null,
  shiftEndTime?: string | null
): boolean {
  if (!punchIn || punchIn === '-') return false;
  if (punchOut && punchOut !== '-' && punchOut !== 'Missed Punch Out') return false;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const attDate = String(attendanceDate || '').substring(0, 10);

  // Past dates: day is over -> definitely Missed Punch Out
  if (attDate && attDate < todayStr) {
    return true;
  }

  // Today's date: check against current IST time
  if (attDate === todayStr || !attDate) {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const currentSecs = timeToSeconds(istTimeStr);

    const isFemale = String(gender || '').toLowerCase() === 'female';

    // Standard grace cutoff: 07:00:00 PM (19:00:00 = 68400 secs)
    let graceCutoffSecs = 19 * 3600;

    if (shiftEndTime) {
      const parsedEnd = timeToSeconds(shiftEndTime);
      if (parsedEnd > 0) {
        // Shift end + 60 mins grace buffer
        graceCutoffSecs = isFemale
          ? Math.min(Math.max(parsedEnd + 3600, 18 * 3600), 19 * 3600)
          : Math.max(parsedEnd + 3600, 19 * 3600);
      }
    } else if (isFemale) {
      graceCutoffSecs = 18 * 3600; // 06:00:00 PM for female staff without custom shift
    }

    if (currentSecs >= graceCutoffSecs) {
      return true;
    }
  }

  return false;
}

/**
 * Returns formatted punch-out display string:
 * - If punchOut exists: formatted time e.g. "06:30 PM".
 * - If missed punch-out: "Missed Punch Out".
 * - If actively working in office: "(In Office)" or "-".
 * - Otherwise: "-".
 */
export function getDisplayPunchOut(
  punchOut: string | null | undefined,
  punchIn: string | null | undefined,
  attendanceDate?: string | null,
  gender?: string | null,
  shiftEndTime?: string | null
): string {
  if (punchOut && punchOut !== '-' && punchOut !== 'Missed Punch Out') {
    return formatDisplayTime(punchOut);
  }
  if (isMissedPunchOut(attendanceDate, punchIn, punchOut, gender, shiftEndTime)) {
    return 'Missed Punch Out';
  }
  if (punchIn && punchIn !== '-') {
    return '(In Office)';
  }
  return '-';
}

/**
 * Evaluates punch-in status for Online Tutors operating on dual-slot or flexible evening/night schedules:
 * - Slot 1: Evening Online Batch (07:30 PM - 09:00 PM) [19:30 - 21:00]
 *   On-time cutoff: 19:35 (5-minute grace period). Punches on or before 19:35 are evaluated as PRESENT.
 *   After 19:35 up to 21:00 evaluated as LATE.
 * - Slot 2: Night Online Batch (09:30 PM - 11:00 PM) [21:30 - 23:00]
 *   On-time cutoff: 21:35 (5-minute grace period). Punches on or before 21:35 are evaluated as PRESENT.
 *   After 21:35 up to 23:00 evaluated as LATE.
 * - Custom Slot / Batch Timing: dynamically evaluates based on the scheduled batch start time with 5-minute grace period.
 * - Early arrival (e.g. preparation before start or daytime test punches) is evaluated as PRESENT.
 */
export function evaluateOnlineTutorStatus(
  punchIn: string | null | undefined,
  slot: 'slot_1' | 'slot_2' | 'custom' | string = 'slot_1',
  customStartTime?: string | null
): AttendanceStatus {
  if (!punchIn) return 'ABSENT';
  const normIn = normalizeTo24HourTime(punchIn);
  if (!normIn) return 'PRESENT';

  const inSecs = timeToSeconds(normIn);

  // If a custom or batch schedule start time is provided (e.g., '19:00', '20:00', '21:30')
  if (customStartTime) {
    const normStart = normalizeTo24HourTime(customStartTime);
    const startSecs = timeToSeconds(normStart);
    if (startSecs > 0) {
      const graceSecs = startSecs + 5 * 60; // 5-minute grace period
      const endSecs = startSecs + 90 * 60;  // 1.5-hour standard session window
      if (inSecs <= graceSecs) {
        return 'PRESENT';
      } else if (inSecs <= endSecs) {
        return 'LATE';
      } else {
        return 'HALF_DAY';
      }
    }
  }

  if (slot === 'slot_1') {
    // Slot 1: 19:30:00 (70200s), grace 19:35:00 (70500s), end 21:00:00 (75600s)
    if (inSecs <= 70500) {
      return 'PRESENT';
    } else if (inSecs <= 75600) {
      return 'LATE';
    } else {
      return 'HALF_DAY';
    }
  } else if (slot === 'slot_2') {
    // Slot 2: 21:30:00 (77400s), grace 21:35:00 (77700s), end 23:00:00 (82800s)
    if (inSecs <= 77700) {
      return 'PRESENT';
    } else if (inSecs <= 82800) {
      return 'LATE';
    } else {
      return 'HALF_DAY';
    }
  } else {
    // Flexible evening cutoff fallback
    if (inSecs <= 70500) {
      return 'PRESENT';
    } else if (inSecs <= 82800) {
      return 'LATE';
    }
    return 'PRESENT';
  }
}

/**
 * Core attendance evaluator according to the strictly enforced uniform rules:
 * - Half Day: Early departure before 03:30:00 PM (15:30:00 = 55800 secs) TAKES STRICT PRECEDENCE
 *   over LATE, regardless of whether arrival was on-time or late.
 *   Also, arrival after 11:30:00 AM (> 41400 secs) is HALF_DAY.
 * - Late: punch in strictly after 09:32:00 AM (> 34320 secs) and up to 11:30:00 AM,
 *   provided full day was completed (punch out >= 03:30:00 PM or in office).
 * - Present: punch in <= 09:32:00 AM and (in office OR punch out >= 15:30:00 PM).
 * - Online Tutor Support: Evening/night batches are evaluated by batch slots rather than daytime rules.
 */
export function evaluateAttendanceStatus(
  punchIn: string | null | undefined,
  punchOut: string | null | undefined,
  existingStatus?: string | null,
  isOnlineTutor?: boolean,
  slot?: 'slot_1' | 'slot_2'
): AttendanceStatus {
  // Retain manual holiday or leave assignments if no punch exists
  if (!punchIn && (existingStatus === 'LEAVE' || existingStatus === 'HOLIDAY' || existingStatus === 'ABSENT' || existingStatus === 'MEDICAL_LEAVE')) {
    return existingStatus as AttendanceStatus;
  }

  const normIn = normalizeTo24HourTime(punchIn);
  if (!normIn) {
    return (existingStatus === 'ABSENT' ? 'ABSENT' : 'LEAVE') as AttendanceStatus;
  }

  const inSecs = timeToSeconds(normIn);

  // If designated online tutor, or an evening punch with existing present/late status, evaluate with evening slot rules
  if (isOnlineTutor || ((existingStatus === 'PRESENT' || existingStatus === 'LATE') && inSecs >= 18 * 3600)) {
    const effectiveSlot = slot || (inSecs >= 21 * 3600 ? 'slot_2' : 'slot_1');
    return evaluateOnlineTutorStatus(normIn, effectiveSlot);
  }

  // Strict on-time limit: 09:32:00 AM (9 * 3600 + 32 * 60 = 34320 secs).
  // Any punch-in strictly after 09:32:00 AM (> 34320 secs) is strictly LATE (unless departing early -> HALF_DAY).
  const onTimeLimit = 9 * 3600 + 32 * 60; // 34320 secs (09:32:00 AM)

  // Half-day late threshold: 11:30:00 AM (11 * 3600 + 30 * 60 = 41400 secs).
  const lateLimit = 11 * 3600 + 30 * 60; // 41400 secs (11:30:00 AM)

  // Full-day punch-out threshold: 03:30:00 PM (15 * 3600 + 30 * 60 = 55800 secs).
  const minFullDayOutSecs = 15 * 3600 + 30 * 60; // 55800 secs (03:30:00 PM)

  // Rule 1: Early Departure before 03:30:00 PM (15:30:00) -> STRICT PRECEDENCE -> HALF_DAY
  // If employee leaves before 03:30 PM, this takes stricter precedence over LATE or PRESENT,
  // regardless of whether their morning arrival was on-time or late (e.g. 09:38:06 in, 13:17:56 out).
  const normOut = normalizeTo24HourTime(punchOut);
  if (normOut && normOut !== 'Missed Punch Out') {
    const outSecs = timeToSeconds(normOut);
    if (outSecs > 0 && outSecs < minFullDayOutSecs) {
      return 'HALF_DAY';
    }
  }

  // Rule 2: Extremely late arrival (punch in after 11:30:00 AM) -> HALF_DAY
  if (inSecs > lateLimit) {
    return 'HALF_DAY';
  }

  // Rule 3: Punch in strictly after 09:32:00 AM (e.g. 09:32:01 AM or 09:39:37 AM) up to 11:30:00 AM
  // and completed full day shift (punch out >= 03:30:00 PM or currently in office) -> LATE
  if (inSecs > onTimeLimit) {
    return 'LATE';
  }

  // Rule 4: Punched in on time (<= 09:32:00 AM) and punch out >= 03:30:00 PM (or actively working) -> PRESENT
  return 'PRESENT';
}

/**
 * Extracts the effective status from an attendance record object, incorporating
 * Missed Punch Out logic when applicable.
 */
export function getEffectiveAttendanceStatus(
  record?: {
    attendance_date?: string | null;
    punch_in?: string | null;
    punch_out?: string | null;
    status?: string | null;
  } | null,
  gender?: string | null,
  shiftEndTime?: string | null
): AttendanceStatus {
  if (!record) return 'ABSENT';

  // Check if staff missed punch-out
  if (isMissedPunchOut(record.attendance_date, record.punch_in, record.punch_out, gender, shiftEndTime)) {
    return 'MISSED PUNCH OUT';
  }

  return evaluateAttendanceStatus(record.punch_in, record.punch_out, record.status);
}
