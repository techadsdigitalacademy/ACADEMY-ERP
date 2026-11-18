import { evaluateAttendanceStatus, isMissedPunchOut } from './attendanceRules';

export interface DailyPayrollItem {
  date: string;
  dayName: string;
  dayNumber: number;
  punchIn: string;
  punchOut: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'MEDICAL_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF' | 'ABSENT' | 'MISSED PUNCH OUT';
  isPaid: boolean;
  paidCredit: number; // 1.0, 0.5, 0.0
  deductionAmount: number;
  isMedicalLeave: boolean;
  note: string;
}

export interface PayrollCalculationResult {
  staffId: string;
  fullName: string;
  monthKey: string; // "YYYY-MM"
  monthName: string; // e.g. "November 2026"
  baseSalary: number;
  totalMonthDays: number;
  workingDays: number;
  weeklyOffs: number;
  holidays: number;
  
  // Attendance tally
  presentDays: number;
  lateDays: number;
  halfDays: number;
  medicalLeaves: number;
  unpaidLeaves: number;
  payableDays: number;
  
  // Training Period breakdown
  isTrainingActive: boolean;
  trainingDaysCount: number;
  baseSalaryWaived: number;
  trainingSalesTotal: number;
  trainingCommissionRate: number;
  trainingCommission: number;
  trainingEvaluation?: WorkingDaysTrainingResult;
  
  // Rates & Breakdown
  dailyRate: number;
  grossEarnings: number;
  incentives: number;
  leaveDeductions: number;
  halfDayDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  
  netSalary: number;
  netSalaryInWords: string;
  dailyBreakdown: DailyPayrollItem[];
}

/**
 * Converts a number into Indian Rupee words (e.g. 25500 -> "Twenty-Five Thousand Five Hundred Rupees Only")
 */
