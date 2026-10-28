import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency } from '../services/mockData';
import { supabase } from '../services/supabase';
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
  X
} from 'lucide-react';

export interface CounselorMonthlyReportViewProps {
  counselorId?: string; // If 'all' or undefined, shows all counselors for Admin
  isAdminView?: boolean;
  activeStaff?: any;
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
  students = [],
  batches = [],
  installments = [],
  staffList = [],
  onAddPayment,
  onViewStudent,
  onViewSlip
}) => {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedCounselor, setSelectedCounselor] = useState<string>(counselorId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<'admissions' | 'collections'>('admissions');

  // Fallback internal data states when props are empty or component is used standalone
  const [internalStudents, setInternalStudents] = useState<any[]>([]);
  const [internalBatches, setInternalBatches] = useState<any[]>([]);
  const [internalInstallments, setInternalInstallments] = useState<any[]>([]);
  const [internalStaffList, setInternalStaffList] = useState<any[]>([]);

  // Quick Payment Modal states
  const [paymentStudent, setPaymentStudent] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
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
        } catch (_) {}
      }

      let sData = sRes.data || [];
      if (sData.length === 0 && (!students || students.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/students?select=*');
          if (r.ok) sData = await r.json();
        } catch (_) {}
      }

      let fData = fRes.data || [];
      if (fData.length === 0 && (!installments || installments.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/fee_collections?select=*');
          if (r.ok) fData = await r.json();
        } catch (_) {}
      }

      let stData = stRes.data || [];
      if (stData.length === 0 && (!staffList || staffList.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/staff_profiles?select=*');
          if (r.ok) stData = await r.json();
        } catch (_) {}
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
      const curMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const feePayload = {
        student_id: paymentStudent.id,
        batch_id: paymentStudent.batch_id,
        amount: amt,
        payment_mode: paymentMode.toLowerCase(),
        installment_month: curMonth,
        notes: paymentNotes || 'Fee installment',
        collected_by: activeStaff?.id || null
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
      await loadMissingData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
    } catch (err: any) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Month options (12-month selector)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const value = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

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

  // Filter students enrolled in the selected month
  const monthStudents = useMemo(() => {
    return effectiveStudents.filter((s: any) => {
      const dateStr = s.enrollment_date || (s.created_at ? s.created_at.split('T')[0] : '');
      const matchesMonth = dateStr.startsWith(selectedMonth);
      if (!matchesMonth) return false;
      if (effectiveCounselorId && effectiveCounselorId !== 'all') {
        return s.counselor_id === effectiveCounselorId;
      }
      return true;
    });
  }, [effectiveStudents, selectedMonth, effectiveCounselorId]);

  // Filter fee collections logged in the selected month
  const monthCollections = useMemo(() => {
    return effectiveInstallments.filter((inst: any) => {
      const dateStr = inst.payment_date || (inst.created_at ? inst.created_at.split('T')[0] : '');
      const matchesMonth = dateStr.startsWith(selectedMonth);
      if (!matchesMonth) return false;

      if (effectiveCounselorId && effectiveCounselorId !== 'all') {
        // Match by collected_by or student's counselor_id
        if (inst.collected_by) {
          return inst.collected_by === effectiveCounselorId;
        }
        const student = effectiveStudents.find((st: any) => st.id === inst.student_id);
        return student?.counselor_id === effectiveCounselorId;
      }
      return true;
    });
  }, [effectiveInstallments, effectiveStudents, selectedMonth, effectiveCounselorId]);

  // Aggregate Metrics for Selected View
  const totalRegistrations = monthStudents.length;
  const totalPackageBooked = monthStudents.reduce((sum, s) => sum + Number(s.total_fees || s.total_fee || 0), 0);
  const totalCollections = monthCollections.reduce((sum, c) => sum + Number(c.amount_paid || c.amount || 0), 0);
  const totalPendingBalance = Math.max(0, totalPackageBooked - totalCollections);
  const collectionConversionRate = totalPackageBooked > 0 ? Math.round((totalCollections / totalPackageBooked) * 100) : 0;

  // Counselor Leaderboard Summary (For Admin View when 'all' is selected)
  const counselorComparison = useMemo(() => {
    return counselorStaff.map((c: any) => {
      const cStudents = effectiveStudents.filter((s: any) => {
        const dateStr = s.enrollment_date || (s.created_at ? s.created_at.split('T')[0] : '');
        return dateStr.startsWith(selectedMonth) && s.counselor_id === c.id;
      });

      const cCollections = effectiveInstallments.filter((inst: any) => {
        const dateStr = inst.payment_date || (inst.created_at ? inst.created_at.split('T')[0] : '');
        if (!dateStr.startsWith(selectedMonth)) return false;
        if (inst.collected_by) return inst.collected_by === c.id;
        const student = effectiveStudents.find((st: any) => st.id === inst.student_id);
        return student?.counselor_id === c.id;
      });

      const enrolledCount = cStudents.length;
      const bookedAmount = cStudents.reduce((sum, s) => sum + Number(s.total_fees || s.total_fee || 0), 0);
      const collectedAmount = cCollections.reduce((sum, inst) => sum + Number(inst.amount_paid || inst.amount || 0), 0);
      const pendingAmount = Math.max(0, bookedAmount - collectedAmount);
      const rate = bookedAmount > 0 ? Math.round((collectedAmount / bookedAmount) * 100) : 0;

      return {
        id: c.id,
        name: c.full_name,
        designation: c.designation || 'Academic Counselor',
        enrolledCount,
        bookedAmount,
        collectedAmount,
        pendingAmount,
        rate
      };
    });
  }, [counselorStaff, effectiveStudents, effectiveInstallments, selectedMonth]);

  // Filtered lists for table search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return monthStudents;
    const q = searchQuery.toLowerCase();
    return monthStudents.filter((s: any) =>
      s.student_name?.toLowerCase().includes(q) ||
      s.registration_number?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      batches.find((b: any) => b.id === s.batch_id)?.batch_name?.toLowerCase().includes(q)
    );
  }, [monthStudents, searchQuery, batches]);

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return monthCollections;
    const q = searchQuery.toLowerCase();
    return monthCollections.filter((c: any) => {
      const student = students.find((s: any) => s.id === c.student_id);
      return (
        student?.student_name?.toLowerCase().includes(q) ||
        student?.registration_number?.toLowerCase().includes(q) ||
        c.payment_method?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    });
  }, [monthCollections, searchQuery, students]);

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
            <div className="text-2xl font-black text-warning">{formatCurrency(totalPendingBalance)}</div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">Outstanding on this month's batch</p>
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
                Breakdown of admissions and fee collections by counselor for {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}
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
                  <th className="px-4 py-3 text-right">Pending Balance (₹)</th>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveReportTab('admissions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeReportTab === 'admissions'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Registered Students ({monthStudents.length})
            </button>
            <button
              onClick={() => setActiveReportTab('collections')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeReportTab === 'collections'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Fee Collections Log ({monthCollections.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
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
                    const studentInstallments = installments.filter((i: any) => i.student_id === s.id);
                    const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
                    const total = Number(s.total_fees || s.total_fee || 0);
                    const balance = Math.max(0, total - paid);
                    const isFullyPaid = paid >= total && total > 0;
                    const isUnpaid = paid === 0;

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
                          {formatCurrency(total)}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-success">
                          {formatCurrency(paid)}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-danger">
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={isFullyPaid ? 'success' : isUnpaid ? 'error' : 'warning'}>
                            {isFullyPaid ? 'Paid in Full' : isUnpaid ? 'Unpaid' : 'Partial'}
                          </Badge>
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
                        No student admissions recorded for the selected period.
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
                      </tr>
                    );
                  })}
                  {filteredCollections.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-xs">
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
