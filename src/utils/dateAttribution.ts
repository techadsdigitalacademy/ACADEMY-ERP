/**
 * Date Attribution & Historical Mapping Engine
 * Ensures consistent, immutable Month & Year grouping for fee collections,
 * student admissions, and financial reports regardless of entry timestamp.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

/**
 * Parses any month string, date string, or human label into canonical 'YYYY-MM' format.
 * Examples:
 *   "September 2025" -> "2025-09"
 *   "Sep 2025"       -> "2025-09"
 *   "2025-09"        -> "2025-09"
 *   "2025-09-18"     -> "2025-09"
 *   "September" (context year 2025) -> "2025-09"
 */
export function parseMonthYear(input: string | null | undefined, fallbackYear?: number): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // 1. Check direct ISO YYYY-MM or YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(Number(isoMatch[2])).padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12) {
      return `${y}-${m}`;
    }
  }

  // 2. Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = raw.match(/\b\d{1,2}[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmyMatch) {
    const m = String(Number(dmyMatch[1])).padStart(2, '0');
    const y = dmyMatch[2];
    if (Number(m) >= 1 && Number(m) <= 12) {
      return `${y}-${m}`;
    }
  }

  // 3. Check Month Name + Year (e.g. "September 2025", "Sep 2025", "2025 September")
  const lower = raw.toLowerCase();
  let foundMonthIdx = -1;

  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i]) || lower.includes(MONTH_SHORT[i])) {
      foundMonthIdx = i + 1;
      break;
    }
  }

  const yearMatch = raw.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : (fallbackYear || null);

  if (foundMonthIdx > 0 && year) {
    return `${year}-${String(foundMonthIdx).padStart(2, '0')}`;
  }

  // 4. Try native Date parse
  const parsedDate = new Date(raw);
  if (!isNaN(parsedDate.getTime())) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    if (y >= 2000 && y <= 2100) {
      return `${y}-${m}`;
    }
  }

  return null;
}

/**
 * Resolves the canonical YYYY-MM month key for a fee collection / installment.
 * Priority order:
 * 1. installment_month (if it contains an explicit month & year e.g. "September 2025" or "2025-09")
 *    This represents the user's explicit accounting attribution period when backfilling.
 * 2. payment_date (if provided directly on record)
 * 3. created_at (actual timestamp stored on record)
 */
export function getCollectionMonthKey(fee: any, fallbackYear?: number): string {
  if (!fee) return new Date().toISOString().slice(0, 7);

  // 1. Installment month string with explicit month and year (e.g. "September 2025" or "2025-09")
  if (fee.installment_month) {
    const parsed = parseMonthYear(fee.installment_month, fallbackYear);
    if (parsed) return parsed;
  }

  // 2. Direct payment date
  if (fee.payment_date) {
    const parsed = parseMonthYear(fee.payment_date, fallbackYear);
    if (parsed) return parsed;
  }

  // 3. Stored created_at timestamp
  if (fee.created_at) {
    const parsed = parseMonthYear(fee.created_at, fallbackYear);
    if (parsed) return parsed;
  }

  return new Date().toISOString().slice(0, 7);
}

/**
 * Resolves the canonical YYYY-MM admission month key for a student.
 * Priority order:
 * 1. If student has associated fee collections or installments, check the earliest fee collection month.
 *    (A student's admission date cannot be in the future compared to when they already paid their initial admission fee).
 * 2. Explicit admission_date / enrollment_date (e.g. "2025-09-18", "2025-11-24")
 * 3. Batch start_date (if enrollment_date is missing or in the distant future compared to batch start)
 * 4. Stored created_at timestamp
 */
