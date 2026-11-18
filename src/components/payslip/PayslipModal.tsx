import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  DollarSign, 
  FileText,
  Send,
  Calendar
} from 'lucide-react';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { formatCurrency } from '../../services/mockData';
import { supabase, monthWindowStart } from '../../services/supabase';
import { 
  getStaffSalaryDetails, 
  getStaffPayslips, 
  saveMonthlyPayslip, 
  disburseMonthlyPayslip,
  getStaffAttendanceLogs
} from '../../services/salaryService';
import type { StaffSalaryDetails } from '../../services/salaryService';
import { calculateMonthlyPayroll } from '../../utils/payrollCalculator';
import type { PayrollCalculationResult } from '../../utils/payrollCalculator';
import type { MonthlyPayslip } from '../../types';
import { fetchCompanyHolidays } from '../../utils/holidayStorage';

interface PayslipModalProps {
  staffId: string;
  fullName: string;
  designation?: string;
  initialMonth?: string;
  onClose: () => void;
  isAdmin?: boolean;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  staffId,
  fullName,
  designation = 'Staff Member',
  initialMonth,
  onClose,
  isAdmin = true
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonth || new Date().toISOString().substring(0, 7)
  );

  const [salaryDetails, setSalaryDetails] = useState<StaffSalaryDetails | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [existingPayslip, setExistingPayslip] = useState<MonthlyPayslip | null>(null);
  const [staffSales, setStaffSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form adjustments
  const [customIncentives, setCustomIncentives] = useState<number>(0);
  const [customDeductions, setCustomDeductions] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [disbursementDate, setDisbursementDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load staff data, attendance, and existing payslip for selected month
  const loadMonthData = async () => {
    setIsLoading(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const startOfMonthStr = `${selectedMonth}-01`;
      const endOfMonthStr = `${selectedMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

      // 1. Fetch staff salary & banking details
      const sDetails = await getStaffSalaryDetails(staffId, fullName);
      setSalaryDetails(sDetails);

      // 2. Fetch attendance logs for month (starting from training start date or window start to accurately tally working days)
      const windowStart = monthWindowStart();
      const attStart = sDetails?.trainingStartDate && sDetails.trainingStartDate < startOfMonthStr
        ? sDetails.trainingStartDate
        : windowStart;

      const attData = await getStaffAttendanceLogs(staffId, fullName, attStart);
      setAttendanceLogs(attData || []);

      // 3. Fetch holidays via holidayStorage with table fallback
      try {
        const holList = await fetchCompanyHolidays();
        const filtered = (holList || []).filter(h => h.holiday_date >= startOfMonthStr && h.holiday_date <= endOfMonthStr);
        setHolidays(filtered);
      } catch {
        const { data: holData } = await supabase
          .from('holidays')
          .select('*')
          .gte('holiday_date', startOfMonthStr)
          .lte('holiday_date', endOfMonthStr);
        setHolidays(holData || []);
      }

      // 4. Fetch sales for training period commission calculation
      try {
        const { data: sData } = await supabase
          .from('sales')
          .select('*')
          .or(`staff_id.eq.${staffId},user_id.eq.${staffId}`);
        setStaffSales(sData || []);
      } catch {
        setStaffSales([]);
      }

      // 5. Fetch existing payslip if generated previously
      const payslips = await getStaffPayslips(staffId, fullName);
      const found = payslips.find(p => p.month_key === selectedMonth);
      if (found) {
        setExistingPayslip(found);
        setCustomIncentives(found.incentives || 0);
        setCustomDeductions(found.other_deductions || 0);
        if (found.payment_method) setPaymentMethod(found.payment_method);
        if (found.transaction_ref) setTransactionRef(found.transaction_ref);
        if (found.disbursement_date) setDisbursementDate(found.disbursement_date);
        if (found.notes) setNotes(found.notes);
      } else {
        setExistingPayslip(null);
        setCustomIncentives(0);
        setCustomDeductions(0);
        setTransactionRef('');
        setNotes('');
      }
    } catch (err) {
      console.error('Error loading payroll data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [staffId, selectedMonth]);

  // Compute live payroll result
  const payrollResult: PayrollCalculationResult = calculateMonthlyPayroll({
    staffId,
    fullName,
    monthlySalary: existingPayslip ? existingPayslip.base_salary : (salaryDetails?.currentSalary || salaryDetails?.startingSalary || 0),
    selectedMonth,
    attendanceLogs,
    holidays,
    weeklyOffDay: 'Sunday',
    customIncentives: Number(customIncentives) || 0,
    customDeductions: Number(customDeductions) || 0,
    isTraining: Boolean(salaryDetails?.isTraining),
    trainingStartDate: salaryDetails?.trainingStartDate,
    trainingEndDate: salaryDetails?.trainingEndDate,
    trainingDurationDays: salaryDetails?.trainingDurationDays || 7,
    trainingCommissionRate: salaryDetails?.trainingCommissionRate || 10,
    staffSales
  });

  const payslipId = existingPayslip?.id || `PAY-${selectedMonth.replace('-', '')}-${staffId.slice(0, 5).toUpperCase()}`;

  // Handle Save / Approve
  const handleSavePayslip = async (disburseImmediately: boolean = false) => {
    setIsSubmitting(true);
    try {
      const payslipObj: MonthlyPayslip = {
        id: payslipId,
        staff_id: staffId,
        month_key: selectedMonth,
        month_name: payrollResult.monthName,
        base_salary: payrollResult.baseSalary,
        total_month_days: payrollResult.totalMonthDays,
        total_working_days: payrollResult.workingDays,
        present_days: payrollResult.presentDays + payrollResult.lateDays,
        weekly_offs: payrollResult.weeklyOffs,
        holidays: payrollResult.holidays,
        medical_leaves: payrollResult.medicalLeaves,
        half_days: payrollResult.halfDays,
        unpaid_leaves: payrollResult.unpaidLeaves,
        payable_days: payrollResult.payableDays,
        daily_rate: payrollResult.dailyRate,
        gross_earnings: payrollResult.grossEarnings,
        leave_deductions: payrollResult.leaveDeductions,
        half_day_deductions: payrollResult.halfDayDeductions,
        other_deductions: Number(customDeductions) || 0,
        incentives: Number(customIncentives) || 0,
        training_commission: payrollResult.trainingCommission,
        training_sales_total: payrollResult.trainingSalesTotal,
        training_days_waived: payrollResult.trainingDaysCount,
        base_salary_waived: payrollResult.baseSalaryWaived,
        net_salary: payrollResult.netSalary,
        payment_status: disburseImmediately ? 'DISBURSED' : (existingPayslip?.payment_status || 'APPROVED'),
        disbursement_date: disburseImmediately ? disbursementDate : existingPayslip?.disbursement_date,
        payment_method: paymentMethod,
        transaction_ref: transactionRef || undefined,
        notes: notes.trim() || undefined,
        created_at: existingPayslip?.created_at || new Date().toISOString()
      };

      if (disburseImmediately) {
        const confirmed = window.confirm(
          `Disburse ${formatCurrency(payrollResult.netSalary)} to ${fullName} (${payrollResult.monthName})?\n\n` +
          `FINANCE LEDGER SYNCHRONIZATION:\n` +
          `• An official company expense of ${formatCurrency(payrollResult.netSalary)} will be automatically created under category "Salary" in the Finance module.\n` +
          `• Company cash flow, closing balance, and P&L ledgers will be synchronized immediately.\n` +
          `• The payslip will be permanently marked as DISBURSED.\n\n` +
          `Proceed with disbursement?`
        );
        if (!confirmed) {
          setIsSubmitting(false);
          return;
        }

        await disburseMonthlyPayslip({
          payslip: payslipObj,
          staffName: fullName,
          paymentMethod,
          transactionRef: transactionRef.trim() || undefined,
          disbursementDate
        });
        alert(`Success! Payslip for ${fullName} (${payrollResult.monthName}) has been disbursed.\n\n${formatCurrency(payrollResult.netSalary)} was automatically synchronized and recorded into the Finance Ledger under "Salary".`);
      } else {
        await saveMonthlyPayslip(payslipObj, fullName);
        alert(`Payslip for ${fullName} (${payrollResult.monthName}) has been successfully saved & approved.`);
      }

      await loadMonthData();
    } catch (err: any) {
      alert('Failed to save payslip: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Printable HTML Window Generator
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      alert('Pop-up blocked. Please enable pop-ups to print payslips.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${fullName} (${payrollResult.monthName})</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 11px; line-height: 1.4; }
            .letterhead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .company-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
            .company-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
            .payslip-badge { text-align: right; }
            .payslip-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #4338ca; }
            .payslip-id { font-size: 10px; color: #64748b; font-family: monospace; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
            .info-item { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .info-label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600; }
            .info-value { font-weight: 700; color: #0f172a; font-size: 11px; }

            .tally-box { display: flex; justify-content: space-between; background: #f1f5f9; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; border: 1px solid #cbd5e1; }
            .tally-item { text-align: center; }
            .tally-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #475569; }
            .tally-value { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 1px; }

            .table-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; font-size: 9.5px; text-transform: uppercase; font-weight: 700; color: #475569; }
            td { border: 1px solid #e2e8f0; padding: 6px 10px; }
            .amount { text-align: right; font-family: monospace; font-weight: 700; }
            
            .net-pay-banner { background: #0f172a; color: white; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .net-label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
            .net-amount { font-size: 20px; font-weight: 900; }
            .words-row { font-size: 10px; color: #64748b; margin-top: -16px; margin-bottom: 24px; font-style: italic; }

            .footer-sign { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 16px; }
            .sign-box { text-align: center; width: 180px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 10px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <div>
              <div class="company-name">TECH ADS ACADEMY & ERP</div>
              <div class="company-sub">Puthanathani, Malappuram, Kerala &bull; contact@techadsacademy.com</div>
            </div>
            <div class="payslip-badge">
              <div class="payslip-title">Salary Payslip</div>
              <div class="payslip-id">${payslipId} &bull; ${payrollResult.monthName}</div>
            </div>
          </div>

          <div class="info-grid">
            <div>
              <div class="info-item"><span class="info-label">Employee Name:</span> <span class="info-value">${fullName}</span></div>
              <div class="info-item"><span class="info-label">Staff Code:</span> <span class="info-value">${salaryDetails?.staffId ? 'TA-ACA-' + salaryDetails.staffId.slice(0, 4).toUpperCase() : 'TA-ACA-01'}</span></div>
              <div class="info-item"><span class="info-label">Designation:</span> <span class="info-value">${designation}</span></div>
              <div class="info-item"><span class="info-label">PAN Number:</span> <span class="info-value">${salaryDetails?.panNumber || 'N/A'}</span></div>
            </div>
            <div>
              <div class="info-item"><span class="info-label">Bank Name:</span> <span class="info-value">${salaryDetails?.bankName || 'Direct Transfer'}</span></div>
              <div class="info-item"><span class="info-label">Account No:</span> <span class="info-value">${salaryDetails?.bankAccountNo || 'On File'}</span></div>
              <div class="info-item"><span class="info-label">IFSC Code:</span> <span class="info-value">${salaryDetails?.bankIfsc || 'N/A'}</span></div>
              <div class="info-item"><span class="info-label">UPI / GPay ID:</span> <span class="info-value">${salaryDetails?.upiId || 'N/A'}</span></div>
            </div>
          </div>

          <div class="tally-box">
            <div class="tally-item"><div class="tally-label">Month Days</div><div class="tally-value">${payrollResult.totalMonthDays}</div></div>
            <div class="tally-item"><div class="tally-label">Working Days</div><div class="tally-value">${payrollResult.workingDays}</div></div>
            <div class="tally-item"><div class="tally-label">Present</div><div class="tally-value" style="color: #059669;">${payrollResult.presentDays + payrollResult.lateDays}</div></div>
            <div class="tally-item"><div class="tally-label">Weekly Offs</div><div class="tally-value">${payrollResult.weeklyOffs}</div></div>
            <div class="tally-item"><div class="tally-label">Holidays</div><div class="tally-value">${payrollResult.holidays}</div></div>
            <div class="tally-item"><div class="tally-label">Medical Leave</div><div class="tally-value" style="color: #059669;">${payrollResult.medicalLeaves} (Paid)</div></div>
            <div class="tally-item"><div class="tally-label">Half Days</div><div class="tally-value" style="color: #d97706;">${payrollResult.halfDays} (${payrollResult.halfDays * 0.5} Cut)</div></div>
            <div class="tally-item"><div class="tally-label">Unpaid Leave</div><div class="tally-value" style="color: #e11d48;">${payrollResult.unpaidLeaves}</div></div>
            <div class="tally-item"><div class="tally-label">Payable Days</div><div class="tally-value" style="color: #4338ca;">${payrollResult.payableDays}</div></div>
          </div>

          <div class="table-wrap">
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Earnings Breakdown</th>
                    <th style="text-align: right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Basic Fixed Salary</td>
                    <td class="amount">₹${payrollResult.isTrainingActive && payrollResult.trainingDaysCount > 0 ? (payrollResult.grossEarnings.toLocaleString() + ' (Training Waived: ₹' + payrollResult.baseSalaryWaived.toLocaleString() + ')') : payrollResult.baseSalary.toLocaleString()}</td>
                  </tr>
                  ${payrollResult.isTrainingActive && payrollResult.trainingCommission > 0 ? `
                  <tr style="background: #f0fdf4;">
                    <td><strong>Training Sales Commission (${payrollResult.trainingCommissionRate}%)</strong><div style="font-size: 9px; color: #16a34a;">10% of ₹${payrollResult.trainingSalesTotal.toLocaleString()} sales closed</div></td>
                    <td class="amount" style="color: #16a34a;">+₹${payrollResult.trainingCommission.toLocaleString()}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td>Incentive / Commission</td>
                    <td class="amount">₹${payrollResult.incentives.toLocaleString()}</td>
                  </tr>
                  <tr style="font-weight: bold; background: #f8fafc;">
                    <td>Total Gross Earnings</td>
                    <td class="amount">₹${(payrollResult.grossEarnings + payrollResult.trainingCommission + payrollResult.incentives).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <table>
                <thead>
                  <tr>
                    <th>Deductions Breakdown</th>
                    <th style="text-align: right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Unpaid Leave (${payrollResult.unpaidLeaves} Days)</td>
                    <td class="amount">₹${payrollResult.leaveDeductions.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Half-Day Deductions (${payrollResult.halfDays} Half-Days)</td>
                    <td class="amount">₹${payrollResult.halfDayDeductions.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Other Deductions / Advances</td>
                    <td class="amount">₹${payrollResult.otherDeductions.toLocaleString()}</td>
                  </tr>
                  <tr style="font-weight: bold; background: #f8fafc;">
                    <td>Total Deductions</td>
                    <td class="amount" style="color: #e11d48;">₹${payrollResult.totalDeductions.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="net-pay-banner">
            <div>
              <div class="net-label">Net Salary Payable</div>
              <div style="font-size: 9px; opacity: 0.8; margin-top: 2px;">Status: ${existingPayslip?.payment_status || 'VERIFIED'}</div>
            </div>
            <div class="net-amount">₹${payrollResult.netSalary.toLocaleString()}</div>
          </div>

          <div class="words-row">
            Amount in Words: <strong>${payrollResult.netSalaryInWords}</strong>
          </div>

          <div class="footer-sign">
            <div class="sign-box">Employee Signature</div>
            <div class="sign-box">Managing Director / HR</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/85 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-up my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                Staff Payslip & Letterhead Generator
                {existingPayslip?.payment_status === 'DISBURSED' && (
                  <Badge variant="success" className="text-[9px] py-0.5">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Disbursed
                  </Badge>
                )}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {fullName} &bull; {designation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
              <input 
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary dark:[color-scheme:dark] [color-scheme:light] cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                title="Select payslip month"
              />
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Computing attendance logs and generating salary calculations...
            </div>
          ) : (
            <>
              {/* 1. LETTER-PAD PREVIEW CONTAINER */}
              <div className="bg-card border border-border rounded-lg p-5 space-y-4 shadow-inner">
                {/* Letterhead Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-border gap-2">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-foreground">
                      TECH ADS ACADEMY & ERP
                    </h2>
                    <p className="text-[10px] text-muted-foreground">
                      Puthanathani, Malappuram, Kerala &bull; Payslip Ref: <span className="font-mono font-bold text-foreground">{payslipId}</span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary-soft px-2.5 py-1 rounded-md border border-primary/20">
                      Payslip: {payrollResult.monthName}
                    </span>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-muted-2 p-3.5 rounded-lg border border-border text-xs">
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-muted-foreground block">Employee</span>
                    <strong className="text-foreground">{fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-muted-foreground block">Designation</span>
                    <strong className="text-foreground">{designation}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-muted-foreground block">Bank Name</span>
                    <strong className="text-foreground truncate block">{salaryDetails?.bankName || 'Direct Transfer'}</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-muted-foreground block">Account / IFSC</span>
                    <strong className="text-foreground font-mono text-[11px] truncate block">{salaryDetails?.bankAccountNo || 'On File'}</strong>
                    {salaryDetails?.bankIfsc && (
                      <span className="text-[9px] text-muted-foreground block truncate font-mono">IFSC: {salaryDetails.bankIfsc}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-muted-foreground block">Google Pay / UPI</span>
                    <strong className="text-foreground font-mono text-[11px] truncate block text-primary">
                      {salaryDetails?.upiId || 'Not Set'}
                    </strong>
                    {salaryDetails?.panNumber && (
                      <span className="text-[9px] text-muted-foreground block truncate font-mono">PAN: {salaryDetails.panNumber}</span>
                    )}
                  </div>
                </div>

                {/* Attendance Summary Ribbon */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-primary-soft/30 p-3 rounded-lg border border-primary/10 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Working Days</span>
                    <strong className="text-sm font-black text-foreground">{payrollResult.workingDays} / {payrollResult.totalMonthDays}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Present</span>
                    <strong className="text-sm font-black text-success">{payrollResult.presentDays + payrollResult.lateDays}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Offs & Holidays</span>
                    <strong className="text-sm font-black text-foreground">{payrollResult.weeklyOffs + payrollResult.holidays}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Medical Leave</span>
                    <strong className="text-sm font-black text-emerald-400">{payrollResult.medicalLeaves} (Paid)</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Half Days</span>
                    <strong className="text-sm font-black text-warning">{payrollResult.halfDays} ({payrollResult.halfDays * 0.5} Cut)</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Payable Days</span>
                    <strong className="text-sm font-black text-primary">{payrollResult.payableDays}</strong>
                  </div>
                </div>

                {/* Training Period Notification Banner */}
                {payrollResult.isTrainingActive && (
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5 text-xs">
                    <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 font-bold shrink-0 text-[10px]">TRAINING</span>
                    <div className="space-y-0.5">
                      <span className="font-bold text-indigo-500 block">Training Window Active ({payrollResult.trainingDaysCount} Days)</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Fixed base salary for {payrollResult.trainingDaysCount} training day(s) was waived ({formatCurrency(payrollResult.baseSalaryWaived)}). Instead, {payrollResult.trainingCommissionRate}% commission on total sales closed during training (<strong className="text-foreground">{formatCurrency(payrollResult.trainingSalesTotal)}</strong>) has been automatically computed and credited (+<strong className="text-emerald-500">{formatCurrency(payrollResult.trainingCommission)}</strong>).
                      </p>
                    </div>
                  </div>
                )}

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted-2 px-3 py-2 font-bold text-[10px] uppercase text-muted-foreground border-b border-border flex justify-between">
                      <span>Earnings</span>
                      <span>Amount</span>
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Basic Fixed Pay</span>
                        <strong className="text-foreground">
                          {payrollResult.isTrainingActive && payrollResult.trainingDaysCount > 0 ? (
                            <span>
                              {formatCurrency(payrollResult.grossEarnings)}{' '}
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({payrollResult.trainingDaysCount}d waived)
                              </span>
                            </span>
                          ) : (
                            formatCurrency(payrollResult.grossEarnings)
                          )}
                        </strong>
                      </div>
                      {payrollResult.isTrainingActive && payrollResult.trainingCommission > 0 && (
                        <div className="flex justify-between items-center bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                          <div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                              Training Sales Commission ({payrollResult.trainingCommissionRate}%)
                            </span>
                            <span className="text-[9.5px] text-muted-foreground block">
                              10% of {formatCurrency(payrollResult.trainingSalesTotal)} sales closed
                            </span>
                          </div>
                          <strong className="text-emerald-500 font-mono">
                            +{formatCurrency(payrollResult.trainingCommission)}
                          </strong>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sales Incentive / Bonus</span>
                        <strong className="text-success">+{formatCurrency(payrollResult.incentives)}</strong>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-between items-center font-bold">
                        <span>Total Gross</span>
                        <span className="text-foreground">
                          {formatCurrency(payrollResult.grossEarnings + payrollResult.trainingCommission + payrollResult.incentives)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted-2 px-3 py-2 font-bold text-[10px] uppercase text-muted-foreground border-b border-border flex justify-between">
                      <span>Deductions</span>
                      <span>Amount</span>
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Unpaid Leaves ({payrollResult.unpaidLeaves}d)</span>
                        <strong className="text-danger">-{formatCurrency(payrollResult.leaveDeductions)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Half-Days ({payrollResult.halfDays} × 0.5d)</span>
                        <strong className="text-danger">-{formatCurrency(payrollResult.halfDayDeductions)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Other Advances / Cuts</span>
                        <strong className="text-danger">-{formatCurrency(payrollResult.otherDeductions)}</strong>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-between items-center font-bold">
                        <span>Total Deductions</span>
                        <span className="text-danger">-{formatCurrency(payrollResult.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary Banner */}
                <div className="bg-primary-soft border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                      Net Salary Disbursable
                    </span>
                    <span className="text-xs text-muted-foreground">
                      In Words: <strong className="text-foreground font-semibold">{payrollResult.netSalaryInWords}</strong>
                    </span>
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {formatCurrency(payrollResult.netSalary)}
                  </div>
                </div>
              </div>

              {/* 2. ADMIN ADJUSTMENTS SECTION */}
              {isAdmin && (
                <div className="p-4 bg-muted-2/60 border border-border rounded-lg space-y-3">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Admin Custom Adjustments & Disbursement
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Incentive / Bonus (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={customIncentives || ''}
                        onChange={(e) => setCustomIncentives(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Extra Deductions (₹)</label>
                      <input 
                        type="number"
                        min="0"
                        value={customDeductions || ''}
                        onChange={(e) => setCustomDeductions(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Transaction Ref / UTR</label>
                      <input 
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="e.g. UTR12345678"
                        className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Finance Ledger Synchronization Callout */}
        {isAdmin && existingPayslip?.payment_status !== 'DISBURSED' && (
          <div className="mx-6 mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
            <Send className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                Automatic Finance Ledger Synchronization
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Clicking <strong className="text-foreground">"Mark Disbursed (Sync Finance)"</strong> automatically logs an expense of <strong className="text-emerald-500">{formatCurrency(payrollResult.netSalary)}</strong> into the Company Finance ledger (<code className="font-mono text-primary text-[10px]">expenses</code> table under Category: <strong>Salary</strong>). This synchronizes the Daily Closing Report, Cash Outflow, and Profit & Loss balance sheet instantaneously without manual double-entry.
              </p>
            </div>
          </div>
        )}

        {existingPayslip?.payment_status === 'DISBURSED' && (
          <div className="mx-6 mb-3 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                  Disbursed & Synchronized to Company Finance
                </span>
                <p className="text-[10px] text-muted-foreground">
                  Recorded in Finance Ledger on {new Date(existingPayslip.disbursement_date || existingPayslip.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Category: Salary • Ref: {existingPayslip.transaction_ref || 'Direct Bank/UPI'}
                </p>
              </div>
            </div>
            <Badge variant="success">DISBURSED & LOGGED</Badge>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card/90 flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintPDF}
            className="text-xs font-bold uppercase tracking-wider"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Download Letterpad PDF
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </Button>

            {isAdmin && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSavePayslip(false)}
                  disabled={isSubmitting}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Save & Approve
                </Button>

                {existingPayslip?.payment_status !== 'DISBURSED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSavePayslip(true)}
                    disabled={isSubmitting}
                    className="text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    title="Automatically creates a Salary expense in Finance Ledger and marks payslip as Disbursed"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Mark Disbursed (Sync Finance)
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
