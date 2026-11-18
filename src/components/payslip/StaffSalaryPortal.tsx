import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Building2, 
  CreditCard, 
  FileCheck,
  Printer,
  Clock,
  GraduationCap,
  TrendingUp,
  UserMinus
} from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { formatCurrency } from '../../services/mockData';
import { supabase } from '../../services/supabase';
import { 
  getStaffSalaryDetails, 
  getStaffPayslips, 
  getStaffAttendanceLogs,
  CANONICAL_STAFF_ALIASES,
  markIncrementDeleted,
  unmarkIncrementDeleted,
  syncRetroactiveDeletedIncrements,
  getAllLocalKeys
} from '../../services/salaryService';
import type { StaffSalaryDetails } from '../../services/salaryService';
import { PayslipModal } from './PayslipModal';
import type { MonthlyPayslip } from '../../types';
import { evaluateWorkingDayTraining } from '../../utils/payrollCalculator';
import { monthWindowStart } from '../../services/supabase';

interface StaffSalaryPortalProps {
  activeStaff: any;
}

export const StaffSalaryPortal: React.FC<StaffSalaryPortalProps> = ({ activeStaff }) => {
  const [details, setDetails] = useState<StaffSalaryDetails | null>(null);
  const [payslips, setPayslips] = useState<MonthlyPayslip[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingMonth, setViewingMonth] = useState<string | null>(null);

  const staffId = activeStaff?.id;
  const fullName = activeStaff?.full_name || (activeStaff as any)?.name || '';

  const loadData = async (showLoading = true) => {
    if (!staffId && !fullName) return;
    if (showLoading) setIsLoading(true);
    try {
      const windowStart = monthWindowStart();
      const [sDetails, sPayslips, attLogs] = await Promise.all([
        getStaffSalaryDetails(staffId, fullName),
        getStaffPayslips(staffId, fullName),
        getStaffAttendanceLogs(staffId, fullName, windowStart)
      ]);
      setDetails(sDetails);
      setPayslips(sPayslips);
      setAttendanceLogs(attLogs || []);
    } catch (e) {
      console.error('Failed to load staff salary portal data:', e);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    syncRetroactiveDeletedIncrements().catch(() => {});
    loadData();
    const isMatch = (syncId?: string, syncName?: string) => {
      if (!syncId && !syncName) return true;
      if (syncId && staffId && String(syncId) === String(staffId)) return true;
      if (syncName && fullName) {
        const s1 = syncName.trim().toLowerCase();
        const s2 = fullName.trim().toLowerCase();
        if (s1 === s2 || s1.startsWith(s2) || s2.startsWith(s1)) return true;
        const s1First = s1.split(' ')[0].replace(/[^a-z0-9]/g, '');
        const s2First = s2.split(' ')[0].replace(/[^a-z0-9]/g, '');
        if (s1First.length > 2 && s1First === s2First) return true;
        const aliases = CANONICAL_STAFF_ALIASES[s1First] || [];
        if (aliases.some(a => s2.startsWith(a) || s2.includes(a) || a.startsWith(s2First))) return true;
        const aliases2 = CANONICAL_STAFF_ALIASES[s2First] || [];
        if (aliases2.some(a => s1.startsWith(a) || s1.includes(a) || a.startsWith(s1First))) return true;
      }
      return false;
    };

    const applyOptimisticUpdate = (extra?: any) => {
      if (!extra?.action) return;
      if (extra.action === 'delete_increment' && extra.incrementId) {
        markIncrementDeleted(extra.incrementId);
        setDetails(prev => {
          if (!prev) return prev;
          const updated = (extra.remainingIncrements || (prev.increments || []).filter(i => i.id !== extra.incrementId));
          const newSal = extra.newSalary !== undefined 
            ? extra.newSalary 
            : (updated.length > 0 ? updated[0].new_salary : prev.startingSalary);
          return {
            ...prev,
            currentSalary: newSal,
            increments: updated
          };
        });
      } else if (extra.action === 'update_increment' && (extra.increment || extra.allIncrements)) {
        if (extra.increment?.id) unmarkIncrementDeleted(extra.increment.id);
        setDetails(prev => {
          if (!prev) return prev;
          let updated = extra.allIncrements;
          if (!updated && extra.increment) {
            updated = (prev.increments || []).map(i => i.id === extra.increment.id ? extra.increment : i);
            updated.sort((a: any, b: any) => (b.effective_from || '').localeCompare(a.effective_from || ''));
          }
          const newSal = extra.newSalary !== undefined 
            ? extra.newSalary 
            : (updated && updated.length > 0 ? updated[0].new_salary : prev.startingSalary);
          return {
            ...prev,
            currentSalary: newSal,
            increments: updated || prev.increments
          };
        });
      } else if (extra.action === 'remove_offer_letter') {
        setDetails(prev => prev ? {
          ...prev,
          offerLetterUrl: undefined,
          offerLetterName: undefined,
          offerLetterUploadedAt: undefined
        } : prev);
        const localKeys = getAllLocalKeys(staffId, fullName);
        localKeys.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                delete parsed.offerLetterUrl;
                delete parsed.offerLetterName;
                delete parsed.offerLetterUploadedAt;
                localStorage.setItem(k, JSON.stringify(parsed));
              }
            }
          } catch {}
        });
      } else if (extra.action === 'upload_offer_letter') {
        setDetails(prev => prev ? {
          ...prev,
          offerLetterUrl: extra.url,
          offerLetterName: extra.name,
          offerLetterUploadedAt: extra.uploadedAt
        } : prev);
      }
    };

    const handleSync = (e: any) => {
      const syncId = e?.detail?.staffId;
      const syncName = e?.detail?.fullName;
      if (isMatch(syncId, syncName)) {
        applyOptimisticUpdate(e?.detail?.extra);
        loadData(false);
      }
    };
    window.addEventListener('salary_data_changed', handleSync);
    window.addEventListener('payslip_data_changed', handleSync);
    window.addEventListener('staff_profiles_changed', handleSync);

    // Cross-tab real-time listener
    const hrChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tech_ads_hr_channel') : null;
    if (hrChannel) {
      hrChannel.onmessage = (msg) => {
        const msgId = msg?.data?.staffId;
        const msgName = msg?.data?.fullName;
        if (isMatch(msgId, msgName)) {
          applyOptimisticUpdate(msg?.data?.extra);
          loadData(false);
        }
      };
    }

    // Live Supabase Realtime channel for staff row updates
    const channel = supabase
      .channel(`staff_portal_realtime_${staffId || fullName || 'global'}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, (payload: any) => {
        const changedId = payload.new?.id || payload.old?.id;
        const changedName = payload.new?.full_name || payload.old?.full_name;
        if (isMatch(changedId, changedName)) {
          loadData(false);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('salary_data_changed', handleSync);
      window.removeEventListener('payslip_data_changed', handleSync);
      window.removeEventListener('staff_profiles_changed', handleSync);
      hrChannel?.close();
      supabase.removeChannel(channel);
    };
  }, [staffId, fullName]);

  if (isLoading && !details) {
    return (
      <Card variant="glass" className="p-8 text-center text-muted-foreground animate-pulse">
        Loading your salary, offer letter, and payslips...
      </Card>
    );
  }

  const currentSalary = details?.currentSalary || details?.startingSalary || 0;
  const startingSalary = details?.startingSalary || 0;

  const computeNoticeRemaining = (lastDayStr?: string) => {
    if (!lastDayStr) return null;
    const target = new Date(lastDayStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isServingNotice = 
    details?.resignationStatus === 'SERVING_NOTICE' || 
    activeStaff?.resignation_status === 'SERVING_NOTICE' ||
    activeStaff?.status === 'SERVING_NOTICE';

  const isRelieved = 
    details?.resignationStatus === 'RESIGNED' || 
    activeStaff?.resignation_status === 'RESIGNED' || 
    activeStaff?.status === 'RESIGNED';

  const effectiveNoticeDays = Number(details?.noticePeriodDays || activeStaff?.notice_period_days || 30);
  const effectiveLastWorkingDay = details?.lastWorkingDay || activeStaff?.last_working_day || undefined;
  const effectiveResignationDate = details?.resignationDate || activeStaff?.resignation_date || undefined;
  const noticeRemaining = computeNoticeRemaining(effectiveLastWorkingDay);

  // Evaluate working-day based training progress live
  const trainingProgress = evaluateWorkingDayTraining({
    isTraining: details?.isTraining,
    trainingStartDate: details?.trainingStartDate,
    targetWorkingDays: details?.trainingDurationDays || 7,
    attendanceLogs,
    weeklyOffDay: activeStaff?.weekly_off_day || 'Sunday'
  });

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Notice Period Banner if active */}
      {isServingNotice && (
        <Card variant="glass" className="p-4 bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-500 block">
                    Notice Period in Progress
                  </span>
                  <Badge variant="warning" className="text-[9.5px] font-extrabold uppercase py-0.5 px-2">
                    <Clock className="w-3 h-3 mr-1" />
                    {noticeRemaining !== null ? (noticeRemaining > 0 ? `${noticeRemaining}d Left` : noticeRemaining === 0 ? 'Final Day' : 'Notice Ended') : 'Serving Notice'}
                  </Badge>
                </div>
                <div className="text-lg font-black text-foreground flex items-center gap-2 mt-0.5">
                  <span>
                    {noticeRemaining !== null ? (
                      noticeRemaining > 0 
                        ? `${noticeRemaining} Days Remaining` 
                        : noticeRemaining === 0 
                          ? 'Today is your Final Working Day' 
                          : `Notice Period Ended (${-noticeRemaining} days ago)`
                    ) : 'Notice Period Active'}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    (Total: {effectiveNoticeDays} Days)
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right bg-card/60 px-3 py-2 rounded-lg border border-border shrink-0 self-stretch sm:self-auto">
              <span className="text-[9.5px] font-bold uppercase text-muted-foreground block">
                Expected Last Working Day
              </span>
              <span className="text-sm font-mono font-black text-foreground">
                {effectiveLastWorkingDay 
                  ? new Date(effectiveLastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'To Be Decided'}
              </span>
            </div>
          </div>

          {/* Notice countdown progress bar */}
          {effectiveNoticeDays && effectiveResignationDate && (
            <div className="space-y-1 pt-1 border-t border-amber-500/20">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Notice Period Completion</span>
                <span className="font-mono font-bold text-foreground">
                  {Math.min(100, Math.max(0, Math.round(((effectiveNoticeDays - (noticeRemaining || 0)) / effectiveNoticeDays) * 100)))}% Elapsed
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, (((effectiveNoticeDays - (noticeRemaining || 0)) / effectiveNoticeDays) * 100)))}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                <span>Resignation Submitted: {effectiveResignationDate}</span>
                <span>Relieving Date: {effectiveLastWorkingDay || 'Pending'}</span>
              </div>
            </div>
          )}

          {details?.resignationReason && (
            <div className="text-xs bg-card/60 p-2.5 rounded border border-border">
              <span className="font-bold text-muted-foreground text-[10px] uppercase block mb-0.5">
                Handover & Relieving Remarks:
              </span>
              <p className="text-foreground italic">{details.resignationReason}</p>
            </div>
          )}
        </Card>
      )}

      {/* Relieved / Resigned Staff Banner if applicable */}
      {isRelieved && !isServingNotice && (
        <Card variant="glass" className="p-4 bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-500">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-500 block">
                Relieved & Former Employee Record
              </span>
              <p className="text-xs text-foreground mt-0.5">
                Service finalized on {effectiveLastWorkingDay ? new Date(effectiveLastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Record'}. Archived salary details, offer letters, and generated payslips remain available for your download and records.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Training Period Banner if active */}
      {details?.isTraining && (
        <Card variant="glass" className="p-4 bg-purple-500/10 border border-purple-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-purple-400 block">
                  {trainingProgress.isCompleted
                    ? 'Training Period Completed (Commission Window Finalized)'
                    : 'Training Period In Progress (Sales Commission Mode Active)'}
                </span>
                <p className="text-xs text-foreground mt-0.5">
                  {trainingProgress.isCompleted ? (
                    <>
                      You have successfully completed all <strong>{trainingProgress.targetWorkingDays} actual working days</strong> of training (finalized on {trainingProgress.trainingEndDate}). Fixed base salary now applies normally.
                    </>
                  ) : (
                    <>
                      Target: <strong>{trainingProgress.completedWorkingDays} of {trainingProgress.targetWorkingDays} actual working days</strong> completed ({trainingProgress.remainingWorkingDays} remaining). Fixed base salary is waived during training days, and you receive an automatic <strong>{details.trainingCommissionRate || 10}% commission</strong> on all closed deals!
                    </>
                  )}
                </p>
              </div>
            </div>

            <Badge variant={trainingProgress.isCompleted ? 'success' : 'indigo'} className="text-[10px] font-extrabold uppercase py-1 px-2.5 shrink-0 self-start sm:self-auto">
              <GraduationCap className="w-3.5 h-3.5 mr-1" />
              {trainingProgress.isCompleted
                ? 'Completed'
                : `${trainingProgress.completedWorkingDays}/${trainingProgress.targetWorkingDays} Days (${trainingProgress.remainingWorkingDays}d left)`}
            </Badge>
          </div>

          {!trainingProgress.isCompleted && (
            <div className="space-y-1 pt-1 border-t border-purple-500/20">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Working-Day Attendance Progress</span>
                <span className="font-mono font-bold text-foreground">
                  {trainingProgress.completedWorkingDays} / {trainingProgress.targetWorkingDays} Working Days ({Math.round((trainingProgress.completedWorkingDays / trainingProgress.targetWorkingDays) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (trainingProgress.completedWorkingDays / trainingProgress.targetWorkingDays) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Note: Only days with verified attendance (Present, Late, or Half-Day) count towards training. Sundays, official holidays, and unapproved leaves automatically extend your training duration until {trainingProgress.targetWorkingDays} actual working days are completed.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 1. TOP OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Active CTC */}
        <Card variant="glass" glowColor="emerald" className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Current Monthly Salary
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(currentSalary)}
            <span className="text-xs font-semibold text-muted-foreground ml-1.5">/ month</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2.5 border-t border-border">
            <span>Payroll Frequency:</span>
            <strong className="text-foreground font-semibold">Monthly Direct Payout</strong>
          </div>
        </Card>

        {/* Starting Salary */}
        <Card variant="glass" glowColor="indigo" className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Joining / Baseline Salary
            </span>
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(startingSalary)}
            <span className="text-xs font-semibold text-muted-foreground ml-1.5">/ month</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2.5 border-t border-border">
            <span>Designation:</span>
            <strong className="text-foreground">{activeStaff?.designation || 'Staff'}</strong>
          </div>
        </Card>

        {/* Offer Letter Status */}
        <Card variant="glass" glowColor="purple" className="p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Employment Offer Letter
              </span>
              <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileCheck className="w-4 h-4" />
              </span>
            </div>
            <div>
              <span className="text-sm font-bold text-foreground">
                {details?.offerLetterUrl ? 'Verified & On File' : 'Pending Document Upload'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
            {details?.offerLetterUrl ? (
              <a
                href={details.offerLetterUrl}
                download={details.offerLetterName || 'Offer_Letter.pdf'}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Offer Letter
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground">Contact HR to upload</span>
            )}
          </div>
        </Card>
      </div>

      {/* Registered Payout Account */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border gap-2 mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Registered Payout Account (Bank & UPI)
            </h4>
          </div>
          <span className="text-[10px] text-muted-foreground">To update, please contact HR/Management</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase block">Bank Name</span>
            <strong className="text-foreground truncate block">{details?.bankName || 'Direct Transfer'}</strong>
          </div>
          <div>
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase block">Account Number</span>
            <strong className="text-foreground font-mono truncate block">{details?.bankAccountNo || 'On File'}</strong>
          </div>
          <div>
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase block">IFSC Code</span>
            <strong className="text-foreground font-mono truncate block">{details?.bankIfsc || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase block">Google Pay / UPI ID</span>
            <strong className="text-emerald-500 font-mono truncate block">
              {details?.upiId || 'Not Set'}
            </strong>
          </div>
        </div>
      </Card>

      {/* 2. OFFICIAL OFFER LETTER VIEWER */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Official Employment Appointment / Offer Letter
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Tech Ads Academy & ERP employment documentation
              </p>
            </div>
          </div>

          {details?.offerLetterUrl && (
            <Badge variant="success" className="text-[9.5px] font-extrabold uppercase py-0.5">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Document Verified
            </Badge>
          )}
        </div>

        {details?.offerLetterUrl ? (
          <div className="p-4 rounded-lg bg-muted-2 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary-soft text-primary border border-primary/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-foreground break-all">
                  {details.offerLetterName || 'Tech_Ads_Offer_Letter.pdf'}
                </h5>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Uploaded on {details.offerLetterUploadedAt ? new Date(details.offerLetterUploadedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long' }) : 'Joining'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={details.offerLetterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20 text-xs font-bold flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View in Browser
              </a>
              <a
                href={details.offerLetterUrl}
                download={details.offerLetterName || 'Offer_Letter.pdf'}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary text-white transition-colors text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-muted-2/40 border border-dashed border-border rounded-lg space-y-1">
            <p className="text-xs font-bold text-foreground">Offer Letter In Progress</p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Your official offer letter is currently being verified and uploaded by HR/Management. Once uploaded, you will be able to view and download it here at any time.
            </p>
          </div>
        )}
      </Card>

      {/* 3. SALARY INCREMENT & APPRAISAL HISTORY */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Salary Increment & Appraisal History ({details?.increments?.length || 0})
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Official career growth progression, salary appraisals, and revisions
              </p>
            </div>
          </div>

          {details?.increments && details.increments.length > 0 && (
            <Badge variant="indigo" className="text-[9.5px] font-extrabold uppercase py-0.5">
              <TrendingUp className="w-3 h-3 mr-1" />
              {details.increments.length} {details.increments.length === 1 ? 'Appraisal' : 'Appraisals'} Logged
            </Badge>
          )}
        </div>

        {details?.increments && details.increments.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted-2 uppercase text-[9.5px] font-extrabold tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Previous Salary</th>
                  <th className="py-2.5 px-3">Increment (+₹ / %)</th>
                  <th className="py-2.5 px-3">Revised Salary</th>
                  <th className="py-2.5 px-3">Appraisal Reason / Remarks</th>
                  <th className="py-2.5 px-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {details.increments.map((inc) => {
                  const incAmt = inc.increment_amount || (inc.new_salary - inc.previous_salary);
                  const isPositive = incAmt >= 0;
                  return (
                    <tr key={inc.id} className="hover:bg-muted-2/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {inc.effective_from ? new Date(inc.effective_from).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {formatCurrency(inc.previous_salary)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                          {isPositive ? `+${formatCurrency(incAmt)}` : formatCurrency(incAmt)}
                          {inc.increment_percentage !== undefined && (
                            <span className="text-[10px] font-normal opacity-80">
                              ({isPositive ? `+${inc.increment_percentage}%` : `${inc.increment_percentage}%`})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-foreground whitespace-nowrap">
                        {formatCurrency(inc.new_salary)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                        {inc.reason || 'Annual Appraisal'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {inc.approved_by || 'Managing Director'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-xs bg-muted-2/30 rounded-lg border border-dashed border-border space-y-1">
            <p className="font-semibold text-foreground">No Salary Increments Recorded Yet</p>
            <p className="text-[11px]">When management approves salary appraisals and increments for your profile, your complete revision history will appear here.</p>
          </div>
        )}
      </Card>

      {/* 4. MY MONTHLY PAYSLIPS */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                My Monthly Salary Payslips ({payslips.length})
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Formal printable payslips with attendance breakdown and deductions
              </p>
            </div>
          </div>
        </div>

        {payslips.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted-2 uppercase text-[9.5px] font-extrabold tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Base Pay</th>
                  <th className="py-2.5 px-3">Payable Days</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Disbursed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-muted-2/50 transition-colors">
                    <td className="py-2.5 px-3 font-extrabold text-foreground whitespace-nowrap">
                      {p.month_name}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {formatCurrency(p.base_salary)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <strong className="text-foreground">{p.payable_days}</strong> / {p.total_month_days}d
                    </td>
                    <td className="py-2.5 px-3 text-danger whitespace-nowrap">
                      -{formatCurrency((p.leave_deductions || 0) + (p.half_day_deductions || 0) + (p.other_deductions || 0))}
                    </td>
                    <td className="py-2.5 px-3 font-black text-emerald-400 whitespace-nowrap">
                      {formatCurrency(p.net_salary)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant={p.payment_status === 'DISBURSED' ? 'success' : 'indigo'} className="text-[8px] font-extrabold uppercase">
                        {p.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewingMonth(p.month_key)}
                        className="text-[10px] font-bold uppercase py-1 px-2.5 h-7"
                      >
                        <Printer className="w-3 h-3 mr-1" /> View / Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs bg-muted-2/30 rounded-lg border border-dashed border-border space-y-1">
            <p className="font-semibold text-foreground">No Monthly Payslips Generated Yet</p>
            <p className="text-[11px]">
              Payslips are automatically generated at month-end based on verified attendance logs.
            </p>
          </div>
        )}
      </Card>

      {/* 4. BANK DETAILS OVERVIEW */}
      <Card variant="glass" className="p-5 space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-primary" />
          Disbursement Bank Information
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
            <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase">Bank Name</span>
            <p className="font-bold text-foreground truncate">{details?.bankName || 'Not Set'}</p>
          </div>
          <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
            <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase">Account No</span>
            <p className="font-bold text-foreground font-mono truncate">{details?.bankAccountNo || 'Not Set'}</p>
          </div>
          <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
            <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase">IFSC Code</span>
            <p className="font-bold text-foreground font-mono truncate">{details?.bankIfsc || 'Not Set'}</p>
          </div>
          <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
            <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase">PAN Number</span>
            <p className="font-bold text-foreground font-mono truncate">{details?.panNumber || 'Not Set'}</p>
          </div>
        </div>
      </Card>

      {/* 5. PAYSLIP MODAL */}
      {viewingMonth && (
        <PayslipModal
          staffId={staffId}
          fullName={fullName}
          designation={activeStaff?.designation}
          initialMonth={viewingMonth}
          onClose={() => setViewingMonth(null)}
          isAdmin={false}
        />
      )}
    </div>
  );
};