export function getStudentAdmissionMonthKey(student: any, associatedFees?: any[], batch?: any): string {
  if (!student) return new Date().toISOString().slice(0, 7);

  const rawDate = student.admission_date || student.enrollment_date;
  const parsedEnroll = rawDate ? parseMonthYear(rawDate) : null;

  // Check if student has fee collections from an earlier date than enrollment_date
  if (associatedFees && Array.isArray(associatedFees)) {
    const sFees = associatedFees.filter(f => f && String(f.student_id) === String(student.id));
    if (sFees.length > 0) {
      const feeMonths = sFees.map(f => getCollectionMonthKey(f)).filter(Boolean).sort();
      if (feeMonths.length > 0) {
        const earliestFeeMonth = feeMonths[0];
        // If enrollment date is missing, or is in the future compared to when fee was paid (e.g. defaulted to entry date),
        // the fee payment period is the true historical admission period!
        if (!parsedEnroll || parsedEnroll > earliestFeeMonth) {
          return earliestFeeMonth;
        }
      }
    }
  }

  if (parsedEnroll) return parsedEnroll;

  // Check batch start date if available
  if (batch && batch.start_date) {
    const bMonth = parseMonthYear(batch.start_date);
    if (bMonth) return bMonth;
  }

  // Stored created_at timestamp
  if (student.created_at) {
    const parsed = parseMonthYear(student.created_at);
    if (parsed) return parsed;
  }

  return new Date().toISOString().slice(0, 7);
}

/**
 * Formats a canonical 'YYYY-MM' key into human-friendly "Month YYYY"
 * e.g. "2025-09" -> "September 2025"
 */
export function formatMonthLabel(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes('-')) return yearMonth || '';
  const [yStr, mStr] = yearMonth.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return yearMonth;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Checks if a student already has fee collection records in the ledger,
 * preventing duplicate counting of their initial admission deposit.
 */
export function hasStudentFeeInRegistry(studentId: string, allFeeCollections: any[]): boolean {
  if (!studentId || !allFeeCollections || allFeeCollections.length === 0) return false;
  return allFeeCollections.some(f => String(f.student_id) === String(studentId));
}

/**
 * Checks if a student is marked as Discontinued across database and local cache.
 */
export function isStudentDiscontinued(student: any): boolean {
  if (!student) return false;
  if (typeof student.status === 'string' && student.status.toLowerCase() === 'discontinued') {
    return true;
  }
  const idCode = student.student_id_code || student.registration_number || '';
  if (typeof idCode === 'string' && idCode.toUpperCase().includes('[DISCONTINUED]')) {
    return true;
  }
  if (typeof window !== 'undefined' && student.id && window.localStorage) {
    try {
      if (localStorage.getItem(`student_status_${student.id}`) === 'discontinued') {
        return true;
      }
    } catch {
      // Safe fallback
    }
  }
  return false;
}

export interface StudentFinancialState {
  isDiscontinued: boolean;
  effectiveExpectedFee: number;
  paidFee: number;
  pendingDue: number;
  writtenOffAmount: number;
  nominalTotalFee: number;
}

/**
 * Calculates a student's effective financial state.
 * For Discontinued students:
 * - Expected collectible fee is capped at what was already collected.
 * - Active pending receivables = ₹0 (no ghost debt).
 * - Remaining uncollected balance is tracked as writtenOffAmount for audit/reporting.
 * For Active/Completed students:
 * - Normal contract calculations apply.
 */
export function getStudentFinancialState(student: any, paidAmount?: number): StudentFinancialState {
  const isDisc = isStudentDiscontinued(student);
  const nominalTotalFee = Number(student?.total_fees ?? student?.total_fee ?? 0);
  const paidFee = Math.max(0, Number(paidAmount !== undefined ? paidAmount : (student?.paid_fee ?? 0)));

  if (isDisc) {
    return {
      isDiscontinued: true,
      effectiveExpectedFee: paidFee, // Only what was paid is counted as expected collectible
      paidFee,
      pendingDue: 0,                 // Zero active collectible balance
      writtenOffAmount: Math.max(0, nominalTotalFee - paidFee),
      nominalTotalFee
    };
  }

  const pendingDue = Math.max(0, nominalTotalFee - paidFee);
  return {
    isDiscontinued: false,
    effectiveExpectedFee: nominalTotalFee,
    paidFee,
    pendingDue,
    writtenOffAmount: 0,
    nominalTotalFee
  };
}
