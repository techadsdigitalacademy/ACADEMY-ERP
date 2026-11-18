import React, { useState, useEffect, useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  ExternalLink, 
  Edit2, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  X, 
  FileCheck, 
  Printer, 
  Clock, 
  UserMinus, 
  RotateCcw, 
  GraduationCap, 
  Eye, 
  Calendar, 
  Users, 
  Star, 
  Check 
} from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { formatCurrency } from '../../services/mockData';
import { supabase } from '../../services/supabase';
import { 
  getStaffSalaryDetails, 
  updateStaffSalary, 
  addSalaryIncrement, 
  updateSalaryIncrement,
  deleteSalaryIncrement,
  uploadOfferLetter, 
  removeOfferLetter, 
  updateBankDetails,
  updateResignationDetails,
  updateTrainingDetails,
  getStaffPayslips,
  getStaffAttendanceLogs,
  CANONICAL_STAFF_ALIASES,
  syncRetroactiveDeletedIncrements,
  updateSalesManagerConfig
} from '../../services/salaryService';
import type { StaffSalaryDetails } from '../../services/salaryService';
import type { MonthlyPayslip, SalaryIncrement } from '../../types';
import { PayslipModal } from '../payslip/PayslipModal';
import { StaffSalaryPortal } from '../payslip/StaffSalaryPortal';
import { evaluateWorkingDayTraining } from '../../utils/payrollCalculator';
import { monthWindowStart } from '../../services/supabase';

interface SalaryHRTabProps {
  staffId: string;
  fullName: string;
  designation?: string;
  selectedMonth?: string;
}