export function numberToWordsINR(amount: number): string {
  const rounded = Math.round(Math.max(0, amount));
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return teenDigits[n - 10];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit > 0 ? ' ' + singleDigits[unit] : ''}`;
  };

  const convertThreeDigits = (n: number): string => {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const hundredsPart = hundreds > 0 ? `${singleDigits[hundreds]} Hundred` : '';
    const remPart = convertTwoDigits(remainder);
    if (hundredsPart && remPart) return `${hundredsPart} and ${remPart}`;
    return hundredsPart || remPart;
  };

  let num = rounded;
  let words = '';

  // Crores (1,00,00,000)
  if (Math.floor(num / 10000000) > 0) {
    words += `${convertTwoDigits(Math.floor(num / 10000000))} Crore `;
    num %= 10000000;
  }

  // Lakhs (1,00,000)
  if (Math.floor(num / 100000) > 0) {
    words += `${convertTwoDigits(Math.floor(num / 100000))} Lakh `;
    num %= 100000;
  }

  // Thousands (1,000)
  if (Math.floor(num / 1000) > 0) {
    words += `${convertTwoDigits(Math.floor(num / 1000))} Thousand `;
    num %= 1000;
  }

  // Hundreds & Units (remainder)
  if (num > 0) {
    words += convertThreeDigits(num);
  }

  return `${words.trim()} Rupees Only`;
}

export interface WorkingDaysTrainingResult {
  isTraining: boolean;
  targetWorkingDays: number;
  completedWorkingDays: number;
  remainingWorkingDays: number;
  isCompleted: boolean;
  trainingStartDate: string;
  trainingEndDate: string | null;
  trainingWorkingDates: string[]; // Specific dates counted as training working days
  note: string;
}

/**
 * Evaluates whether an employee's training period has satisfied the target actual working days.
 * Only days where attendance is marked as present, late, or half-day are counted.
 * Sundays/Weekly Offs, official holidays, and unapproved leaves DO NOT count towards the
 * training duration, automatically extending the completion date until the required working days are met.
 */
export function evaluateWorkingDaysTraining({
  isTraining,
  trainingStartDate,
  targetWorkingDays = 7,
  attendanceLogs = [],
  weeklyOffDay = 'Sunday',
  holidays = []
}: {
  isTraining?: boolean;
  trainingStartDate?: string;
  targetWorkingDays?: number;
  attendanceLogs?: any[];
  weeklyOffDay?: string;
  holidays?: any[];
}): WorkingDaysTrainingResult {
  if (!isTraining || !trainingStartDate) {
    return {
      isTraining: false,
      targetWorkingDays: targetWorkingDays || 7,
      completedWorkingDays: 0,
      remainingWorkingDays: 0,
      isCompleted: false,
      trainingStartDate: '',
      trainingEndDate: null,
      trainingWorkingDates: [],
      note: 'Standard Employment (No Training Policy)'
    };
  }

  const target = Math.max(1, Number(targetWorkingDays) || 7);
  const trainingWorkingDates: string[] = [];
  let completed = 0;
  let completionDate: string | null = null;

  // Build a lookup map of attendance logs by date YYYY-MM-DD
  const logsByDate = new Map<string, any[]>();
  (attendanceLogs || []).forEach(log => {
    if (log?.attendance_date) {
      const existing = logsByDate.get(log.attendance_date) || [];
      existing.push(log);
      logsByDate.set(log.attendance_date, existing);
    }
  });

  const holidaysSet = new Set<string>();
  (holidays || []).forEach(h => {
    if (h?.holiday_date) holidaysSet.add(h.holiday_date);
  });

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Parse start date safely without timezone day-skips
  const parts = trainingStartDate.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return {
      isTraining: false,
      targetWorkingDays: target,
      completedWorkingDays: 0,
      remainingWorkingDays: target,
      isCompleted: false,
      trainingStartDate,
      trainingEndDate: null,
      trainingWorkingDates: [],
      note: 'Invalid Training Start Date'
    };
  }

  const curr = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  const maxScanDays = 180;
  let daysScanned = 0;

  while (daysScanned < maxScanDays) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayName = curr.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeeklyOff = dayName.toLowerCase() === (weeklyOffDay || 'Sunday').toLowerCase();
    const isHoliday = holidaysSet.has(dateStr);

    const dateLogs = logsByDate.get(dateStr) || [];

    // Only count as a training working day if:
    // 1. Not a weekly off (e.g. Sunday)
    // 2. Not an official holiday
    // 3. Employee actually attended office (marked as PRESENT, LATE, or HALF_DAY)
    if (!isWeeklyOff && !isHoliday && dateLogs.length > 0) {
      const hasValidAttendance = dateLogs.some(log => {
        const isMedical = Boolean(log.is_medical_leave || log.status === 'MEDICAL_LEAVE');
        if (isMedical) return false;
        const evalStatus = evaluateAttendanceStatus(log.punch_in, log.punch_out, log.status);
        const rawStatus = (log.status || '').toUpperCase().trim();
        return (
          evalStatus === 'PRESENT' || 
          evalStatus === 'LATE' || 
          evalStatus === 'HALF_DAY' ||
          rawStatus === 'PRESENT' ||
          rawStatus === 'LATE' ||
          rawStatus === 'HALF_DAY'
        );
      });

      if (hasValidAttendance) {
        trainingWorkingDates.push(dateStr);
        completed++;
        if (completed >= target) {
          completionDate = dateStr;
          break;
        }
      }
    }

    // Stop scanning future dates that haven't occurred yet
    if (dateStr >= todayStr && completed < target) {
      break;
    }

    curr.setDate(curr.getDate() + 1);
    daysScanned++;
  }

  const isCompleted = completed >= target;
  const remaining = Math.max(0, target - completed);

  let note = '';
  if (isCompleted) {
    note = `Completed ${target} actual working days on ${completionDate}`;
  } else {
    note = `In Progress (${completed} of ${target} working days completed • ${remaining} remaining)`;
  }

  return {
    isTraining: true,
    targetWorkingDays: target,
    completedWorkingDays: completed,
    remainingWorkingDays: remaining,
    isCompleted,
    trainingStartDate,
    trainingEndDate: completionDate,
    trainingWorkingDates,
    note
  };
}

/**
 * Alias for evaluateWorkingDaysTraining matching user naming convention
 */
export const evaluateWorkingDayTraining = evaluateWorkingDaysTraining;

/**
 * Calculates month-end attendance-linked automated payroll
 */
export function calculateMonthlyPayroll({
  staffId,
  fullName,
  monthlySalary,
  selectedMonth,
  attendanceLogs = [],
  holidays = [],
  weeklyOffDay = 'Sunday',
  customIncentives = 0,
  customDeductions = 0,
  gender,
  shiftEndTime,
  isTraining = false,
  trainingStartDate,
  trainingEndDate: _trainingEndDate,
  trainingDurationDays = 7,
  trainingCommissionRate = 10,
  staffSales = []
}: {
  staffId: string;
  fullName: string;
  monthlySalary: number;
  selectedMonth: string; // YYYY-MM
  attendanceLogs?: any[];
  holidays?: any[];
  weeklyOffDay?: string;
  customIncentives?: number;
  customDeductions?: number;
  gender?: string;
  shiftEndTime?: string;
  isTraining?: boolean;
  trainingStartDate?: string;
  trainingEndDate?: string;
  trainingDurationDays?: number;
  trainingCommissionRate?: number;
  staffSales?: any[];
}): PayrollCalculationResult {
  const [yearStr, monthStr] = (selectedMonth || new Date().toISOString().substring(0, 7)).split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = `${months[month - 1]} ${year}`;
  const totalMonthDays = new Date(year, month, 0).getDate();

  const baseSalary = Math.max(0, Number(monthlySalary) || 0);
  const dailyRate = totalMonthDays > 0 ? parseFloat((baseSalary / totalMonthDays).toFixed(2)) : 0;

  // Working-day based training evaluation
  const trainingEvaluation = evaluateWorkingDaysTraining({
    isTraining,
    trainingStartDate,
    targetWorkingDays: trainingDurationDays,
    attendanceLogs,
    weeklyOffDay,
    holidays
  });

  let trainingDaysCount = 0;

  // Local storage medical leave lookup fallback
  const localMedicalLeavesKey = `tech_ads_medical_leaves_${staffId || fullName}`;
  let localMedicalLeaves: string[] = [];
  try {
    const raw = localStorage.getItem(localMedicalLeavesKey);
    if (raw) localMedicalLeaves = JSON.parse(raw);
  } catch {}

  const dailyBreakdown: DailyPayrollItem[] = [];

  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  let medicalLeaves = 0;
  let unpaidLeaves = 0;
  let weeklyOffs = 0;
  let holidaysCount = 0;

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  for (let d = 1; d <= totalMonthDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeeklyOff = dayName.toLowerCase() === (weeklyOffDay || 'Sunday').toLowerCase();
    
    // Check holiday
    const matchHoliday = holidays.find(h => h.holiday_date === dateStr);

    // Check attendance record
    const matchedLog = attendanceLogs.find(a => a.attendance_date === dateStr);

    // Is medical leave?
    const isMedical = Boolean(
      matchedLog?.is_medical_leave ||
      matchedLog?.status === 'MEDICAL_LEAVE' ||
      localMedicalLeaves.includes(dateStr)
    );

    let status: DailyPayrollItem['status'] = 'ABSENT';
    let paidCredit = 0;
    let isPaid = false;
    let deductionAmount = 0;
    let note = '';
    const punchIn = matchedLog?.punch_in || '-';
    let punchOut = matchedLog?.punch_out || '-';

    if (matchedLog) {
      const isMissed = isMissedPunchOut(dateStr, matchedLog.punch_in, matchedLog.punch_out, gender, shiftEndTime);
      if (isMissed) punchOut = 'Missed Punch Out';

      if (isMedical) {
        status = 'MEDICAL_LEAVE';
        medicalLeaves++;
        paidCredit = 1.0;
        isPaid = true;
        deductionAmount = 0;
        note = 'Medical Leave (Exempt from salary deduction)';
      } else {
        const evaluated = evaluateAttendanceStatus(matchedLog.punch_in, matchedLog.punch_out, matchedLog.status);

        if (evaluated === 'PRESENT') {
          status = 'PRESENT';
          presentDays++;
          paidCredit = 1.0;
          isPaid = true;
          note = 'Full Day Present';
        } else if (evaluated === 'LATE') {
          status = 'LATE';
          lateDays++;
          paidCredit = 1.0;
          isPaid = true;
          note = 'Late Arrival (Shift Completed)';
        } else if (evaluated === 'HALF_DAY') {
          status = 'HALF_DAY';
          halfDays++;
          paidCredit = 0.5;
          isPaid = true; // partial
          deductionAmount = parseFloat((0.5 * dailyRate).toFixed(2));
          note = 'Half Day (0.5 day wage deduction)';
        } else {
          // Leave or Absent
          status = 'LEAVE';
          unpaidLeaves++;
          paidCredit = 0.0;
          isPaid = false;
          deductionAmount = dailyRate;
          note = 'Unapproved Leave / Absent';
        }
      }
    } else {
      // No log recorded for this date
      if (matchHoliday) {
        status = 'HOLIDAY';
        holidaysCount++;
        paidCredit = 1.0;
        isPaid = true;
        note = matchHoliday.holiday_name || 'Official Company Holiday';
      } else if (isWeeklyOff) {
        status = 'WEEKLY_OFF';
        weeklyOffs++;
        paidCredit = 1.0;
        isPaid = true;
        note = `${weeklyOffDay} Paid Weekly Off`;
      } else if (isMedical) {
        status = 'MEDICAL_LEAVE';
        medicalLeaves++;
        paidCredit = 1.0;
        isPaid = true;
        deductionAmount = 0;
        note = 'Medical Leave (Exempt from salary deduction)';
      } else {
        // If in the future, don't penalize yet
        const isFuture = dateStr > todayStr;
        if (isFuture) {
          status = 'ABSENT';
          paidCredit = 0;
          isPaid = false;
          deductionAmount = 0;
          note = 'Upcoming Calendar Date';
        } else {
          status = 'LEAVE';
          unpaidLeaves++;
          paidCredit = 0.0;
          isPaid = false;
          deductionAmount = dailyRate;
          note = 'Absent / Unpaid Leave';
        }
      }
    }

    const isTrainingDay = Boolean(
      isTraining &&
      trainingEvaluation.trainingWorkingDates.includes(dateStr)
    );

    if (isTrainingDay) {
      trainingDaysCount++;
    }

    dailyBreakdown.push({
      date: dateStr,
      dayName,
      dayNumber: d,
      punchIn,
      punchOut,
      status,
      isPaid,
      paidCredit,
      deductionAmount,
      isMedicalLeave: isMedical,
      note: isTrainingDay ? `${note ? note + ' • ' : ''}Training Working Day (Base salary waived, 10% sales commission active)` : note
    });
  }

  // Working days = calendar days - weekly offs - official holidays
  const workingDays = Math.max(0, totalMonthDays - weeklyOffs - holidaysCount);

  // Total payable days
  const payableDays = parseFloat((
    presentDays + lateDays + weeklyOffs + holidaysCount + medicalLeaves + (halfDays * 0.5)
  ).toFixed(1));

  // Deductions
  const leaveDeductions = parseFloat((unpaidLeaves * dailyRate).toFixed(2));
  const halfDayDeductions = parseFloat(((halfDays * 0.5) * dailyRate).toFixed(2));
  const otherDeductions = Math.max(0, Number(customDeductions) || 0);
  const totalDeductions = parseFloat((leaveDeductions + halfDayDeductions + otherDeductions).toFixed(2));

  const incentives = Math.max(0, Number(customIncentives) || 0);

  // Training Period Commission calculation
  let trainingSalesTotal = 0;
  if (isTraining && trainingStartDate && staffSales && staffSales.length > 0) {
    const tStart = trainingStartDate;
    const tEnd = trainingEvaluation.trainingEndDate || todayStr;
    trainingSalesTotal = staffSales
      .filter((s: any) => {
        const sDate = s.date || (s.created_at ? s.created_at.substring(0, 10) : '');
        return sDate >= tStart && sDate <= tEnd;
      })
      .reduce((sum: number, s: any) => sum + (Number(s.package_amount || s.received_amount) || 0), 0);
  }

  const effectiveCommissionRate = Number(trainingCommissionRate) > 0 ? Number(trainingCommissionRate) : 10;
  const trainingCommission = isTraining 
    ? Math.round(trainingSalesTotal * (effectiveCommissionRate / 100))
    : 0;

  // Base salary waived for training days
  const baseSalaryWaived = isTraining
    ? parseFloat((trainingDaysCount * dailyRate).toFixed(2))
    : 0;

  const grossEarnings = Math.max(0, parseFloat((baseSalary - baseSalaryWaived).toFixed(2)));

  const netSalary = Math.max(0, Math.round(grossEarnings + trainingCommission + incentives - totalDeductions));
  const netSalaryInWords = numberToWordsINR(netSalary);

  return {
    staffId,
    fullName,
    monthKey: `${yearStr}-${monthStr}`,
    monthName,
    baseSalary,
    totalMonthDays,
    workingDays,
    weeklyOffs,
    holidays: holidaysCount,
    presentDays,
    lateDays,
    halfDays,
    medicalLeaves,
    unpaidLeaves,
    payableDays,
    isTrainingActive: isTraining,
    trainingDaysCount,
    baseSalaryWaived,
    trainingSalesTotal,
    trainingCommissionRate: effectiveCommissionRate,
    trainingCommission,
    trainingEvaluation,
    dailyRate,
    grossEarnings,
    incentives,
    leaveDeductions,
    halfDayDeductions,
    otherDeductions,
    totalDeductions,
    netSalary,
    netSalaryInWords,
    dailyBreakdown
  };
}
