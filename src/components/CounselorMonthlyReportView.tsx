import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency } from '../services/mockData';
import { supabase } from '../services/supabase';
import { 
  getCollectionMonthKey, 
  getStudentAdmissionMonthKey, 
  hasStudentFeeInRegistry, 
  formatMonthLabel,
  isStudentDiscontinued,
  getStudentFinancialState
} from '../utils/dateAttribution';
import {
  Users,
  DollarSign,
  Calendar,
  GraduationCap,
  Award,
  Wallet,
  Eye,
  Plus,
  Search,
  BarChart3,
  X,
  Download,
  FileText,
  Trash2
} from 'lucide-react';

export interface CounselorMonthlyReportViewProps {
  counselorId?: string; // If 'all' or undefined, shows all counselors for Admin
  isAdminView?: boolean;
  activeStaff?: any;
  selectedMonth?: string;
  students?: any[];
  batches?: any[];
  installments?: any[];
  staffList?: any[];
  onAddPayment?: (student: any) => void;
  onViewStudent?: (student: any) => void;
  onViewSlip?: (slipUrl: string) => void;
}

export const CounselorMonthlyReportView: React.FC<CounselorMonthlyReportViewProps> = ({
  counselorId = 'all',
  isAdminView = false,
  activeStaff,
  selectedMonth: propSelectedMonth,
  students = [],
  batches = [],
  installments = [],
  staffList = [],
  onAddPayment,
  onViewStudent,
  onViewSlip
}) => {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(propSelectedMonth || currentMonthStr);

  useEffect(() => {
    if (propSelectedMonth && propSelectedMonth !== selectedMonth) {
      setSelectedMonth(propSelectedMonth);
    }
  }, [propSelectedMonth]);
  const [selectedCounselor, setSelectedCounselor] = useState<string>(counselorId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<'admissions' | 'collections'>('admissions');
  const [admissionsViewMode, setAdmissionsViewMode] = useState<'month_admissions' | 'carry_forward_pipeline'>('month_admissions');

  // Fallback internal data states when props are empty or component is used standalone
  const [internalStudents, setInternalStudents] = useState<any[]>([]);
  const [internalBatches, setInternalBatches] = useState<any[]>([]);
  const [internalInstallments, setInternalInstallments] = useState<any[]>([]);
  const [internalStaffList, setInternalStaffList] = useState<any[]>([]);

  // Quick Payment Modal states
  const [paymentStudent, setPaymentStudent] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Sync selectedCounselor with prop when counselorId changes
  useEffect(() => {
    if (counselorId && counselorId !== selectedCounselor) {
      setSelectedCounselor(counselorId);
    }
  }, [counselorId]);

  const loadMissingData = async () => {

    try {
      const [bRes, sRes, fRes, stRes] = await Promise.all([
        batches && batches.length > 0 ? Promise.resolve({ data: batches }) : supabase.from('batches').select('*'),
        students && students.length > 0 ? Promise.resolve({ data: students }) : supabase.from('students').select('*'),
        installments && installments.length > 0 ? Promise.resolve({ data: installments }) : supabase.from('fee_collections').select('*'),
        staffList && staffList.length > 0 ? Promise.resolve({ data: staffList }) : supabase.from('staff_profiles').select('*')
      ]);

      let bData = bRes.data || [];
      if (bData.length === 0 && (!batches || batches.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/batches?select=*');
          if (r.ok) bData = await r.json();
        } catch (_) { }
      }

      let sData = sRes.data || [];
      if (sData.length === 0 && (!students || students.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/students?select=*');
          if (r.ok) sData = await r.json();
        } catch (_) { }
      }

      let fData = fRes.data || [];
      if (fData.length === 0 && (!installments || installments.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/fee_collections?select=*');
          if (r.ok) fData = await r.json();
        } catch (_) { }
      }

      let stData = stRes.data || [];
      if (stData.length === 0 && (!staffList || staffList.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/staff_profiles?select=*');
          if (r.ok) stData = await r.json();
        } catch (_) { }
      }

      if (!batches || batches.length === 0) setInternalBatches(bData);
      if (!students || students.length === 0) setInternalStudents(sData);
      if (!installments || installments.length === 0) setInternalInstallments(fData);
      if (!staffList || staffList.length === 0) setInternalStaffList(stData);
    } catch (e) {
      console.warn('Counselor report data fetch fallback:', e);
    } finally {

    }
  };

  useEffect(() => {
    if ((!students || students.length === 0) || (!batches || batches.length === 0) || (!installments || installments.length === 0) || (!staffList || staffList.length === 0)) {
      loadMissingData();
    }
  }, [students?.length, batches?.length, installments?.length, staffList?.length]);

  const effectiveStudents = (students && students.length > 0) ? students : internalStudents;
  const effectiveBatches = (batches && batches.length > 0) ? batches : internalBatches;
  const effectiveInstallments = (installments && installments.length > 0) ? installments : internalInstallments;
  const effectiveStaffList = (staffList && staffList.length > 0) ? staffList : internalStaffList;

  const handleQuickPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentStudent || !paymentAmount) return;
    setIsSubmittingPayment(true);
    try {
      const amt = parseFloat(paymentAmount) || 0;
      const pDate = paymentDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const curMonth = new Date(pDate).toLocaleString('default', { month: 'long', year: 'numeric' });
      const feePayload = {
        student_id: paymentStudent.id,
        batch_id: paymentStudent.batch_id,
        amount: amt,
        payment_mode: paymentMode.toLowerCase(),
        installment_month: curMonth,
        notes: paymentNotes || 'Fee installment',
        collected_by: activeStaff?.id || null,
        created_at: new Date(pDate + 'T12:00:00Z').toISOString()
      };

      const { error: fErr } = await supabase.from('fee_collections').insert([feePayload]);
      if (fErr) {
        await fetch('/supabase-admin/rest/v1/fee_collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([feePayload])
        });
      }

      // Update student total paid
      const currentPaid = Number(paymentStudent.paid_fee || 0) + amt;
      await supabase.from('students').update({ paid_fee: currentPaid }).eq('id', paymentStudent.id);
      await fetch(`/supabase-admin/rest/v1/students?id=eq.${paymentStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_fee: currentPaid })
      });

      alert(`Payment of ₹${amt.toLocaleString()} recorded successfully for ${paymentStudent.student_name || paymentStudent.name}!`);
      setPaymentStudent(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      await loadMissingData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleDeleteCollection = async (collectionId: string, studentId: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete this payment record of ₹${amount.toLocaleString()}? The student's paid fee balance will be recalculated automatically.`)) {
      return;
    }
    try {
      let deleted = false;
      try {
        const res = await fetch(`/supabase-admin/rest/v1/fee_collections?id=eq.${collectionId}`, { method: 'DELETE' });
        if (res.ok) deleted = true;
      } catch (_) {}

      if (!deleted) {
        const { error } = await supabase.from('fee_collections').delete().eq('id', collectionId);
        if (error) throw error;
      }
      // Recalculate student paid fee
      const remaining = effectiveInstallments.filter((i: any) => i.id !== collectionId && i.student_id === studentId);
      const newTotalPaid = remaining.reduce((sum: number, i: any) => sum + Number(i.amount || i.amount_paid || 0), 0);
      try {
        await fetch(`/supabase-admin/rest/v1/students?id=eq.${studentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paid_fee: newTotalPaid })
        });
      } catch (_) {
        await supabase.from('students').update({ paid_fee: newTotalPaid }).eq('id', studentId);
      }
      await loadMissingData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      alert('Payment record deleted and student balance recalculated.');
    } catch (err: any) {
      alert('Failed to delete payment: ' + err.message);
    }
  };

  // Month options (Rolling span from 2024 to present + all historical months discovered in data)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const set = new Set<string>();
    const date = new Date();
    const currentYear = date.getFullYear();

    // Span from 2024 through currentYear + 1
    for (let y = 2024; y <= currentYear + 1; y++) {
      for (let m = 1; m <= 12; m++) {
        const val = `${y}-${String(m).padStart(2, '0')}`;
        set.add(val);
      }
    }

    // Discover historical months from student enrollments
    effectiveStudents.forEach((s: any) => {
      const ym = getStudentAdmissionMonthKey(s, effectiveInstallments, effectiveBatches.find((b: any) => b.id === s.batch_id));
      if (ym) set.add(ym);
    });

    // Discover historical months from fee collections
    effectiveInstallments.forEach((inst: any) => {
      const ym = getCollectionMonthKey(inst);
      if (ym) set.add(ym);
    });

    Array.from(set)
      .filter(val => /^\d{4}-\d{2}$/.test(val))
      .sort((a, b) => b.localeCompare(a))
      .forEach(value => {
        options.push({ value, label: formatMonthLabel(value) });
      });

    return options;
  }, [effectiveStudents, effectiveInstallments]);

  // Filter staff to Academic Counselors
  const counselorStaff = useMemo(() => {
    return effectiveStaffList.filter((s: any) =>
      (s.designation || '').toLowerCase().includes('counselor')
    );
  }, [effectiveStaffList]);

  // Determine effective counselor filter
  const isCounselorRole = (activeStaff?.designation || '').toLowerCase().includes('counselor');
  const effectiveCounselorId = (!isAdminView && isCounselorRole)
    ? (activeStaff?.id || '')
    : selectedCounselor;

  // Filter students enrolled strictly in the selected month
  const monthStudents = useMemo(() => {
    return effectiveStudents.filter((s: any) => {
      const matchesMonth = getStudentAdmissionMonthKey(s, effectiveInstallments, effectiveBatches.find(b => b.id === s.batch_id)) === selectedMonth;
      if (!matchesMonth) return false;
      if (effectiveCounselorId && effectiveCounselorId !== 'all') {
        return s.counselor_id === effectiveCounselorId;
      }
      return true;
    });
  }, [effectiveStudents, effectiveInstallments, effectiveBatches, selectedMonth, effectiveCounselorId]);

  // Filter fee collections logged strictly in the selected month
  const monthCollections = useMemo(() => {
    return effectiveInstallments.filter((inst: any) => {
      const matchesMonth = getCollectionMonthKey(inst) === selectedMonth;
      if (!matchesMonth) return false;

      if (effectiveCounselorId && effectiveCounselorId !== 'all') {
        const student = effectiveStudents.find((st: any) => st.id === inst.student_id);
        const matchesCollector = inst.collected_by === effectiveCounselorId;
        const matchesStudentCounselor = student?.counselor_id === effectiveCounselorId;
        return matchesCollector || matchesStudentCounselor;
      }
      return true;
    });
  }, [effectiveInstallments, effectiveStudents, selectedMonth, effectiveCounselorId]);

  // Active ongoing pipeline students (for multi-month carry forward tracking across 3-4 month batches)
  const activePipelineStudents = useMemo(() => {
    return effectiveStudents.filter((s: any) => {
      if (effectiveCounselorId && effectiveCounselorId !== 'all') {
        if (s.counselor_id !== effectiveCounselorId) return false;
      }
      if (isStudentDiscontinued(s)) return false;
      const batch = effectiveBatches.find((b: any) => b.id === s.batch_id);
      const isBatchCompleted = (batch?.status || '').toLowerCase() === 'completed';
      if (isBatchCompleted) return false;
      if ((s.status || '').toLowerCase() === 'completed') return false;
      return true;
    });
  }, [effectiveStudents, effectiveBatches, effectiveCounselorId]);

  // Pre-calculate financial states for month students
  const monthStudentsFin = useMemo(() => {
    return monthStudents.map((s: any) => {
      const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
      const paidFromInst = sInst.reduce((sum: number, i: any) => sum + Number(i.amount_paid || i.amount || 0), 0);
      const paid = Math.max(paidFromInst, Number(s.paid_fee || 0));
      const fin = getStudentFinancialState(s, paid);
      return { student: s, paid, fin };
    });
  }, [monthStudents, effectiveInstallments]);

  // Aggregate Metrics for Selected View
  const totalRegistrations = monthStudents.length;
  // Effective booked tuition on month admissions (excluding discontinued unpaid portion)
  const totalPackageBooked = monthStudentsFin.reduce((sum, item) => sum + item.fin.effectiveExpectedFee, 0);
  const totalMonthCohortPending = monthStudentsFin.reduce((sum, item) => sum + item.fin.pendingDue, 0);
  const totalMonthWaived = monthStudentsFin.reduce((sum, item) => sum + item.fin.writtenOffAmount, 0);

  // Month collections: all collections recorded in selected month
  const collectionsSum = monthCollections.reduce((sum, c) => sum + Number(c.amount_paid || c.amount || 0), 0);
  const studentsInitialPaidSum = monthStudents.reduce((sum, s) => {
    const hasCollection = hasStudentFeeInRegistry(s.id, effectiveInstallments);
    return sum + (hasCollection ? 0 : Number(s.paid_fee || 0));
  }, 0);
  const totalCollections = collectionsSum + studentsInitialPaidSum;
  const collectionConversionRate = totalPackageBooked > 0 ? Math.round((totalCollections / totalPackageBooked) * 100) : 0;

  // Active pipeline carry-forward dues across all active batches
  const totalActivePipelinePending = useMemo(() => {
    return activePipelineStudents.reduce((sum, s) => {
      const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
      const paidFromInst = sInst.reduce((isum: number, i: any) => isum + Number(i.amount_paid || i.amount || 0), 0);
      const paid = Math.max(paidFromInst, Number(s.paid_fee || 0));
      const fin = getStudentFinancialState(s, paid);
      return sum + fin.pendingDue;
    }, 0);
  }, [activePipelineStudents, effectiveInstallments]);

  // Counselor Leaderboard Summary (For Admin View when 'all' is selected)
  const counselorComparison = useMemo(() => {
    return counselorStaff.map((c: any) => {
      const cStudents = effectiveStudents.filter((s: any) => {
        const matches = getStudentAdmissionMonthKey(s, effectiveInstallments, effectiveBatches.find(b => b.id === s.batch_id)) === selectedMonth;
        return matches && s.counselor_id === c.id;
      });

      const cCollections = effectiveInstallments.filter((inst: any) => {
        const matches = getCollectionMonthKey(inst) === selectedMonth;
        if (!matches) return false;
        const student = effectiveStudents.find((st: any) => st.id === inst.student_id);
        const matchesCollector = inst.collected_by === c.id;
        const matchesStudentCounselor = student?.counselor_id === c.id;
        return matchesCollector || matchesStudentCounselor;
      });

      const enrolledCount = cStudents.length;
      let bookedAmount = 0;
      let pendingAmount = 0;
      cStudents.forEach((s: any) => {
        const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
        const paidFromInst = sInst.reduce((isum: number, i: any) => isum + Number(i.amount_paid || i.amount || 0), 0);
        const paid = Math.max(paidFromInst, Number(s.paid_fee || 0));
        const fin = getStudentFinancialState(s, paid);
        bookedAmount += fin.effectiveExpectedFee;
        pendingAmount += fin.pendingDue;
      });

      const cCollSum = cCollections.reduce((sum, inst) => sum + Number(inst.amount_paid || inst.amount || 0), 0);
      const cExtraPaid = cStudents.reduce((sum, s) => {
        const has = hasStudentFeeInRegistry(s.id, effectiveInstallments);
        return sum + (has ? 0 : Number(s.paid_fee || 0));
      }, 0);
      const collectedAmount = cCollSum + cExtraPaid;
      const rate = bookedAmount > 0 ? Math.round((collectedAmount / bookedAmount) * 100) : 0;

      // Pipeline outstanding across ongoing batches for this counselor
      const pipelinePending = effectiveStudents.filter((s: any) => {
        if (s.counselor_id !== c.id || isStudentDiscontinued(s)) return false;
        const batch = effectiveBatches.find((b: any) => b.id === s.batch_id);
        return (batch?.status || '').toLowerCase() !== 'completed' && (s.status || '').toLowerCase() !== 'completed';
      }).reduce((sum: number, s: any) => {
        const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
        const paidFromInst = sInst.reduce((isum: number, i: any) => isum + Number(i.amount_paid || i.amount || 0), 0);
        const paid = Math.max(paidFromInst, Number(s.paid_fee || 0));
        return sum + getStudentFinancialState(s, paid).pendingDue;
      }, 0);

      return {
        id: c.id,
        name: c.full_name,
        designation: c.designation || 'Academic Counselor',
        enrolledCount,
        bookedAmount,
        collectedAmount,
        pendingAmount,
        pipelinePending,
        rate
      };
    });
  }, [counselorStaff, effectiveStudents, effectiveInstallments, effectiveBatches, selectedMonth]);

  // Filtered lists for table search (toggles between Month Admissions and Carry-Forward Pipeline)
  const activeDisplayStudents = admissionsViewMode === 'month_admissions' ? monthStudents : activePipelineStudents;

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return activeDisplayStudents;
    const q = searchQuery.toLowerCase();
    return activeDisplayStudents.filter((s: any) =>
      s.student_name?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.registration_number?.toLowerCase().includes(q) ||
      s.student_id_code?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      effectiveBatches.find((b: any) => b.id === s.batch_id)?.batch_name?.toLowerCase().includes(q)
    );
  }, [activeDisplayStudents, searchQuery, effectiveBatches]);

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return monthCollections;
    const q = searchQuery.toLowerCase();
    return monthCollections.filter((c: any) => {
      const student = effectiveStudents.find((s: any) => s.id === c.student_id);
      return (
        student?.student_name?.toLowerCase().includes(q) ||
        student?.name?.toLowerCase().includes(q) ||
        student?.registration_number?.toLowerCase().includes(q) ||
        student?.student_id_code?.toLowerCase().includes(q) ||
        c.payment_method?.toLowerCase().includes(q) ||
        c.payment_mode?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    });
  }, [monthCollections, searchQuery, effectiveStudents]);

  // --- EXPORT FUNCTIONS FOR COUNSELOR ADMISSIONS & COLLECTIONS ---
  const handleExportCounselorExcel = () => {
    try {
      const counselorName = effectiveCounselorId && effectiveCounselorId !== 'all'
        ? counselorStaff.find((c: any) => c.id === effectiveCounselorId)?.full_name || 'Counselor'
        : 'All Counselors Consolidated';

      const csvRows: any[][] = [];
      csvRows.push([`Tech Ads ERP - Counselor Admissions & Collections Report`]);
      csvRows.push([`Counselor: ${counselorName}`, `Month: ${selectedMonth}`]);
      csvRows.push([`Admissions: ${totalRegistrations}`, `Package Total: ₹${totalPackageBooked.toLocaleString()}`, `Collections: ₹${totalCollections.toLocaleString()}`, `Cohort Pending: ₹${totalMonthCohortPending.toLocaleString()}`, `Pipeline Pending: ₹${totalActivePipelinePending.toLocaleString()}`, `Conversion: ${collectionConversionRate}%`]);
      csvRows.push([]);
      csvRows.push(['--- MONTHLY ADMISSIONS ---']);
      csvRows.push(['Reg No', 'Student Name', 'Assigned Batch', 'Counselor', 'Package Fee (INR)', 'Paid (INR)', 'Balance Due (INR)', 'Status', 'Enrollment Date']);

      monthStudents.forEach((s: any) => {
        const batch = effectiveBatches.find((b: any) => b.id === s.batch_id);
        const counselor = effectiveStaffList.find((st: any) => st.id === s.counselor_id);
        const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
        const paid = sInst.reduce((sum: number, i: any) => sum + Number(i.amount_paid || i.amount || 0), 0) || Number(s.paid_fee || 0);
        const fin = getStudentFinancialState(s, paid);

        csvRows.push([
          s.registration_number || s.student_id_code || s.id,
          s.student_name || s.name,
          batch?.batch_name || 'Unassigned',
          counselor?.full_name || 'Direct / Management',
          fin.nominalTotalFee,
          paid,
          fin.isDiscontinued ? 0 : fin.pendingDue,
          fin.isDiscontinued ? 'Discontinued' : (paid >= fin.nominalTotalFee ? 'Paid' : 'Active'),
          s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : '-')
        ]);
      });

      csvRows.push([]);
      csvRows.push(['--- MONTHLY FEE COLLECTIONS ---']);
      csvRows.push(['Receipt / Date', 'Student Name', 'Amount (INR)', 'Payment Mode', 'Collected By', 'Notes']);

      monthCollections.forEach((inst: any) => {
        const student = effectiveStudents.find((st: any) => st.id === inst.student_id);
        const collector = effectiveStaffList.find((st: any) => st.id === inst.collected_by);

        csvRows.push([
          inst.payment_date || (inst.created_at ? inst.created_at.slice(0, 10) : '-'),
          student?.student_name || student?.name || 'Student',
          Number(inst.amount_paid || inst.amount || 0),
          (inst.payment_mode || 'online').toUpperCase(),
          collector?.full_name || 'Management',
          inst.notes || '-'
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Counselor_Admissions_Report_${counselorName.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Error exporting counselor report: ' + e.message);
    }
  };

  const handleExportCounselorPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const counselorName = effectiveCounselorId && effectiveCounselorId !== 'all'
        ? counselorStaff.find((c: any) => c.id === effectiveCounselorId)?.full_name || 'Counselor'
        : 'All Counselors Consolidated';

      const studentRows = monthStudents.map((s: any) => {
        const batch = effectiveBatches.find((b: any) => b.id === s.batch_id);
        const counselor = effectiveStaffList.find((st: any) => st.id === s.counselor_id);
        const sInst = effectiveInstallments.filter((i: any) => i.student_id === s.id);
        const paid = sInst.reduce((sum: number, i: any) => sum + Number(i.amount_paid || i.amount || 0), 0) || Number(s.paid_fee || 0);
        const fin = getStudentFinancialState(s, paid);

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-weight: bold;">${s.student_name || s.name}</td>
            <td style="padding: 8px; font-family: monospace;">${s.registration_number || s.student_id_code || '-'}</td>
            <td style="padding: 8px;">${batch?.batch_name || '-'}</td>
            <td style="padding: 8px;">${counselor?.full_name || 'Direct'}</td>
            <td style="padding: 8px; text-align: right;">₹${fin.nominalTotalFee.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: #059669; font-weight: bold;">₹${paid.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: ${fin.pendingDue > 0 ? '#e11d48' : '#64748b'}; font-weight: bold;">${fin.isDiscontinued ? '₹0 (Waived)' : `₹${fin.pendingDue.toLocaleString()}`}</td>
            <td style="padding: 8px; text-align: center;">${fin.isDiscontinued ? 'Discontinued' : (paid >= fin.nominalTotalFee ? 'Paid' : 'Active')}</td>
            <td style="padding: 8px; text-align: center;">${s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : '-')}</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Counselor Report - ${counselorName}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
              .metrics { display: flex; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
              .metric-item { flex: 1; text-align: center; }
              .metric-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
              .metric-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
              th.center { text-align: center; }
              th.right { text-align: right; }
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Academic Counselor Report</h1>
            <p>Counselor: <strong>${counselorName}</strong> &bull; Period: <strong>${selectedMonth}</strong></p>
            
            <div class="metrics">
              <div class="metric-item"><div class="metric-label">Admissions</div><div class="metric-val">${totalRegistrations}</div></div>
              <div class="metric-item"><div class="metric-label">Course Package Total</div><div class="metric-val" style="color: #6366f1;">₹${totalPackageBooked.toLocaleString()}</div></div>
              <div class="metric-item"><div class="metric-label">Fee Collections</div><div class="metric-val" style="color: #059669;">₹${totalCollections.toLocaleString()}</div></div>
              <div class="metric-item"><div class="metric-label">Cohort Pending</div><div class="metric-val" style="color: #e11d48;">₹${totalMonthCohortPending.toLocaleString()}</div></div>
              <div class="metric-item"><div class="metric-label">Pipeline Pending</div><div class="metric-val" style="color: #d97706;">₹${totalActivePipelinePending.toLocaleString()}</div></div>
              <div class="metric-item"><div class="metric-label">Conversion</div><div class="metric-val">${collectionConversionRate}%</div></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Reg No</th>
                  <th>Batch</th>
                  <th>Counselor</th>
                  <th class="right">Package Fee</th>
                  <th class="right">Paid</th>
                  <th class="right">Balance Due</th>
                  <th class="center">Status</th>
                  <th class="center">Date</th>
                </tr>
              </thead>
              <tbody>
                ${studentRows || '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #64748b;">No admissions logged for this period.</td></tr>'}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e: any) {
      alert('Error exporting Counselor PDF: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-soft text-primary border border-primary/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Counselor Admissions & Fee Collections
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Monthly student registrations, package totals & fee collections per academic counselor
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-muted-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Counselor Selector for Admin */}
          {isAdminView && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={selectedCounselor}
                onChange={(e) => setSelectedCounselor(e.target.value)}
                className="bg-muted-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Counselors (Consolidated)</option>
                {counselorStaff.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.designation || 'Counselor'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Counselor Badge for Non-Admin */}
          {!isAdminView && isCounselorRole && (
            <Badge variant="indigo" className="px-3 py-1 text-xs font-bold">
              Counselor: {activeStaff?.full_name}
            </Badge>
          )}

          {/* Export Options */}
          <button
            onClick={handleExportCounselorExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Export Counselor Admissions and Collections to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handleExportCounselorPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Export Counselor Report to PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registrations */}
        <Card variant="glass" className="p-4 border-primary/20 bg-primary-soft/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              New Admissions
            </span>
            <div className="p-2 bg-primary-soft rounded-lg text-primary">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{totalRegistrations}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">
              Registered in {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}
            </p>
          </div>
        </Card>

        {/* Total Course Package Booked */}
        <Card variant="glass" className="p-4 border-indigo/20 bg-indigo-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Course Package Total
            </span>
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-foreground">{formatCurrency(totalPackageBooked)}</div>
            <p className="text-[10px] text-indigo-400 font-semibold mt-1">Total Tuition Value Booked</p>
          </div>
        </Card>

        {/* Total Collections */}
        <Card variant="glass" className="p-4 border-success/20 bg-success-soft/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Fee Collections
            </span>
            <div className="p-2 bg-success-soft rounded-lg text-success">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-success">{formatCurrency(totalCollections)}</div>
            <p className="text-[10px] text-success font-semibold mt-1">
              {collectionConversionRate}% Realized of Booked Fees
            </p>
          </div>
        </Card>

        {/* Pending Balance */}
        <Card variant="glass" className="p-4 border-warning/20 bg-warning-soft/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Admissions Balance
            </span>
            <div className="p-2 bg-warning-soft rounded-lg text-warning">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-warning">{formatCurrency(totalMonthCohortPending)}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              Due on {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth} admissions
            </p>
            {totalMonthWaived > 0 && (
              <p className="text-[9.5px] text-muted-foreground italic mt-0.5">
                {formatCurrency(totalMonthWaived)} waived (discontinued)
              </p>
            )}
            <div className="mt-2.5 pt-2 border-t border-warning/20 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-semibold">Active Batch Pipeline:</span>
              <strong className="text-foreground font-black">{formatCurrency(totalActivePipelinePending)}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Counselor Comparison Table (Admin View When 'all' is selected) */}
      {isAdminView && effectiveCounselorId === 'all' && counselorComparison.length > 0 && (
        <Card variant="glass" className="p-5 border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Counselor Performance Comparison
              </h3>
              <p className="text-xs text-muted-foreground">
                Breakdown of admissions, fee collections & carry-forward pipeline by counselor for {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-muted-2 text-muted-foreground border-b border-border font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Counselor</th>
                  <th className="px-4 py-3 text-center">New Admissions</th>
                  <th className="px-4 py-3 text-right">Course Value (₹)</th>
                  <th className="px-4 py-3 text-right">Collections (₹)</th>
                  <th className="px-4 py-3 text-right">Cohort Due (₹)</th>
                  <th className="px-4 py-3 text-right">Pipeline Due (₹)</th>
                  <th className="px-4 py-3 text-center">Realization</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {counselorComparison.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center font-black text-xs border border-primary/20">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-extrabold text-foreground text-sm">
                      <span className="px-2.5 py-0.5 rounded-full bg-muted border border-border">
                        {c.enrolledCount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      {formatCurrency(c.bookedAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-success">
                      +{formatCurrency(c.collectedAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-danger">
                      {formatCurrency(c.pendingAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-400">
                      {formatCurrency(c.pipelinePending)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge variant={c.rate >= 70 ? 'success' : c.rate >= 40 ? 'warning' : 'info'}>
                        {c.rate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedCounselor(c.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-soft text-primary hover:bg-primary/20 border border-primary/20 transition-colors cursor-pointer"
                      >
                        Inspect Report →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. Tab Selector: Admissions vs Collections Log */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveReportTab('admissions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeReportTab === 'admissions'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
            >
              Registered Students ({monthStudents.length})
            </button>
            <button
              onClick={() => setActiveReportTab('collections')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeReportTab === 'collections'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
            >
              Fee Collections Log ({monthCollections.length})
            </button>

            {/* Sub-view toggle when admissions tab is active: Month cohort vs All active pipeline */}
            {activeReportTab === 'admissions' && (
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted-2 border border-border sm:ml-2">
                <button
                  type="button"
                  onClick={() => setAdmissionsViewMode('month_admissions')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${admissionsViewMode === 'month_admissions'
                      ? 'bg-card text-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {formatMonthLabel(selectedMonth)} Admissions ({monthStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdmissionsViewMode('carry_forward_pipeline')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${admissionsViewMode === 'carry_forward_pipeline'
                      ? 'bg-card text-foreground shadow-xs border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                  title="View all students currently enrolled in active ongoing batches across 3-4 months"
                >
                  <span>Active Ongoing Pipeline ({activePipelineStudents.length})</span>
                  {totalActivePipelinePending > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-extrabold">
                      {formatCurrency(totalActivePipelinePending)}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${activeReportTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted-2 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 5. Detailed Table: Admissions */}
        {activeReportTab === 'admissions' && (
          <Card variant="glass" className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted-2 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Reg. No</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Assigned Batch</th>
                    <th className="px-4 py-3">Enrolling Counselor</th>
                    <th className="px-4 py-3">Admit Date</th>
                    <th className="px-4 py-3 text-right">Package Fee</th>
                    <th className="px-4 py-3 text-right">Paid to Date</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((s: any) => {
                    const batch = effectiveBatches.find((b: any) => b.id === s.batch_id);
                    const counselor = effectiveStaffList.find((st: any) => st.id === s.counselor_id);
                    const studentInstallments = effectiveInstallments.filter((i: any) => i.student_id === s.id);
                    const paidFromInstallments = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || i.amount || 0), 0);
                    const paid = Math.max(paidFromInstallments, Number(s.paid_fee || 0));
                    const fin = getStudentFinancialState(s, paid);
                    const isDiscontinued = fin.isDiscontinued;
                    const isFullyPaid = !isDiscontinued && paid >= fin.nominalTotalFee && fin.nominalTotalFee > 0;
                    const isUnpaid = !isDiscontinued && paid === 0;

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-primary font-bold">
                          {s.registration_number || `STU-${s.id?.slice(0, 4)}`}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{s.student_name || s.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.phone || 'No phone'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">
                            {batch ? batch.batch_name : 'Unassigned'}
                          </span>
                          {batch?.batch_type && (
                            <span className="text-[10px] text-muted-foreground block">
                              {batch.batch_type}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="indigo" className="text-[10px] font-bold">
                            {counselor ? counselor.full_name : s.counselor_name || 'Direct Admission'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.enrollment_date || (s.created_at ? s.created_at.split('T')[0] : '-')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {formatCurrency(fin.nominalTotalFee)}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-success">
                          {formatCurrency(paid)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isDiscontinued ? (
                            <div>
                              <span className="text-muted-foreground text-[11px] font-semibold italic">Waived (₹0)</span>
                              {fin.writtenOffAmount > 0 && (
                                <span className="text-[9.5px] text-muted-foreground block">
                                  ({formatCurrency(fin.writtenOffAmount)} waived)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`font-extrabold ${fin.pendingDue > 0 ? 'text-danger' : 'text-emerald-400'}`}>
                              {formatCurrency(fin.pendingDue)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isDiscontinued ? (
                            <Badge variant="error" className="text-[10px] font-bold">
                              Discontinued
                            </Badge>
                          ) : (
                            <Badge variant={isFullyPaid ? 'success' : isUnpaid ? 'error' : 'warning'}>
                              {isFullyPaid ? 'Paid in Full' : isUnpaid ? 'Unpaid' : 'Partial'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {onAddPayment && (
                              <button
                                onClick={() => onAddPayment(s)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-soft text-primary hover:bg-primary/20 border border-primary/20 transition-colors cursor-pointer flex items-center gap-1"
                                title="Add Payment for this student"
                              >
                                <Plus className="w-3 h-3" /> Payment
                              </button>
                            )}
                            {onViewStudent && (
                              <button
                                onClick={() => onViewStudent(s)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-muted-2 text-foreground transition-colors cursor-pointer"
                              >
                                Details →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-xs">
                        {admissionsViewMode === 'month_admissions'
                          ? 'No student admissions recorded for the selected period.'
                          : 'No active students found in ongoing batches.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* 6. Detailed Table: Collections */}
        {activeReportTab === 'collections' && (
          <Card variant="glass" className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-muted-2 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Receipt Date</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Collected By Counselor</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Receipt Slip</th>
                    {isAdminView && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCollections.map((c: any) => {
                    const student = effectiveStudents.find((s: any) => s.id === c.student_id);
                    const batch = effectiveBatches.find((b: any) => b.id === (c.batch_id || student?.batch_id));
                    const collectedByStaff = effectiveStaffList.find((st: any) => st.id === c.collected_by) ||
                      effectiveStaffList.find((st: any) => st.id === student?.counselor_id);

                    return (
                      <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {c.payment_date || (c.created_at ? c.created_at.split('T')[0] : '-')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-foreground">{student ? (student.student_name || student.name) : 'Student Receipt'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{student?.registration_number}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {batch ? batch.batch_name : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="indigo" className="text-[10px] font-bold">
                            {collectedByStaff ? collectedByStaff.full_name : 'Staff Member'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-foreground border border-border">
                            {c.payment_method || c.payment_mode || 'ONLINE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-success text-sm">
                          +{formatCurrency(Number(c.amount_paid || c.amount || 0))}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[150px] truncate" title={c.notes}>
                          {c.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.proof_url ? (
                            <button
                              onClick={() => onViewSlip && onViewSlip(c.proof_url)}
                              className="px-2 py-0.5 rounded bg-primary-soft text-primary hover:bg-primary/20 text-[10px] font-bold border border-primary/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View Slip
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-[10px] italic">No slip</span>
                          )}
                        </td>
                        {isAdminView && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteCollection(c.id, c.student_id, Number(c.amount_paid || c.amount || 0))}
                              className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete payment record and recalculate student balance"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredCollections.length === 0 && (
                    <tr>
                      <td colSpan={isAdminView ? 9 : 8} className="px-4 py-10 text-center text-muted-foreground text-xs">
                        No fee collection receipts recorded for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Add Payment Modal */}
      {paymentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button
              onClick={() => setPaymentStudent(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-foreground mb-1">Add Student Fee Payment</h3>
            <p className="text-xs text-primary font-bold mb-4">
              {paymentStudent.student_name || paymentStudent.name} ({paymentStudent.registration_number || paymentStudent.student_id_code})
            </p>

            <form onSubmit={handleQuickPaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount (₹) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment Date *</label>
                  <input
                    required
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes / Transaction ID</label>
                <input
                  type="text"
                  placeholder="Reference or transaction ID"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isSubmittingPayment} className="w-full">
                  {isSubmittingPayment ? 'Recording...' : 'Record Payment & Generate Slip'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