export const SalaryHRTab: React.FC<SalaryHRTabProps> = ({
  staffId,
  fullName,
  designation = 'Staff Member',
  selectedMonth: _selectedMonth
}) => {
  const [details, setDetails] = useState<StaffSalaryDetails | null>(null);
  const [payslips, setPayslips] = useState<MonthlyPayslip[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isIncrementModalOpen, setIsIncrementModalOpen] = useState(false);
  const [isBaseSalaryModalOpen, setIsBaseSalaryModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isPreviewPortalOpen, setIsPreviewPortalOpen] = useState(false);
  const [selectedPayslipMonth, setSelectedPayslipMonth] = useState<string>(
    _selectedMonth || new Date().toISOString().substring(0, 7)
  );

  // Increment Form
  const [newSalaryInput, setNewSalaryInput] = useState('');
  const [effectiveFromInput, setEffectiveFromInput] = useState(new Date().toISOString().substring(0, 10));
  const [reasonInput, setReasonInput] = useState('');
  const [approvedByInput, setApprovedByInput] = useState('Managing Director');
  const [isSubmittingIncrement, setIsSubmittingIncrement] = useState(false);

  // Edit Increment Modal
  const [isEditIncrementModalOpen, setIsEditIncrementModalOpen] = useState(false);
  const [editingIncrement, setEditingIncrement] = useState<SalaryIncrement | null>(null);
  const [editPreviousSalaryInput, setEditPreviousSalaryInput] = useState('');
  const [editNewSalaryInput, setEditNewSalaryInput] = useState('');
  const [editEffectiveFromInput, setEditEffectiveFromInput] = useState('');
  const [editReasonInput, setEditReasonInput] = useState('');
  const [editApprovedByInput, setEditApprovedByInput] = useState('');
  const [isSubmittingEditIncrement, setIsSubmittingEditIncrement] = useState(false);
  const [isDeletingIncrementId, setIsDeletingIncrementId] = useState<string | null>(null);

  // Base Salary Form
  const [baseStartingSalary, setBaseStartingSalary] = useState('');
  const [baseCurrentSalary, setBaseCurrentSalary] = useState('');
  const [isSubmittingBase, setIsSubmittingBase] = useState(false);

  // Bank Form
  const [bankNameInput, setBankNameInput] = useState('');
  const [bankAccountInput, setBankAccountInput] = useState('');
  const [bankIfscInput, setBankIfscInput] = useState('');
  const [panNumberInput, setPanNumberInput] = useState('');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Resignation & Notice Period Form
  const [isResignationModalOpen, setIsResignationModalOpen] = useState(false);
  const [resignationStatusInput, setResignationStatusInput] = useState<'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED'>('ACTIVE');
  const [resignationDateInput, setResignationDateInput] = useState(new Date().toISOString().substring(0, 10));
  const [noticePeriodDaysInput, setNoticePeriodDaysInput] = useState<number>(30);
  const [lastWorkingDayInput, setLastWorkingDayInput] = useState('');
  const [resignationReasonInput, setResignationReasonInput] = useState('');
  const [isSubmittingResignation, setIsSubmittingResignation] = useState(false);

  // Training Period Form
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isTrainingInput, setIsTrainingInput] = useState(false);
  const [trainingStartDateInput, setTrainingStartDateInput] = useState(new Date().toISOString().substring(0, 10));
  const [trainingDurationDaysInput, setTrainingDurationDaysInput] = useState<number>(7);
  const [trainingCommissionRateInput, setTrainingCommissionRateInput] = useState<number>(10);
  const [isSubmittingTraining, setIsSubmittingTraining] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLetter, setIsUploadingLetter] = useState(false);

  // Sales Manager Designation & Team State
  const [isSalesManagerInput, setIsSalesManagerInput] = useState(false);
  const [assignedExecutiveIdsInput, setAssignedExecutiveIdsInput] = useState<string[]>([]);
  const [availableExecutivesList, setAvailableExecutivesList] = useState<any[]>([]);
  const [isUpdatingSalesManager, setIsUpdatingSalesManager] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const windowStart = monthWindowStart();
      const [data, sPayslips, attLogs] = await Promise.all([
        getStaffSalaryDetails(staffId, fullName),
        getStaffPayslips(staffId, fullName),
        getStaffAttendanceLogs(staffId, fullName, windowStart)
      ]);
      setDetails(data);
      setPayslips(sPayslips);
      setAttendanceLogs(attLogs || []);
      setBaseStartingSalary(data.startingSalary ? data.startingSalary.toString() : '0');
      setBaseCurrentSalary(data.currentSalary ? data.currentSalary.toString() : '0');
      setBankNameInput(data.bankName || '');
      setBankAccountInput(data.bankAccountNo || '');
      setBankIfscInput(data.bankIfsc || '');
      setPanNumberInput(data.panNumber || '');
      setUpiIdInput(data.upiId || '');
      setResignationStatusInput(data.resignationStatus || 'ACTIVE');
      setResignationDateInput(data.resignationDate || new Date().toISOString().substring(0, 10));
      setNoticePeriodDaysInput(data.noticePeriodDays || 30);
      setLastWorkingDayInput(data.lastWorkingDay || '');
      setResignationReasonInput(data.resignationReason || '');
      setIsTrainingInput(Boolean(data.isTraining));
      setTrainingStartDateInput(data.trainingStartDate || new Date().toISOString().substring(0, 10));
      setTrainingDurationDaysInput(data.trainingDurationDays || 7);
      setTrainingCommissionRateInput(data.trainingCommissionRate || 10);
      setIsSalesManagerInput(Boolean(data.isSalesManager));
      setAssignedExecutiveIdsInput(data.assignedExecutiveIds || []);

      // Fetch other eligible active staff for team assignment
      try {
        const { data: staffList } = await supabase
          .from('staff_profiles')
          .select('id, full_name, designation, status')
          .order('full_name', { ascending: true });
        if (staffList) {
          const eligible = staffList.filter((s: any) => 
            s.id !== staffId && 
            s.status !== 'resigned' && 
            s.status !== 'inactive' && 
            !['admin', 'althaf', 'shibili', 'ashif'].includes(s.full_name?.toLowerCase().trim())
          );
          setAvailableExecutivesList(eligible);
        }
      } catch (err) {
        console.warn('Failed to load eligible staff for assignment:', err);
      }
    } catch (e) {
      console.error('Failed to load salary details:', e);
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
      } else if (extra.action === 'add_increment' && extra.increment) {
        setDetails(prev => {
          if (!prev) return prev;
          const updated = [extra.increment, ...(prev.increments || []).filter(i => i.id !== extra.increment.id)];
          updated.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
          const newSal = extra.newSalary !== undefined ? extra.newSalary : extra.increment.new_salary;
          return {
            ...prev,
            currentSalary: newSal,
            increments: updated
          };
        });
      } else if (extra.action === 'remove_offer_letter') {
        setDetails(prev => prev ? {
          ...prev,
          offerLetterUrl: undefined,
          offerLetterName: undefined,
          offerLetterUploadedAt: undefined
        } : prev);
      } else if (extra.action === 'upload_offer_letter') {
        setDetails(prev => prev ? {
          ...prev,
          offerLetterUrl: extra.url,
          offerLetterName: extra.name,
          offerLetterUploadedAt: extra.uploadedAt
        } : prev);
      }
    };

    const handleSalaryChange = (e: any) => {
      const syncId = e?.detail?.staffId;
      const syncName = e?.detail?.fullName;
      if (isMatch(syncId, syncName)) {
        applyOptimisticUpdate(e?.detail?.extra);
        loadData(false);
      }
    };
    window.addEventListener('salary_data_changed', handleSalaryChange);
    window.addEventListener('payslip_data_changed', handleSalaryChange);
    window.addEventListener('staff_profiles_changed', handleSalaryChange);

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

    // Live Supabase Realtime channel
    const channel = supabase
      .channel(`admin_salary_tab_realtime_${staffId || fullName}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, (payload: any) => {
        const changedId = payload.new?.id || payload.old?.id;
        const changedName = payload.new?.full_name || payload.old?.full_name;
        if (isMatch(changedId, changedName)) {
          loadData(false);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('salary_data_changed', handleSalaryChange);
      window.removeEventListener('payslip_data_changed', handleSalaryChange);
      window.removeEventListener('staff_profiles_changed', handleSalaryChange);
      hrChannel?.close();
      supabase.removeChannel(channel);
    };
  }, [staffId, fullName]);

  // Handle Offer Letter Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please upload a smaller document.');
      return;
    }

    setIsUploadingLetter(true);
    try {
      await uploadOfferLetter({
        staffId,
        fullName,
        file
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to upload offer letter: ' + err.message);
    } finally {
      setIsUploadingLetter(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Remove Offer Letter
  const handleRemoveLetter = async () => {
    if (!confirm('Are you sure you want to remove the current offer letter document?')) return;
    
    // ZERO-LAG OPTIMISTIC UI: Remove offer letter immediately from state
    setDetails(prev => prev ? {
      ...prev,
      offerLetterUrl: undefined,
      offerLetterName: undefined,
      offerLetterUploadedAt: undefined
    } : prev);

    try {
      await removeOfferLetter(staffId, fullName);
      await loadData(false);
    } catch (err: any) {
      alert('Failed to remove offer letter: ' + err.message);
      await loadData(false);
    }
  };

  // Handle Add Increment
  const handleAddIncrementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numNewSalary = parseFloat(newSalaryInput);
    if (!numNewSalary || numNewSalary <= 0) {
      alert('Please enter a valid salary amount.');
      return;
    }

    const prevSalary = details?.currentSalary || details?.startingSalary || 0;
    if (numNewSalary <= prevSalary && !confirm(`The new salary (${formatCurrency(numNewSalary)}) is not higher than the current salary (${formatCurrency(prevSalary)}). Do you wish to proceed?`)) {
      return;
    }

    const tempInc: SalaryIncrement = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      staff_id: staffId,
      previous_salary: prevSalary,
      new_salary: numNewSalary,
      increment_amount: numNewSalary - prevSalary,
      increment_percentage: prevSalary > 0 ? parseFloat((((numNewSalary - prevSalary) / prevSalary) * 100).toFixed(2)) : 0,
      effective_from: effectiveFromInput,
      reason: reasonInput.trim() || 'Salary Appraisal',
      approved_by: approvedByInput.trim() || 'Managing Director',
      created_at: new Date().toISOString()
    };

    setIsIncrementModalOpen(false);
    setNewSalaryInput('');
    setReasonInput('');
    setDetails(prev => {
      if (!prev) return prev;
      const list = [tempInc, ...(prev.increments || [])];
      list.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
      return {
        ...prev,
        currentSalary: list[0]?.new_salary ?? prev.startingSalary,
        increments: list
      };
    });

    setIsSubmittingIncrement(true);
    try {
      await addSalaryIncrement({
        staffId,
        fullName,
        previousSalary: prevSalary,
        newSalary: numNewSalary,
        effectiveFrom: effectiveFromInput,
        reason: reasonInput.trim() || 'Salary Appraisal',
        approvedBy: approvedByInput.trim() || 'Managing Director'
      });
      await loadData(false);
    } catch (err: any) {
      alert('Failed to record increment: ' + err.message);
      await loadData(false);
    } finally {
      setIsSubmittingIncrement(false);
    }
  };

  // Handle Open Edit Increment Modal
  const handleOpenEditIncrement = (inc: SalaryIncrement) => {
    setEditingIncrement(inc);
    setEditPreviousSalaryInput(inc.previous_salary.toString());
    setEditNewSalaryInput(inc.new_salary.toString());
    setEditEffectiveFromInput(inc.effective_from ? inc.effective_from.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setEditReasonInput(inc.reason || '');
    setEditApprovedByInput(inc.approved_by || 'Managing Director');
    setIsEditIncrementModalOpen(true);
  };

  // Handle Edit Increment Submit
  const handleEditIncrementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncrement) return;
    const numPrevSalary = parseFloat(editPreviousSalaryInput) || 0;
    const numNewSalary = parseFloat(editNewSalaryInput) || 0;
    if (!numNewSalary || numNewSalary <= 0) {
      alert('Please enter a valid revised salary amount.');
      return;
    }

    const updatedInc: SalaryIncrement = {
      ...editingIncrement,
      previous_salary: numPrevSalary,
      new_salary: numNewSalary,
      increment_amount: numNewSalary - numPrevSalary,
      increment_percentage: numPrevSalary > 0 ? parseFloat((((numNewSalary - numPrevSalary) / numPrevSalary) * 100).toFixed(2)) : 0,
      effective_from: editEffectiveFromInput,
      reason: editReasonInput.trim() || 'Salary Appraisal',
      approved_by: editApprovedByInput.trim() || 'Managing Director'
    };

    setIsEditIncrementModalOpen(false);
    setEditingIncrement(null);
    setDetails(prev => {
      if (!prev) return prev;
      const list = (prev.increments || []).map(i => i.id === editingIncrement.id ? updatedInc : i);
      list.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
      return {
        ...prev,
        currentSalary: list[0]?.new_salary ?? prev.startingSalary,
        increments: list
      };
    });

    setIsSubmittingEditIncrement(true);
    try {
      await updateSalaryIncrement({
        staffId,
        fullName,
        incrementId: editingIncrement.id,
        previousSalary: numPrevSalary,
        newSalary: numNewSalary,
        effectiveFrom: editEffectiveFromInput,
        reason: editReasonInput.trim() || 'Salary Appraisal',
        approvedBy: editApprovedByInput.trim() || 'Managing Director'
      });
      await loadData(false);
    } catch (err: any) {
      alert('Failed to update increment: ' + err.message);
      await loadData(false);
    } finally {
      setIsSubmittingEditIncrement(false);
    }
  };

  // Handle Delete Increment
  const handleDeleteIncrement = async (inc: SalaryIncrement) => {
    const incAmt = inc.increment_amount || (inc.new_salary - inc.previous_salary);
    const confirmMsg = `Are you sure you want to delete this increment of ${formatCurrency(incAmt)} (Revised to: ${formatCurrency(inc.new_salary)}) from ${inc.effective_from || 'N/A'}?

The employee's Current Active Salary will be automatically recalculated based on the remaining increment history.`;
    if (!confirm(confirmMsg)) return;

    setDetails(prev => {
      if (!prev) return prev;
      const remaining = (prev.increments || []).filter(i => i.id !== inc.id);
      remaining.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
      return {
        ...prev,
        currentSalary: remaining.length > 0 ? remaining[0].new_salary : prev.startingSalary,
        increments: remaining
      };
    });

    setIsDeletingIncrementId(inc.id);
    try {
      await deleteSalaryIncrement({
        staffId,
        fullName,
        incrementId: inc.id
      });
      await loadData(false);
    } catch (err: any) {
      alert('Failed to delete increment: ' + err.message);
      await loadData(false);
    } finally {
      setIsDeletingIncrementId(null);
    }
  };

  // Handle Base Salary Update
  const handleBaseSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBase(true);
    try {
      await updateStaffSalary({
        staffId,
        fullName,
        startingSalary: parseFloat(baseStartingSalary) || 0,
        currentSalary: parseFloat(baseCurrentSalary) || 0
      });
      setIsBaseSalaryModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update salary: ' + err.message);
    } finally {
      setIsSubmittingBase(false);
    }
  };

  // Handle Bank Details Update
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBank(true);
    try {
      await updateBankDetails({
        staffId,
        fullName,
        bankName: bankNameInput.trim(),
        bankAccountNo: bankAccountInput.trim(),
        bankIfsc: bankIfscInput.trim().toUpperCase(),
        panNumber: panNumberInput.trim().toUpperCase(),
        upiId: upiIdInput.trim()
      });
      setIsBankModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update bank details: ' + err.message);
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Resignation & Notice Period calculation helpers
  const calculateLastWorkingDay = (startDateStr: string, days: number): string => {
    try {
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + days);
      return d.toISOString().substring(0, 10);
    } catch {
      return '';
    }
  };

  const computeNoticeRemaining = (lastDayStr?: string) => {
    if (!lastDayStr) return null;
    const target = new Date(lastDayStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleResignationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingResignation(true);
    try {
      const finalLastWorkingDay = lastWorkingDayInput || calculateLastWorkingDay(resignationDateInput, Number(noticePeriodDaysInput) || 30);
      await updateResignationDetails({
        staffId,
        fullName,
        resignationStatus: resignationStatusInput,
        resignationDate: resignationDateInput,
        noticePeriodDays: Number(noticePeriodDaysInput) || 30,
        lastWorkingDay: finalLastWorkingDay,
        resignationReason: resignationReasonInput.trim()
      });
      setIsResignationModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update resignation details: ' + err.message);
    } finally {
      setIsSubmittingResignation(false);
    }
  };

  const handleMarkRelieved = async () => {
    const confirmed = window.confirm(`Mark ${fullName} as officially Relieved / Resigned?\n\nThis will mark their status as RESIGNED.`);
    if (!confirmed) return;
    try {
      await updateResignationDetails({
        staffId,
        fullName,
        resignationStatus: 'RESIGNED',
        resignationDate: details?.resignationDate || new Date().toISOString().substring(0, 10),
        noticePeriodDays: details?.noticePeriodDays || 30,
        lastWorkingDay: new Date().toISOString().substring(0, 10),
        resignationReason: details?.resignationReason || 'Completed notice period.'
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to relieve staff member: ' + err.message);
    }
  };

  const handleRevokeResignation = async () => {
    const confirmed = window.confirm(`Revoke resignation for ${fullName} and restore Active Full-Time employment?`);
    if (!confirmed) return;
    try {
      await updateResignationDetails({
        staffId,
        fullName,
        resignationStatus: 'ACTIVE',
        resignationDate: undefined,
        noticePeriodDays: 30,
        lastWorkingDay: undefined,
        resignationReason: undefined
      });
      await loadData();
    } catch (err: any) {
      alert('Failed to restore active employment: ' + err.message);
    }
  };

  const handleToggleSalesManager = async (newVal: boolean) => {
    setIsSalesManagerInput(newVal);
    setIsUpdatingSalesManager(true);
    try {
      await updateSalesManagerConfig(staffId, fullName, {
        isSalesManager: newVal,
        assignedExecutiveIds: assignedExecutiveIdsInput
      });
      setDetails(prev => prev ? {
        ...prev,
        isSalesManager: newVal
      } : prev);
    } catch (err: any) {
      alert('Failed to update Sales Manager designation: ' + (err.message || 'Error occurred'));
      setIsSalesManagerInput(!newVal);
    } finally {
      setIsUpdatingSalesManager(false);
    }
  };

  const handleToggleExecutiveAssignment = async (execId: string) => {
    const isCurrentlyAssigned = assignedExecutiveIdsInput.includes(execId);
    const updatedIds = isCurrentlyAssigned
      ? assignedExecutiveIdsInput.filter(id => id !== execId)
      : [...assignedExecutiveIdsInput, execId];

    setAssignedExecutiveIdsInput(updatedIds);
    setIsUpdatingSalesManager(true);
    try {
      await updateSalesManagerConfig(staffId, fullName, {
        isSalesManager: isSalesManagerInput,
        assignedExecutiveIds: updatedIds
      });
      setDetails(prev => prev ? {
        ...prev,
        assignedExecutiveIds: updatedIds
      } : prev);
    } catch (err: any) {
      alert('Failed to update assigned executives: ' + (err.message || 'Error occurred'));
    } finally {
      setIsUpdatingSalesManager(false);
    }
  };

  const handleAssignAllExecutives = async () => {
    const updatedIds: string[] = []; // empty array means "All Active Executives"
    setAssignedExecutiveIdsInput(updatedIds);
    setIsUpdatingSalesManager(true);
    try {
      await updateSalesManagerConfig(staffId, fullName, {
        isSalesManager: isSalesManagerInput,
        assignedExecutiveIds: updatedIds
      });
      setDetails(prev => prev ? {
        ...prev,
        assignedExecutiveIds: updatedIds
      } : prev);
    } catch (err: any) {
      alert('Failed to update assigned executives: ' + (err.message || 'Error occurred'));
    } finally {
      setIsUpdatingSalesManager(false);
    }
  };

  const handleTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTraining(true);
    try {
      await updateTrainingDetails({
        staffId,
        fullName,
        isTraining: isTrainingInput,
        trainingStartDate: isTrainingInput ? trainingStartDateInput : undefined,
        trainingEndDate: isTrainingInput ? (trainingProgress.trainingEndDate || undefined) : undefined,
        trainingDurationDays: isTrainingInput ? (Number(trainingDurationDaysInput) || 7) : undefined,
        trainingCommissionRate: isTrainingInput ? (Number(trainingCommissionRateInput) || 10) : undefined
      });
      setIsTrainingModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update training details: ' + err.message);
    } finally {
      setIsSubmittingTraining(false);
    }
  };

  if (isLoading && !details) {
    return (
      <Card variant="glass" className="p-8 text-center text-muted-foreground animate-pulse">
        Loading salary, offer letter, and HR configuration...
      </Card>
    );
  }

  const startingSalary = details?.startingSalary || 0;
  const currentSalary = details?.currentSalary || 0;
  const totalGrowth = currentSalary - startingSalary;
  const growthPercent = startingSalary > 0 ? ((totalGrowth / startingSalary) * 100).toFixed(1) : '0';
  const noticeRemaining = computeNoticeRemaining(details?.lastWorkingDay);

  // Evaluate working-day based training progress live
  const trainingProgress = evaluateWorkingDayTraining({
    isTraining: details?.isTraining,
    trainingStartDate: details?.trainingStartDate,
    targetWorkingDays: details?.trainingDurationDays || 7,
    attendanceLogs,
    weeklyOffDay: 'Sunday'
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. TOP SALARY & GROWTH METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Active Salary */}
        <Card variant="glass" glowColor="emerald" className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Current Active Salary
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

        {/* Starting / Baseline Salary */}
        <Card variant="glass" glowColor="indigo" className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Starting / Base Salary
            </span>
            <button 
              onClick={() => setIsBaseSalaryModalOpen(true)}
              className="p-1.5 rounded-lg bg-muted-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border"
              title="Edit Baseline Salary"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(startingSalary)}
            <span className="text-xs font-semibold text-muted-foreground ml-1.5">/ month</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2.5 border-t border-border">
            <span>Staff Designation:</span>
            <strong className="text-foreground">{designation}</strong>
          </div>
        </Card>

        {/* Total Salary Increments & Action */}
        <Card variant="glass" glowColor="indigo" className="p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Salary Appraisals & Growth
              </span>
              <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-black text-foreground">
                {totalGrowth >= 0 ? `+${formatCurrency(totalGrowth)}` : formatCurrency(totalGrowth)}
              </div>
              {startingSalary > 0 && totalGrowth !== 0 && (
                <span className={`text-xs font-black px-1.5 py-0.5 rounded ${totalGrowth > 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                  {totalGrowth > 0 ? `+${growthPercent}%` : `${growthPercent}%`}
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {details?.increments.length || 0} Increment{(details?.increments.length || 0) === 1 ? '' : 's'} Logged
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setNewSalaryInput(currentSalary > 0 ? (currentSalary + 5000).toString() : '25000');
                setIsIncrementModalOpen(true);
              }}
              className="text-[10px] font-extrabold uppercase tracking-wider py-1 px-2.5 h-7"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Increment
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. EMPLOYMENT & NOTICE PERIOD STATUS */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              details?.resignationStatus === 'SERVING_NOTICE'
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : details?.resignationStatus === 'RESIGNED'
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {details?.resignationStatus === 'SERVING_NOTICE' ? (
                <Clock className="w-4 h-4 animate-pulse" />
              ) : details?.resignationStatus === 'RESIGNED' ? (
                <UserMinus className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Employment & Notice Period Status
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Track resignation submissions, notice period countdowns, and relieving dates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {details?.resignationStatus === 'SERVING_NOTICE' ? (
              <Badge variant="warning" className="text-[10px] font-extrabold uppercase py-1 px-2.5">
                <Clock className="w-3 h-3 mr-1" /> Serving Notice ({noticeRemaining !== null ? `${noticeRemaining}d left` : 'Active'})
              </Badge>
            ) : details?.resignationStatus === 'RESIGNED' ? (
              <Badge variant="error" className="text-[10px] font-extrabold uppercase py-1 px-2.5">
                <UserMinus className="w-3 h-3 mr-1" /> Resigned & Relieved
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px] font-extrabold uppercase py-1 px-2.5">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Active Full-Time
              </Badge>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setResignationStatusInput(details?.resignationStatus || 'SERVING_NOTICE');
                setResignationDateInput(details?.resignationDate || new Date().toISOString().substring(0, 10));
                setNoticePeriodDaysInput(details?.noticePeriodDays || 30);
                setLastWorkingDayInput(details?.lastWorkingDay || calculateLastWorkingDay(details?.resignationDate || new Date().toISOString().substring(0, 10), details?.noticePeriodDays || 30));
                setResignationReasonInput(details?.resignationReason || '');
                setIsResignationModalOpen(true);
              }}
              className="text-[10px] font-bold uppercase py-1 px-2.5 h-7"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {details?.resignationStatus === 'SERVING_NOTICE' ? 'Edit Notice' : details?.resignationStatus === 'RESIGNED' ? 'Update Status' : 'Log Resignation'}
            </Button>
          </div>
        </div>

        {details?.resignationStatus === 'SERVING_NOTICE' ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
                  Notice Period in Progress
                </span>
                <div className="text-xl font-black text-foreground flex items-center gap-2">
                  <span>{noticeRemaining !== null ? (noticeRemaining > 0 ? `${noticeRemaining} Days Remaining` : noticeRemaining === 0 ? 'Today is the Final Working Day' : `Notice Period Ended (${-noticeRemaining} days ago)`) : 'Notice Period Active'}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    (Total: {details.noticePeriodDays || 30} Days)
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[9.5px] font-bold uppercase text-muted-foreground block">Expected Last Working Day</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {details.lastWorkingDay ? new Date(details.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'To Be Decided'}
                </span>
              </div>
            </div>

            {/* Notice countdown progress bar */}
            {details.noticePeriodDays && details.resignationDate && (
              <div className="space-y-1">
                <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, (((details.noticePeriodDays - (noticeRemaining || 0)) / details.noticePeriodDays) * 100)))}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>Submitted: {details.resignationDate}</span>
                  <span>Relieving Date: {details.lastWorkingDay}</span>
                </div>
              </div>
            )}

            {details.resignationReason && (
              <div className="text-xs bg-card/60 p-2.5 rounded border border-border">
                <span className="font-bold text-muted-foreground text-[10px] uppercase block mb-0.5">Handover & Resignation Remarks:</span>
                <p className="text-foreground italic">{details.resignationReason}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
              <Button
                size="sm"
                variant="primary"
                onClick={handleMarkRelieved}
                className="text-[10px] font-bold uppercase bg-rose-600 hover:bg-rose-500 text-white h-7 py-1 px-3"
              >
                <UserMinus className="w-3 h-3 mr-1" /> Mark Relieved / Resigned
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRevokeResignation}
                className="text-[10px] font-bold uppercase h-7 py-1 px-3"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Revoke / Cancel Resignation
              </Button>
            </div>
          </div>
        ) : details?.resignationStatus === 'RESIGNED' ? (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                Former Staff Member (Relieved)
              </span>
              <p className="text-xs text-foreground mt-0.5">
                Staff member completed notice period and was officially relieved on <strong>{details.lastWorkingDay || details.resignationDate || 'N/A'}</strong>.
              </p>
              {details.resignationReason && (
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  Reason: "{details.resignationReason}"
                </p>
              )}
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleRevokeResignation}
              className="text-[10px] font-bold uppercase h-7 py-1 px-3 shrink-0"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reactivate Employment
            </Button>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted-2 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Employee is actively on duty with no pending resignation notices.</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Standard Notice: {details?.noticePeriodDays || 30} Days
            </span>
          </div>
        )}
      </Card>

      {/* 2.5 SALES MANAGEMENT ROLE & TEAM ASSIGNMENT */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isSalesManagerInput
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-muted-2 text-muted-foreground border-border'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Sales Management Designation & Team Assignment
                </h4>
                {isSalesManagerInput && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active Manager
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Designate this staff member as a Sales Manager to dynamically activate their Team Sales Terminal and track executive targets & spillover.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdatingSalesManager}
              onClick={() => handleToggleSalesManager(!isSalesManagerInput)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isSalesManagerInput
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-muted-2 text-muted-foreground hover:text-foreground border border-border hover:bg-muted'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isSalesManagerInput ? 'fill-white' : ''}`} />
              <span>{isSalesManagerInput ? 'Sales Manager Role Active' : 'Assign Sales Manager Role'}</span>
            </button>
          </div>
        </div>

        {isSalesManagerInput ? (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs text-foreground">
                  <strong>{fullName}</strong> is actively designated as a Sales Manager.
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                Live Terminal Enabled
              </span>
            </div>

            {/* Team Assignment Sub-section */}
            <div className="space-y-2.5 bg-card/60 p-4 rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div>
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Assigned Staff Executives
                  </h5>
                  <p className="text-[10px] text-muted-foreground">
                    Choose which active staff report to this manager. Leaving unselected automatically tracks all active staff.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAssignAllExecutives}
                    className={`text-[10.5px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                      assignedExecutiveIdsInput.length === 0
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted-2 text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    Track All Active Staff ({availableExecutivesList.length})
                  </button>
                </div>
              </div>

              {availableExecutivesList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No other active staff found in the directory.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                  {availableExecutivesList.map((exec: any) => {
                    const isExplicitlyChecked = assignedExecutiveIdsInput.includes(exec.id);

                    return (
                      <button
                        key={exec.id}
                        type="button"
                        onClick={() => handleToggleExecutiveAssignment(exec.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isExplicitlyChecked
                            ? 'bg-primary/10 border-primary/50 text-foreground'
                            : assignedExecutiveIdsInput.length === 0
                              ? 'bg-card border-border text-foreground hover:border-primary/40'
                              : 'bg-muted-2/40 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold truncate block">{exec.full_name}</span>
                          <span className="text-[9.5px] text-muted-foreground truncate block">{exec.designation || 'Staff'}</span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isExplicitlyChecked || assignedExecutiveIdsInput.length === 0
                            ? 'bg-primary text-white border-primary'
                            : 'border-border bg-card'
                        }`}>
                          {(isExplicitlyChecked || assignedExecutiveIdsInput.length === 0) && (
                            <Check className="w-3 h-3 stroke-[3]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted-2 border border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Standard staff member profile (Sales Terminal not active). Toggle to grant Sales Manager privileges.
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Role: {designation}</span>
          </div>
        )}
      </Card>

      {/* 3. TRAINING PERIOD & COMMISSION (NEW STAFF) */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              details?.isTraining
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : 'bg-muted-2 text-muted-foreground border-border'
            }`}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Training Period & Sales Commission (New Staff)
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Waive fixed base salary during training days and credit 10% commission on sales closed during training
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {details?.isTraining ? (
              <Badge variant={trainingProgress.isCompleted ? 'success' : 'indigo'} className="text-[10px] font-extrabold uppercase py-1 px-2.5">
                <GraduationCap className="w-3.5 h-3.5 mr-1" />
                {trainingProgress.isCompleted
                  ? `Training Completed (${trainingProgress.targetWorkingDays} Working Days)`
                  : `Training In Progress (${trainingProgress.completedWorkingDays}/${trainingProgress.targetWorkingDays} Days • ${trainingProgress.remainingWorkingDays}d left)`}
              </Badge>
            ) : (
              <Badge variant="info" className="text-[10px] font-extrabold uppercase py-1 px-2.5">
                Standard Full-Time
              </Badge>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsTrainingInput(Boolean(details?.isTraining));
                setTrainingStartDateInput(details?.trainingStartDate || new Date().toISOString().substring(0, 10));
                setTrainingDurationDaysInput(details?.trainingDurationDays || 7);
                setTrainingCommissionRateInput(details?.trainingCommissionRate || 10);
                setIsTrainingModalOpen(true);
              }}
              className="text-[10px] font-bold uppercase py-1 px-2.5 h-7"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {details?.isTraining ? 'Edit Training Policy' : 'Configure Training'}
            </Button>
          </div>
        </div>

        {details?.isTraining ? (
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/25 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-md bg-card/60 border border-purple-500/20">
                <span className="text-[9.5px] font-bold uppercase text-purple-400 block mb-0.5">Target Working Days</span>
                <span className="font-extrabold text-foreground text-sm">{details.trainingDurationDays || 7} Working Days</span>
              </div>
              <div className="p-3 rounded-md bg-card/60 border border-purple-500/20">
                <span className="text-[9.5px] font-bold uppercase text-purple-400 block mb-0.5">Office Attendance</span>
                <span className="font-extrabold text-foreground text-sm">
                  {trainingProgress.completedWorkingDays} / {trainingProgress.targetWorkingDays} Days
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    ({trainingProgress.isCompleted ? 'Completed' : `${trainingProgress.remainingWorkingDays}d left`})
                  </span>
                </span>
              </div>
              <div className="p-3 rounded-md bg-card/60 border border-purple-500/20">
                <span className="text-[9.5px] font-bold uppercase text-purple-400 block mb-0.5">Sales Commission</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {details.trainingCommissionRate || 10}% on closed deals
                </span>
              </div>
              <div className="p-3 rounded-md bg-card/60 border border-purple-500/20">
                <span className="text-[9.5px] font-bold uppercase text-purple-400 block mb-0.5">Base Salary</span>
                <span className="font-bold text-amber-400 text-xs">Waived during training</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              📌 Training is measured strictly in actual working days where the employee's attendance status is 'PRESENT' (or completed shift). Sundays/Weekly Offs and unapproved leaves do not count and automatically extend the training period until all {details.trainingDurationDays || 7} working days in office are completed.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-muted-2 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Standard employment active. Full monthly base salary is applied without training waiver.</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Commission: Standard CRM Rate
            </span>
          </div>
        )}
      </Card>

      {/* 4. OFFER LETTER & BANKING DETAILS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Offer Letter Card */}
        <Card variant="glass" className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Employment Offer Letter
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Official signed document viewable in staff portal
                </p>
              </div>
            </div>

            {details?.offerLetterUrl && (
              <Badge variant="success" className="text-[9.5px] font-extrabold uppercase py-0.5">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Verified On File
              </Badge>
            )}
          </div>

          {details?.offerLetterUrl ? (
            <div className="p-4 rounded-lg bg-muted-2 border border-border space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary-soft text-primary border border-primary/20">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-foreground break-all max-w-[240px] sm:max-w-xs">
                      {details.offerLetterName || 'Staff_Offer_Letter.pdf'}
                    </h5>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Uploaded: {details.offerLetterUploadedAt ? new Date(details.offerLetterUploadedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : 'Recently'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={details.offerLetterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
                    title="Open Document in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={handleRemoveLetter}
                    className="p-2 rounded-lg bg-danger-soft hover:bg-danger text-danger hover:text-white transition-colors border border-danger/20"
                    title="Remove Offer Letter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border text-[11px]">
                <a
                  href={details.offerLetterUrl}
                  download={details.offerLetterName || 'Offer_Letter.pdf'}
                  className="text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Direct Download
                </a>
                <label className="text-muted-foreground hover:text-foreground cursor-pointer font-semibold flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Replace Document
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploadingLetter}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-3 bg-muted-2/40">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">No Offer Letter Uploaded</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                  Upload staff appointment/offer letter (PDF, DOC, or Image up to 10MB) to enable staff portal downloads.
                </p>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isUploadingLetter}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold uppercase tracking-wider"
                >
                  {isUploadingLetter ? 'Uploading...' : 'Choose Document'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Banking & Payout Account Card */}
        <Card variant="glass" className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Disbursement & Banking Details
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Direct transfer information for month-end payslips
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsBankModalOpen(true)}
              className="text-[10px] font-bold uppercase py-1 px-2.5 h-7"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {details?.bankAccountNo ? 'Edit Info' : 'Add Info'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
              <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3 text-primary" /> Bank Name
              </span>
              <p className="font-bold text-foreground truncate">{details?.bankName || 'Not Set'}</p>
            </div>

            <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
              <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-primary" /> Account Number
              </span>
              <p className="font-bold text-foreground font-mono truncate">{details?.bankAccountNo || 'Not Set'}</p>
            </div>

            <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
              <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" /> IFSC Code
              </span>
              <p className="font-bold text-foreground font-mono truncate">{details?.bankIfsc || 'Not Set'}</p>
            </div>

            <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
              <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary" /> PAN Number
              </span>
              <p className="font-bold text-foreground font-mono truncate">{details?.panNumber || 'Not Set'}</p>
            </div>

            <div className="col-span-2 p-3 rounded-md bg-muted-2 border border-border space-y-1">
              <span className="text-[9.5px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-emerald-500" /> Google Pay / UPI ID
                </span>
                {details?.upiId && (
                  <Badge variant="success" className="text-[8.5px] py-0 px-1.5 font-bold">SET</Badge>
                )}
              </span>
              <p className="font-bold text-foreground font-mono truncate text-emerald-500">
                {details?.upiId || <span className="text-muted-foreground font-normal italic">Not Set (Direct Bank Transfer only)</span>}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. SALARY INCREMENT AUDIT TRAIL */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Salary Increment & Appraisal Log ({details?.increments.length || 0})
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Historical record of all raises, revisions, and effective dates
              </p>
            </div>
          </div>
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
                  <th className="py-2.5 px-3">Reason / Appraisal Note</th>
                  <th className="py-2.5 px-3">Approved By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
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
                        {inc.reason || 'Appraisal'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {inc.approved_by || 'Managing Director'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditIncrement(inc)}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit this increment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncrement(inc)}
                            disabled={isDeletingIncrementId === inc.id}
                            className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors disabled:opacity-50"
                            title="Delete this increment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs bg-muted-2/30 rounded-lg border border-dashed border-border space-y-1">
            <p className="font-semibold text-foreground">No Salary Increments Recorded Yet</p>
            <p className="text-[11px]">Use the "Add Increment" button above whenever this employee receives a salary revision.</p>
          </div>
        )}
      </Card>

      {/* 4. MONTH-END AUTOMATED PAYSLIPS & DISBURSEMENTS */}
      <Card variant="glass" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                Automated Month-End Payslips ({payslips.length})
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Attendance-linked net salary calculations & disbursement ledgers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
              <input 
                type="month"
                value={selectedPayslipMonth}
                onChange={(e) => setSelectedPayslipMonth(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary dark:[color-scheme:dark] [color-scheme:light] cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                title="Select payslip month"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsPreviewPortalOpen(true)}
              className="text-xs font-bold uppercase tracking-wider"
              title="Preview employee's real-time Staff Portal view"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5 text-primary" />
              Preview Staff View
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsPayslipModalOpen(true)}
              className="text-xs font-bold uppercase tracking-wider"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Generate / Preview Payslip
            </Button>
          </div>
        </div>

        {payslips.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted-2 uppercase text-[9.5px] font-extrabold tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Base Salary</th>
                  <th className="py-2.5 px-3">Payable Days</th>
                  <th className="py-2.5 px-3">Deductions</th>
                  <th className="py-2.5 px-3">Net Disbursable</th>
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
                        onClick={() => {
                          setSelectedPayslipMonth(p.month_key);
                          setIsPayslipModalOpen(true);
                        }}
                        className="text-[10px] font-bold uppercase py-1 px-2.5 h-7"
                      >
                        <Printer className="w-3 h-3 mr-1" /> View / Print
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-xs bg-muted-2/30 rounded-lg border border-dashed border-border space-y-1">
            <p className="font-semibold text-foreground">No Payslips Generated Yet For This Staff</p>
            <p className="text-[11px]">Click "Generate / Preview Payslip" above to compute attendance-based net salary for any month.</p>
          </div>
        )}
      </Card>

      {/* 5. MODALS */}
      {/* ADD INCREMENT MODAL */}
      {isIncrementModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Add Salary Increment / Appraisal
              </h3>
              <button 
                onClick={() => setIsIncrementModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIncrementSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-md bg-muted-2 border border-border flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">Current Salary:</span>
                <span className="font-black text-foreground">{formatCurrency(currentSalary)} / mo</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  New Revised Salary (₹ / month) *
                </label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="500"
                  value={newSalaryInput}
                  onChange={(e) => setNewSalaryInput(e.target.value)}
                  placeholder="e.g. 30000"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-bold text-sm focus:outline-none focus:border-primary"
                />
                {newSalaryInput && (
                  <p className="text-[10px] text-primary font-semibold mt-1">
                    Difference: {parseFloat(newSalaryInput) >= currentSalary ? '+' : ''}
                    {formatCurrency((parseFloat(newSalaryInput) || 0) - currentSalary)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Effective Date *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
                  <input 
                    type="date" 
                    required
                    value={effectiveFromInput}
                    onChange={(e) => setEffectiveFromInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary dark:[color-scheme:dark] [color-scheme:light]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Appraisal Reason / Performance Note
                </label>
                <input 
                  type="text" 
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Annual Appraisal, Senior Promotion, Target Achievement"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Approved By
                </label>
                <input 
                  type="text" 
                  value={approvedByInput}
                  onChange={(e) => setApprovedByInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => setIsIncrementModalOpen(false)}
                  disabled={isSubmittingIncrement}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingIncrement}
                >
                  {isSubmittingIncrement ? 'Recording...' : 'Apply Increment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SALARY INCREMENT MODAL */}
      {isEditIncrementModalOpen && editingIncrement && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                Edit Salary Increment Record
              </h3>
              <button 
                onClick={() => {
                  setIsEditIncrementModalOpen(false);
                  setEditingIncrement(null);
                }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditIncrementSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-muted-2 rounded-lg border border-border/60 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold">Staff Member:</span>
                  <span className="font-bold text-foreground">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Original Increment ID:</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{editingIncrement.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Previous Salary (₹)
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    value={editPreviousSalaryInput}
                    onChange={(e) => setEditPreviousSalaryInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-bold text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Revised Salary (₹) *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="500"
                    value={editNewSalaryInput}
                    onChange={(e) => setEditNewSalaryInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-bold text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {editNewSalaryInput && editPreviousSalaryInput && (
                <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Increment Difference:</span>
                  <span className="font-bold text-primary">
                    {parseFloat(editNewSalaryInput) >= parseFloat(editPreviousSalaryInput) ? '+' : ''}
                    {formatCurrency(parseFloat(editNewSalaryInput) - parseFloat(editPreviousSalaryInput))}
                    {parseFloat(editPreviousSalaryInput) > 0 && (
                      <span className="ml-1 text-[11px] font-normal opacity-80">
                        ({(((parseFloat(editNewSalaryInput) - parseFloat(editPreviousSalaryInput)) / parseFloat(editPreviousSalaryInput)) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Effective Date *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
                  <input 
                    type="date" 
                    required
                    value={editEffectiveFromInput}
                    onChange={(e) => setEditEffectiveFromInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary dark:[color-scheme:dark] [color-scheme:light]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Appraisal Reason / Note
                </label>
                <input 
                  type="text" 
                  value={editReasonInput}
                  onChange={(e) => setEditReasonInput(e.target.value)}
                  placeholder="e.g. Annual Appraisal, Promotion"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Approved By
                </label>
                <input 
                  type="text" 
                  value={editApprovedByInput}
                  onChange={(e) => setEditApprovedByInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => {
                    setIsEditIncrementModalOpen(false);
                    setEditingIncrement(null);
                  }}
                  disabled={isSubmittingEditIncrement}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingEditIncrement}
                >
                  {isSubmittingEditIncrement ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BASELINE SALARY MODAL */}
      {isBaseSalaryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Configure Baseline & Current Salary
              </h3>
              <button 
                onClick={() => setIsBaseSalaryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBaseSalarySubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Starting / Joining Salary (₹ / month) *
                </label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={baseStartingSalary}
                  onChange={(e) => setBaseStartingSalary(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground">Original joining CTC specified in employee's offer letter.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Current Active Salary (₹ / month) *
                </label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={baseCurrentSalary}
                  onChange={(e) => setBaseCurrentSalary(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground">The active monthly salary used for automated payslip calculations.</p>
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => setIsBaseSalaryModalOpen(false)}
                  disabled={isSubmittingBase}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingBase}
                >
                  {isSubmittingBase ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BANK DETAILS MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Disbursement & Bank Information
              </h3>
              <button 
                onClick={() => setIsBankModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBankSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Bank Name
                </label>
                <input 
                  type="text" 
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  placeholder="e.g. Federal Bank, HDFC, SBI"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Account Number
                </label>
                <input 
                  type="text" 
                  value={bankAccountInput}
                  onChange={(e) => setBankAccountInput(e.target.value)}
                  placeholder="e.g. 12340100123456"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    IFSC Code
                  </label>
                  <input 
                    type="text" 
                    value={bankIfscInput}
                    onChange={(e) => setBankIfscInput(e.target.value.toUpperCase())}
                    placeholder="e.g. FDRL0001234"
                    className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-mono uppercase focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    PAN Number
                  </label>
                  <input 
                    type="text" 
                    value={panNumberInput}
                    onChange={(e) => setPanNumberInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-mono uppercase focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Google Pay / UPI ID</span>
                  <span className="text-[9px] text-muted-foreground font-normal lowercase">(Optional for direct UPI settlements)</span>
                </label>
                <input 
                  type="text" 
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value.trim())}
                  placeholder="e.g. 9876543210@okaxis or user@upi"
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => setIsBankModalOpen(false)}
                  disabled={isSubmittingBank}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingBank}
                >
                  {isSubmittingBank ? 'Saving...' : 'Save Bank Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resignation & Notice Period Modal */}
      {isResignationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Notice Period & Resignation Management
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {fullName} • {designation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsResignationModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResignationSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Employment Status
                </label>
                <select
                  value={resignationStatusInput}
                  onChange={(e) => {
                    const st = e.target.value as 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED';
                    setResignationStatusInput(st);
                    if (st === 'ACTIVE') {
                      setLastWorkingDayInput('');
                    } else if (!lastWorkingDayInput) {
                      setLastWorkingDayInput(calculateLastWorkingDay(resignationDateInput, Number(noticePeriodDaysInput) || 30));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="ACTIVE">Active Employment (Full-Time)</option>
                  <option value="SERVING_NOTICE">Serving Notice Period</option>
                  <option value="RESIGNED">Resigned & Relieved (Former Employee)</option>
                </select>
              </div>

              {resignationStatusInput !== 'ACTIVE' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Resignation Submission Date
                    </label>
                    <div className="relative flex items-center">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={resignationDateInput}
                        onChange={(e) => {
                          setResignationDateInput(e.target.value);
                          setLastWorkingDayInput(calculateLastWorkingDay(e.target.value, Number(noticePeriodDaysInput) || 30));
                        }}
                        className="w-full pl-8 pr-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary font-mono dark:[color-scheme:dark] [color-scheme:light]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Notice Period Duration
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">{noticePeriodDaysInput} Days</span>
                    </div>
                    <div className="flex gap-2">
                      {[15, 30, 45, 60, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => {
                            setNoticePeriodDaysInput(days);
                            setLastWorkingDayInput(calculateLastWorkingDay(resignationDateInput, days));
                          }}
                          className={`flex-1 py-1.5 text-[10px] font-extrabold rounded border transition-colors ${
                            noticePeriodDaysInput === days
                              ? 'bg-primary text-white border-primary'
                              : 'bg-muted-2 text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                    <input 
                      type="number"
                      min="1"
                      max="365"
                      value={noticePeriodDaysInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setNoticePeriodDaysInput(val);
                        setLastWorkingDayInput(calculateLastWorkingDay(resignationDateInput, val));
                      }}
                      placeholder="Custom days"
                      className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary mt-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Expected Last Working Day (Relieving Date)
                    </label>
                    <div className="relative flex items-center">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={lastWorkingDayInput}
                        onChange={(e) => setLastWorkingDayInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary font-mono dark:[color-scheme:dark] [color-scheme:light]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Reason / Handover Remarks
                    </label>
                    <textarea 
                      rows={3}
                      value={resignationReasonInput}
                      onChange={(e) => setResignationReasonInput(e.target.value)}
                      placeholder="e.g. Higher studies, career transition, client accounts handed over to..."
                      className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => setIsResignationModalOpen(false)}
                  disabled={isSubmittingResignation}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingResignation}
                >
                  {isSubmittingResignation ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Training Period Configuration Modal */}
      {isTrainingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    New Staff Training Period & Commission
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {fullName} • {designation}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsTrainingModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTrainingSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTrainingInput}
                    onChange={(e) => setIsTrainingInput(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="font-bold text-foreground text-xs block">
                      Enable Training Period Policy
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Waives fixed base salary during training working days and credits 10% commission on sales closed during training.
                    </span>
                  </div>
                </label>
              </div>

              {isTrainingInput && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Training Start Date *
                    </label>
                    <div className="relative flex items-center">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-primary pointer-events-none z-10" />
                      <input 
                        type="date" 
                        value={trainingStartDateInput}
                        onChange={(e) => setTrainingStartDateInput(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-md bg-card border border-border text-foreground focus:outline-none focus:border-primary font-mono dark:[color-scheme:dark] [color-scheme:light]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Target Duration (Working Days with PRESENT attendance) *
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">{trainingDurationDaysInput} Working Days</span>
                    </div>
                    <div className="flex gap-2">
                      {[7, 10, 14, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTrainingDurationDaysInput(days)}
                          className={`flex-1 py-1.5 text-[10px] font-extrabold rounded border transition-colors ${
                            trainingDurationDaysInput === days
                              ? 'bg-primary text-white border-primary'
                              : 'bg-muted-2 text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                    <input 
                      type="number"
                      min="1"
                      max="90"
                      value={trainingDurationDaysInput}
                      onChange={(e) => setTrainingDurationDaysInput(parseInt(e.target.value) || 0)}
                      placeholder="Custom working days (e.g. 7)"
                      className="w-full px-3 py-1.5 rounded-md bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary mt-1"
                    />
                  </div>

                  <div className="p-3 rounded-md bg-muted-2 border border-border space-y-1">
                    <span className="text-[9.5px] font-bold uppercase text-muted-foreground block">
                      Dynamic Attendance Auto-Extension Policy
                    </span>
                    <p className="text-[10.5px] text-foreground leading-relaxed">
                      📌 The training end date is <strong>not static</strong>. The system counts actual days with <strong>'PRESENT'</strong> attendance. Sundays/Weekly Offs and unapproved leaves do not count and automatically extend the training period until all <strong>{trainingDurationDaysInput || 7} working days</strong> in office are completed.
                    </p>
                    {trainingProgress.isCompleted && (
                      <p className="text-[10.5px] text-success font-semibold mt-1">
                        ✓ Currently Completed on: {trainingProgress.trainingEndDate} ({trainingProgress.targetWorkingDays} working days fulfilled).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Training Sales Commission Rate (%) *
                    </label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={trainingCommissionRateInput}
                        onChange={(e) => setTrainingCommissionRateInput(parseFloat(e.target.value) || 0)}
                        placeholder="10"
                        className="w-full px-3 py-2 rounded-md bg-card border border-border text-foreground font-mono text-xs focus:outline-none focus:border-primary font-bold pr-8"
                        required
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Default is 10% on total deals closed during training period.</p>
                  </div>
                </>
              )}

              <div className="pt-3 flex gap-3 border-t border-border">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1 text-xs"
                  onClick={() => setIsTrainingModalOpen(false)}
                  disabled={isSubmittingTraining}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="flex-1 text-xs font-bold uppercase tracking-wider"
                  disabled={isSubmittingTraining}
                >
                  {isSubmittingTraining ? 'Saving...' : 'Save Training Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Month-End Letter-Pad Payslip Modal */}
      {isPayslipModalOpen && (
        <PayslipModal
          staffId={staffId}
          fullName={fullName}
          designation={designation}
          initialMonth={selectedPayslipMonth}
          onClose={() => {
            setIsPayslipModalOpen(false);
            loadData();
          }}
          isAdmin={true}
        />
      )}

      {/* Real-time Staff Portal Preview Modal */}
      {isPreviewPortalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-5xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-up my-auto flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/90">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  Live Staff Portal Preview &bull; {fullName}
                  <Badge variant="indigo" className="text-[9px] py-0.5">{designation}</Badge>
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewPortalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-white transition-colors"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <StaffSalaryPortal activeStaff={{ id: staffId, full_name: fullName, designation }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
