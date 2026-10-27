import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import {
  Layers,
  Users,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  GraduationCap,
  PlayCircle,
  Award,
  BookOpen,
  UserCheck,
  UserPlus,
  Edit2,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';

export interface BatchItem {
  id: string;
  batch_name: string;
  course_name: string;
  mode: 'online' | 'offline' | string;
  total_seats: number;
  fee_amount: number;
  status: 'upcoming' | 'running' | 'completed' | string;
  start_date: string;
  tutor_id?: string | null;
  assigned_counselors?: string[] | null;
  created_at?: string;
  tutor_name?: string;
}

export interface StudentItem {
  id: string;
  student_id_code: string;
  name: string;
  phone?: string;
  email?: string;
  batch_id: string;
  counselor_id?: string | null;
  enrollment_date?: string;
  total_fee: number;
  paid_fee: number;
}

export interface FeeCollectionItem {
  id: string;
  student_id: string;
  batch_id: string;
  amount: number;
  payment_mode: string;
  installment_month: string;
  created_at?: string;
}

export interface AttendanceItem {
  id: string;
  student_id: string;
  batch_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | string;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  designation: string;
  username: string;
  status?: string;
}

interface AcademyBatchesProps {
  onNavigateToStudent?: (batchId?: string) => void;
  onNavigateToAttendance?: (batchId?: string) => void;
  onNavigateToFinances?: (batchId?: string) => void;
}

export const AcademyBatches: React.FC<AcademyBatchesProps> = ({
  onNavigateToStudent,
  onNavigateToAttendance,
}) => {
  const { isAdminMode } = useApp();
  const dbClient = supabase;

  // Data States
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [feeCollections, setFeeCollections] = useState<FeeCollectionItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [tutorsList, setTutorsList] = useState<StaffProfile[]>([]);
  const [counselorsList, setCounselorsList] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'running' | 'completed'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Modal: Create / Edit Batch
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [batchForm, setBatchForm] = useState({
    batch_name: '',
    course_name: '',
    mode: 'offline',
    total_seats: '30',
    fee_amount: '25000',
    status: 'upcoming',
    start_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tutor_id: '',
    selectedCounselorIds: [] as string[]
  });
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal: Quick Enroll Student
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [targetBatchForEnroll, setTargetBatchForEnroll] = useState<BatchItem | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    phone: '',
    email: '',
    total_fee: '',
    paid_fee: '',
    counselor_id: '',
    payment_mode: 'online'
  });
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Fetch all live data from Supabase
  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Fetch Staff Profiles for Tutor & Counselor mapping
      let allStaff: StaffProfile[] = [];
      let tutors: StaffProfile[] = [];
      let counselors: StaffProfile[] = [];

      // Query staff_profiles where designation matches 'Academy Tutor'
      try {
        const { data: tutorData, error: tutorErr } = await dbClient
          .from('staff_profiles')
          .select('id, full_name, designation, username, status')
          .ilike('designation', '%Tutor%')
          .order('full_name');
        if (!tutorErr && tutorData) {
          tutors = tutorData as StaffProfile[];
        }
      } catch (err) {
        console.warn('Error querying Academy Tutor directly:', err);
      }

      // Query staff_profiles where designation matches 'Academy Counselor'
      try {
        const { data: counselorData, error: counselorErr } = await dbClient
          .from('staff_profiles')
          .select('id, full_name, designation, username, status')
          .ilike('designation', '%Counselor%')
          .order('full_name');
        if (!counselorErr && counselorData) {
          counselors = counselorData as StaffProfile[];
        }
      } catch (err) {
        console.warn('Error querying Academy Counselor directly:', err);
      }

      // Fetch all staff profiles for batch tutor name mapping and fallback
      try {
        const { data: staffData, error: staffErr } = await dbClient
          .from('staff_profiles')
          .select('id, full_name, designation, username, status')
          .order('full_name');
        if (!staffErr && staffData) {
          allStaff = staffData as StaffProfile[];
        }
      } catch (err) {
        console.warn('Error querying all staff profiles:', err);
      }

      // Fallback matching if direct queries were empty but allStaff contains matching records
      if (tutors.length === 0 && allStaff.length > 0) {
        tutors = allStaff.filter(s => (s.designation || '').toLowerCase().includes('tutor'));
      }
      if (counselors.length === 0 && allStaff.length > 0) {
        counselors = allStaff.filter(s => (s.designation || '').toLowerCase().includes('counselor'));
      }

      setStaffList(allStaff);
      setTutorsList(tutors);
      setCounselorsList(counselors);

      const staffMap = new Map<string, string>();
      allStaff.forEach(s => staffMap.set(s.id, s.full_name));

      // 2. Fetch Batches
      let rawBatches: any[] = [];
      try {
        const { data: bData, error: bErr } = await dbClient
          .from('batches')
          .select('*')
          .order('created_at', { ascending: false });
        if (!bErr && bData && bData.length > 0) {
          rawBatches = bData;
        } else {
          const res = await fetch('/supabase-admin/rest/v1/batches?select=*&order=created_at.desc');
          if (res.ok) {
            rawBatches = await res.json();
          } else if (bData) {
            rawBatches = bData;
          }
        }
      } catch (batchFetchErr) {
        console.warn('Direct batch query error, attempting proxy fetch:', batchFetchErr);
        const res = await fetch('/supabase-admin/rest/v1/batches?select=*&order=created_at.desc');
        if (res.ok) rawBatches = await res.json();
      }

      const formattedBatches: BatchItem[] = (rawBatches || []).map((b: any) => ({
        ...b,
        mode: (b.mode || 'offline').toLowerCase(),
        status: (b.status || 'upcoming').toLowerCase(),
        tutor_name: b.tutor_id ? staffMap.get(b.tutor_id) || 'Unassigned Tutor' : 'Unassigned Tutor'
      }));
      setBatches(formattedBatches);

      // 3. Fetch Students
      let stuList: any[] = [];
      const { data: studentsData, error: sErr } = await dbClient
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      if (!sErr && studentsData && studentsData.length > 0) {
        stuList = studentsData;
      } else {
        try {
          const sRes = await fetch('/supabase-admin/rest/v1/students?select=*&order=created_at.desc');
          if (sRes.ok) stuList = await sRes.json();
        } catch (_) {}
      }
      setStudents((stuList || []) as StudentItem[]);

      // 4. Fetch Fee Collections
      let feeList: any[] = [];
      const { data: feeData, error: fErr } = await dbClient
        .from('fee_collections')
        .select('*');
      if (!fErr && feeData && feeData.length > 0) {
        feeList = feeData;
      } else {
        try {
          const fRes = await fetch('/supabase-admin/rest/v1/fee_collections?select=*');
          if (fRes.ok) feeList = await fRes.json();
        } catch (_) {}
      }
      setFeeCollections((feeList || []) as FeeCollectionItem[]);

      // 5. Fetch Student Attendance
      const { data: attData } = await dbClient
        .from('student_attendance')
        .select('*');
      setAttendances((attData || []) as AttendanceItem[]);

    } catch (err: any) {
      console.error('Failed to load academy batches data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats per batch
  const batchStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalSeats: number;
      filledSeats: number;
      balanceSeats: number;
      fillPercentage: number;
      enrolledStudents: StudentItem[];
      totalCollected: number;
      expectedFeeRevenue: number;
      collectionPercentage: number;
      attendancePercentage: number;
      attendanceRecordCount: number;
    }>();

    batches.forEach(b => {
      const bStudents = students.filter(s => s.batch_id === b.id);
      const filled = bStudents.length;
      const total = b.total_seats || 30;
      const balance = Math.max(0, total - filled);
      const fillPct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;

      // Fee calculations
      const batchFees = feeCollections.filter(f => f.batch_id === b.id);
      const totalCollectedFromFees = batchFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
      const totalCollectedFromStudents = bStudents.reduce((sum, s) => sum + (Number(s.paid_fee) || 0), 0);
      const totalCollected = Math.max(totalCollectedFromFees, totalCollectedFromStudents);
      const expectedRevenue = bStudents.reduce((sum, s) => sum + (Number(s.total_fee) || Number(b.fee_amount) || 0), 0);
      const collectionPct = expectedRevenue > 0 ? Math.min(100, Math.round((totalCollected / expectedRevenue) * 100)) : 0;

      // Attendance calculations
      const bAttendance = attendances.filter(a => a.batch_id === b.id);
      const totalAttRecords = bAttendance.length;
      const presentRecords = bAttendance.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const attPct = totalAttRecords > 0 ? Math.round((presentRecords / totalAttRecords) * 100) : 100;

      map.set(b.id, {
        totalSeats: total,
        filledSeats: filled,
        balanceSeats: balance,
        fillPercentage: fillPct,
        enrolledStudents: bStudents,
        totalCollected,
        expectedFeeRevenue: expectedRevenue,
        collectionPercentage: collectionPct,
        attendancePercentage: attPct,
        attendanceRecordCount: totalAttRecords,
      });
    });

    return map;
  }, [batches, students, feeCollections, attendances]);

  // High-Level KPI Aggregates
  const kpis = useMemo(() => {
    const upcoming = batches.filter(b => b.status === 'upcoming');
    const running = batches.filter(b => b.status === 'running');
    const completed = batches.filter(b => b.status === 'completed');

    const totalUpcomingSeats = upcoming.reduce((sum, b) => sum + (b.total_seats || 0), 0);
    const filledUpcomingSeats = upcoming.reduce((sum, b) => {
      const stats = batchStatsMap.get(b.id);
      return sum + (stats ? stats.filledSeats : 0);
    }, 0);

    const totalRunningCollected = running.reduce((sum, b) => {
      const stats = batchStatsMap.get(b.id);
      return sum + (stats ? stats.totalCollected : 0);
    }, 0);

    const runningAttWeighted = running.reduce((sum, b) => {
      const stats = batchStatsMap.get(b.id);
      return sum + (stats ? stats.attendancePercentage : 0);
    }, 0);
    const avgRunningAtt = running.length > 0 ? Math.round(runningAttWeighted / running.length) : 0;

    return {
      totalBatches: batches.length,
      upcomingCount: upcoming.length,
      runningCount: running.length,
      completedCount: completed.length,
      totalUpcomingSeats,
      filledUpcomingSeats,
      balanceUpcomingSeats: Math.max(0, totalUpcomingSeats - filledUpcomingSeats),
      totalRunningCollected,
      avgRunningAttendance: avgRunningAtt,
      totalStudentsEnrolled: students.length
    };
  }, [batches, batchStatsMap, students]);

  // Filtered lists
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesSearch =
        b.batch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.tutor_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesMode = modeFilter === 'all' || b.mode === modeFilter;

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [batches, searchQuery, statusFilter, modeFilter]);

  const upcomingBatches = useMemo(() => {
    return filteredBatches.filter(b => b.status === 'upcoming');
  }, [filteredBatches]);

  const runningBatches = useMemo(() => {
    return filteredBatches.filter(b => b.status === 'running');
  }, [filteredBatches]);

  const completedBatches = useMemo(() => {
    return filteredBatches.filter(b => b.status === 'completed');
  }, [filteredBatches]);

  // --- ACTIONS ---

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    setBatchForm({
      batch_name: '',
      course_name: '',
      mode: 'offline',
      total_seats: '30',
      fee_amount: '25000',
      status: 'upcoming',
      start_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      tutor_id: tutorsList[0]?.id || staffList[0]?.id || '',
      selectedCounselorIds: []
    });
    setFormError(null);
    setIsBatchModalOpen(true);
  };

  const handleOpenEditModal = (batch: BatchItem) => {
    setEditingBatch(batch);
    setBatchForm({
      batch_name: batch.batch_name,
      course_name: batch.course_name,
      mode: batch.mode.toLowerCase(),
      total_seats: String(batch.total_seats),
      fee_amount: String(batch.fee_amount),
      status: batch.status.toLowerCase(),
      start_date: batch.start_date || new Date().toISOString().split('T')[0],
      tutor_id: batch.tutor_id || '',
      selectedCounselorIds: batch.assigned_counselors || []
    });
    setFormError(null);
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.batch_name.trim() || !batchForm.course_name.trim()) {
      setFormError('Batch Name and Course Name are required.');
      return;
    }

    setIsSubmittingBatch(true);
    setFormError(null);

    const finalStartDate = batchForm.start_date && batchForm.start_date.trim()
      ? batchForm.start_date.trim()
      : new Date().toISOString().split('T')[0];

    const payload: any = {
      batch_name: batchForm.batch_name.trim(),
      course_name: batchForm.course_name.trim(),
      mode: batchForm.mode.toLowerCase(), // Must match check constraint: 'online' or 'offline'
      total_seats: parseInt(batchForm.total_seats, 10) || 30,
      fee_amount: parseFloat(batchForm.fee_amount) || 0,
      status: batchForm.status.toLowerCase(), // 'upcoming', 'running', or 'completed'
      start_date: finalStartDate,
      tutor_id: batchForm.tutor_id || null
    };

    try {
      const executeBatchWrite = async (action: 'insert' | 'update', batchPayload: any, batchId?: string) => {
        const url = action === 'insert' ? `/supabase-admin/rest/v1/batches` : `/supabase-admin/rest/v1/batches?id=eq.${batchId}`;
        const method = action === 'insert' ? 'POST' : 'PATCH';
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(action === 'insert' ? [batchPayload] : batchPayload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to ${action} batch`);
        }
        return await res.json();
      };

      if (editingBatch) {
        let updateRes = await supabase
          .from('batches')
          .update(payload)
          .eq('id', editingBatch.id);

        if (updateRes.error) {
          await executeBatchWrite('update', payload, editingBatch.id);
        }
      } else {
        let insertRes = await supabase
          .from('batches')
          .insert([payload])
          .select();

        if (insertRes.error) {
          await executeBatchWrite('insert', payload);
        }
      }

      setIsBatchModalOpen(false);
      await loadData(true);
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
    } catch (err: any) {
      console.error('Error saving batch:', err);
      setFormError(err.message || 'Failed to save batch. Please try again.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: 'upcoming' | 'running' | 'completed') => {
    try {
      const { error } = await supabase
        .from('batches')
        .update({ status: newStatus })
        .eq('id', batchId);
      if (error) {
        const res = await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw error;
      }
      await loadData(true);
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    const stats = batchStatsMap.get(batchId);
    if (stats && stats.filledSeats > 0) {
      if (!confirm(`Warning: This batch has ${stats.filledSeats} enrolled students. Deleting it may impact students' records. Are you sure you want to delete "${batchName}"?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete batch "${batchName}"?`)) return;
    }

    try {
      const { error } = await supabase.from('batches').delete().eq('id', batchId);
      if (error) {
        const res = await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batchId}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw error;
      }
      await loadData(true);
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
    } catch (err: any) {
      alert(`Failed to delete batch: ${err.message}`);
    }
  };

  // Quick Enroll Student Handler
  const handleOpenEnrollModal = (batch: BatchItem) => {
    setTargetBatchForEnroll(batch);
    setEnrollForm({
      name: '',
      phone: '',
      email: '',
      total_fee: String(batch.fee_amount || 25000),
      paid_fee: '0',
      counselor_id: (batch.assigned_counselors && batch.assigned_counselors[0]) || counselorsList[0]?.id || staffList[0]?.id || '',
      payment_mode: 'online'
    });
    setEnrollError(null);
    setIsEnrollModalOpen(true);
  };

  const handleSaveStudentEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBatchForEnroll) return;
    if (!enrollForm.name.trim()) {
      setEnrollError('Student Name is required.');
      return;
    }

    setIsSubmittingEnroll(true);
    setEnrollError(null);

    try {
      // Auto-generate student code e.g. STU-2026-X
      const codeNum = String(students.length + 101).padStart(3, '0');
      const studentCode = `STU-${new Date().getFullYear()}-${codeNum}`;

      const totalFee = parseFloat(enrollForm.total_fee) || Number(targetBatchForEnroll.fee_amount) || 0;
      const paidFee = parseFloat(enrollForm.paid_fee) || 0;

      // 1. Insert into students table
      let newStudent: any = null;
      const studentPayload = {
        student_id_code: studentCode,
        name: enrollForm.name.trim(),
        phone: enrollForm.phone.trim() || null,
        email: enrollForm.email.trim() || null,
        batch_id: targetBatchForEnroll.id,
        counselor_id: enrollForm.counselor_id || null,
        total_fee: totalFee,
        paid_fee: paidFee
      };

      const { data: sData, error: sErr } = await dbClient
        .from('students')
        .insert([studentPayload])
        .select();

      if (!sErr && sData && sData.length > 0) {
        newStudent = sData;
      } else {
        // Fallback to proxy
        const res = await fetch('/supabase-admin/rest/v1/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([studentPayload])
        });
        if (res.ok) {
          newStudent = await res.json();
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || sErr?.message || 'Failed to enroll student.');
        }
      }

      // 2. If student paid initial deposit, log to fee_collections table
      if (paidFee > 0 && newStudent && newStudent[0]) {
        const curMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const feePayload = {
          student_id: newStudent[0].id,
          batch_id: targetBatchForEnroll.id,
          amount: paidFee,
          payment_mode: enrollForm.payment_mode, // 'cash', 'bank_transfer', or 'online'
          installment_month: curMonth,
          notes: 'Initial admission fee payment'
        };
        const { error: fErr } = await dbClient.from('fee_collections').insert([feePayload]);
        if (fErr) {
          await fetch('/supabase-admin/rest/v1/fee_collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([feePayload])
          });
        }
      }

      setIsEnrollModalOpen(false);
      await loadData(true);
      window.dispatchEvent(new CustomEvent('students_data_changed'));
    } catch (err: any) {
      console.error('Failed to enroll student:', err);
      setEnrollError(err.message || 'Failed to enroll student.');
    } finally {
      setIsSubmittingEnroll(false);
    }
  };

  const toggleCounselorSelection = (staffId: string) => {
    setBatchForm(prev => {
      const exists = prev.selectedCounselorIds.includes(staffId);
      return {
        ...prev,
        selectedCounselorIds: exists
          ? prev.selectedCounselorIds.filter(id => id !== staffId)
          : [...prev.selectedCounselorIds, staffId]
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Layers className="w-5 h-5 text-primary absolute inset-0 m-auto" />
        </div>
        <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground animate-pulse">
          Loading Academy Batches...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* 1. Header Banner & Quick Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card via-card/90 to-card/70 border border-border p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Academy Batches
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {batches.length} total
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Live intake tracking, seat counters, fee collection KPIs, and attendance metrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            variant="secondary"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs border border-border hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {isAdminMode && (
            <Button
              id="create-new-batch-btn"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 font-bold px-4 py-2.5 rounded-xl text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Aggregate KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Batches Card */}
        <Card variant="glass" className="p-4 border-border hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Batches</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">{kpis.totalBatches}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="text-amber-400 font-bold">{kpis.upcomingCount} Upcoming</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">{kpis.runningCount} Running</span>
          </div>
        </Card>

        {/* Upcoming Seats Capacity Card */}
        <Card variant="glass" className="p-4 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Upcoming Capacity</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            {kpis.filledUpcomingSeats} <span className="text-sm font-normal text-muted-foreground">/ {kpis.totalUpcomingSeats} Seats</span>
          </div>
          <div className="mt-2 text-[11px] font-bold text-emerald-400">
            {kpis.balanceUpcomingSeats} Balance Seats Available
          </div>
        </Card>

        {/* Running Batch Fee Collections */}
        <Card variant="glass" className="p-4 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Active Batch Collections</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            {formatCurrency(kpis.totalRunningCollected)}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Across <span className="font-bold text-foreground">{kpis.runningCount}</span> running classes
          </div>
        </Card>

        {/* Running Batch Attendance Rate */}
        <Card variant="glass" className="p-4 border-primary/20 bg-primary/5 hover:border-primary/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Avg Class Attendance</span>
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            {kpis.avgRunningAttendance}%
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Live attendance across sessions
          </div>
        </Card>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-2 rounded-xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search batch, course, tutor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All ({batches.length})
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'upcoming' ? 'bg-amber-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Upcoming ({kpis.upcomingCount})
            </button>
            <button
              onClick={() => setStatusFilter('running')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'running' ? 'bg-emerald-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Running ({kpis.runningCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === 'completed' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Completed ({kpis.completedCount})
            </button>
          </div>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-foreground outline-none cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UPCOMING BATCHES SECTION (Requirement 3: Prominent with Seat Counters) */}
      {/* ========================================================================= */}
      {(statusFilter === 'all' || statusFilter === 'upcoming') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                Upcoming Batches — Admissions Open
              </h3>
              <Badge variant="warning" className="text-xs font-bold">
                {upcomingBatches.length} Enrolling
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Track open seats & register incoming students
            </p>
          </div>

          {upcomingBatches.length === 0 ? (
            <Card variant="glass" className="p-8 text-center border-dashed border-border">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-muted-foreground">No upcoming batches found matching criteria.</p>
              {isAdminMode && (
                <button
                  id="create-new-batch-empty-btn"
                  onClick={handleOpenCreateModal}
                  className="mt-3 text-xs text-primary font-bold hover:underline cursor-pointer"
                >
                  + Create your next upcoming batch
                </button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBatches.map(batch => {
                const stats = batchStatsMap.get(batch.id) || {
                  totalSeats: batch.total_seats || 30,
                  filledSeats: 0,
                  balanceSeats: batch.total_seats || 30,
                  fillPercentage: 0
                };

                const isFull = stats.balanceSeats <= 0;
                const isAlmostFull = stats.fillPercentage >= 80 && !isFull;

                return (
                  <Card
                    key={batch.id}
                    variant="glass"
                    className="p-5 border-border hover:border-amber-500/40 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-lg group hover:shadow-amber-500/5"
                  >
                    {/* Top Decorative Indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300" />

                    <div>
                      {/* Batch Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={batch.mode === 'online' ? 'purple' : 'info'} className="text-[10px] font-bold uppercase">
                              {batch.mode === 'online' ? '🌐 Online' : '🏢 Offline'}
                            </Badge>
                            <Badge variant="warning" className="text-[10px] font-bold uppercase">
                              Upcoming
                            </Badge>
                          </div>
                          <h4 className="text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {batch.batch_name}
                          </h4>
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                            {batch.course_name}
                          </p>
                        </div>

                        {/* Fee Tag */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">Fee</span>
                          <span className="text-base font-extrabold text-foreground">
                            {formatCurrency(batch.fee_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Schedule & Tutor */}
                      <div className="grid grid-cols-2 gap-2 py-3 border-y border-border/60 text-xs text-muted-foreground my-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Starts {batch.start_date ? new Date(batch.start_date).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate" title={batch.tutor_name}>
                            {batch.tutor_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* ============================================== */}
                      {/* PROMINENT SEAT COUNTER WIDGET (Requirement 3) */}
                      {/* ============================================== */}
                      <div className="my-4 p-3.5 rounded-xl bg-card/80 border border-border shadow-inner space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3 text-primary" /> Seat Availability
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isFull 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : isAlmostFull 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {isFull ? 'FULL' : `${stats.fillPercentage}% Filled`}
                          </span>
                        </div>

                        {/* 3 Prominent KPI Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {/* Total Seats */}
                          <div className="p-2 rounded-lg bg-muted/60 border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total</span>
                            <span className="text-xl font-black text-foreground">
                              {stats.totalSeats}
                            </span>
                          </div>

                          {/* Filled Seats */}
                          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase block">Filled</span>
                            <span className="text-xl font-black text-emerald-400">
                              {stats.filledSeats}
                            </span>
                          </div>

                          {/* Balance Seats */}
                          <div className={`p-2 rounded-lg border ${
                            stats.balanceSeats === 0 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            <span className="text-[10px] font-bold uppercase block opacity-80">Balance</span>
                            <span className="text-xl font-black">
                              {stats.balanceSeats}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-muted-2 rounded-full h-2.5 overflow-hidden p-0.5 border border-border">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull 
                                  ? 'bg-rose-500' 
                                  : isAlmostFull 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${Math.max(4, Math.min(100, stats.fillPercentage))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground px-0.5">
                            <span>0</span>
                            <span>{stats.balanceSeats} seats remaining</span>
                            <span>{stats.totalSeats}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        {isAdminMode && (
                          <>
                            <button
                              onClick={() => handleUpdateBatchStatus(batch.id, 'running')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1 transition-all"
                              title="Start Classes (Change status to Running)"
                            >
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Start Batch</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(batch)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Edit Batch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch.id, batch.batch_name)}
                              className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Delete Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleOpenEnrollModal(batch)}
                        disabled={isFull}
                        className={`text-xs font-bold flex items-center gap-1.5 rounded-lg ${
                          isFull 
                            ? 'opacity-50 cursor-not-allowed bg-muted' 
                            : 'bg-primary text-primary-foreground shadow-md'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isFull ? 'Batch Full' : 'Enroll Student'}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RUNNING BATCHES SECTION (Requirement 4: Stats like students, fees, att) */}
      {/* ========================================================================= */}
      {(statusFilter === 'all' || statusFilter === 'running') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                Running Batches — Active Classes
              </h3>
              <Badge variant="success" className="text-xs font-bold">
                {runningBatches.length} In Session
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Real-time attendance & fee collection performance
            </p>
          </div>

          {runningBatches.length === 0 ? (
            <Card variant="glass" className="p-8 text-center border-dashed border-border">
              <PlayCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-muted-foreground">No active running batches right now.</p>
              <p className="text-xs text-muted-foreground mt-1">Start an upcoming batch when orientation begins!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {runningBatches.map(batch => {
                const stats = batchStatsMap.get(batch.id) || {
                  totalSeats: batch.total_seats || 30,
                  filledSeats: 0,
                  balanceSeats: 0,
                  fillPercentage: 0,
                  enrolledStudents: [],
                  totalCollected: 0,
                  expectedFeeRevenue: 0,
                  collectionPercentage: 0,
                  attendancePercentage: 0,
                  attendanceRecordCount: 0
                };

                return (
                  <Card
                    key={batch.id}
                    variant="glass"
                    className="p-5 border-border hover:border-emerald-500/40 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-lg group hover:shadow-emerald-500/5"
                  >
                    {/* Top Decorative Border */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

                    <div>
                      {/* Batch Title & Info */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={batch.mode === 'online' ? 'purple' : 'info'} className="text-[10px] font-bold uppercase">
                              {batch.mode === 'online' ? '🌐 Online' : '🏢 Offline'}
                            </Badge>
                            <Badge variant="success" className="text-[10px] font-bold uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Running
                            </Badge>
                          </div>
                          <h4 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                            {batch.batch_name}
                          </h4>
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                            {batch.course_name}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">Tutor</span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[120px] block">
                            {batch.tutor_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* ======================================================= */}
                      {/* THREE STATS: Total Students, Fee Collections, Attendance */}
                      {/* ======================================================= */}
                      <div className="grid grid-cols-3 gap-3 my-4">
                        
                        {/* 1. Total Students */}
                        <div className="p-3 rounded-xl bg-card/80 border border-border shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
                            <Users className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="text-2xl font-black text-foreground">
                            {stats.filledSeats}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            of {stats.totalSeats} seats
                          </span>
                        </div>

                        {/* 2. Fee Collections */}
                        <div className="p-3 rounded-xl bg-card/80 border border-border shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Collections</span>
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                          <div className="text-lg font-black text-emerald-400 truncate" title={formatCurrency(stats.totalCollected)}>
                            {formatCurrency(stats.totalCollected)}
                          </div>
                          <div className="w-full bg-muted-2 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${Math.min(100, stats.collectionPercentage)}%` }}
                            />
                          </div>
                        </div>

                        {/* 3. Attendance Percentage */}
                        <div className="p-3 rounded-xl bg-card/80 border border-border shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className={`text-2xl font-black ${
                            stats.attendancePercentage >= 80 ? 'text-emerald-400' : stats.attendancePercentage >= 65 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {stats.attendancePercentage}%
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {stats.attendanceRecordCount} records
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Bottom Action Footer for Running Batches */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1.5">
                        {onNavigateToAttendance && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onNavigateToAttendance(batch.id)}
                            className="text-xs font-bold border border-border hover:bg-muted text-foreground flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-primary" />
                            <span>Attendance</span>
                          </Button>
                        )}

                        {onNavigateToStudent && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onNavigateToStudent(batch.id)}
                            className="text-xs font-bold border border-border hover:bg-muted text-foreground flex items-center gap-1"
                          >
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>Roster</span>
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isAdminMode && (
                          <>
                            <button
                              onClick={() => handleUpdateBatchStatus(batch.id, 'completed')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30 flex items-center gap-1 transition-all"
                              title="Archive Batch as Completed"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Complete</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(batch)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Edit Batch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleOpenEnrollModal(batch)}
                          className="text-xs font-bold bg-primary text-primary-foreground flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Student</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. COMPLETED BATCHES SECTION */}
      {/* ========================================================================= */}
      {(statusFilter === 'all' || statusFilter === 'completed') && completedBatches.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-black uppercase tracking-wider text-foreground">
                Graduated / Completed Batches
              </h3>
              <Badge variant="purple" className="text-xs font-bold">
                {completedBatches.length}
              </Badge>
            </div>
          </div>

          <Card variant="glass" className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted-2 border-b border-border text-muted-foreground text-xs uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Batch Name</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Tutor</th>
                    <th className="px-4 py-3 text-center">Total Students</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-center">Final Attendance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {completedBatches.map(b => {
                    const stats = batchStatsMap.get(b.id) || {
                      filledSeats: 0,
                      totalCollected: 0,
                      attendancePercentage: 0
                    };
                    return (
                      <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">{b.batch_name}</td>
                        <td className="px-4 py-3 text-secondary-foreground">{b.course_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={b.mode === 'online' ? 'purple' : 'info'} className="text-[10px]">
                            {b.mode}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.tutor_name}</td>
                        <td className="px-4 py-3 text-center font-bold text-foreground">{stats.filledSeats}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(stats.totalCollected)}</td>
                        <td className="px-4 py-3 text-center font-bold text-primary">{stats.attendancePercentage}%</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleUpdateBatchStatus(b.id, 'running')}
                            className="text-xs text-primary font-bold hover:underline"
                          >
                            Reopen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CREATE / EDIT BATCH MODAL (Requirement 2: All 9 Fields)                */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-xl p-6 md:p-8 border-border shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsBatchModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                {editingBatch ? 'Edit Academy Batch' : 'Create New Academy Batch'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Configure batch syllabus intake, seat allocation, tuition fees, and staff assignments.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBatch} noValidate className="space-y-4">
              
              {/* 1. Batch Name & 2. Course Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Batch Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Batch 05 - Digital Marketing"
                    value={batchForm.batch_name}
                    onChange={e => setBatchForm({ ...batchForm, batch_name: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Course Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Master Digital Marketing & SEO"
                    value={batchForm.course_name}
                    onChange={e => setBatchForm({ ...batchForm, course_name: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 3. Mode (Online/Offline) & 4. Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Training Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchForm({ ...batchForm, mode: 'offline' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        batchForm.mode === 'offline'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>🏢 Offline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchForm({ ...batchForm, mode: 'online' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        batchForm.mode === 'online'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>🌐 Online</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={batchForm.status}
                    onChange={e => setBatchForm({ ...batchForm, status: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="upcoming">Upcoming (Admissions Open)</option>
                    <option value="running">Running (Classes in Session)</option>
                    <option value="completed">Completed (Graduated)</option>
                  </select>
                </div>
              </div>

              {/* 5. Total Seats & 6. Fee Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Total Seats Available
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={batchForm.total_seats}
                    onChange={e => setBatchForm({ ...batchForm, total_seats: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Tuition Fee Amount (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="e.g. 25000"
                    value={batchForm.fee_amount}
                    onChange={e => setBatchForm({ ...batchForm, fee_amount: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* 7. Start Date & 8. Assigned Tutor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Batch Start Date
                  </label>
                  <input
                    type="date"
                    value={batchForm.start_date}
                    onChange={e => setBatchForm({ ...batchForm, start_date: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Assigned Tutor</span>
                    {tutorsList.length > 0 && (
                      <span className="text-[10px] text-primary font-semibold">{tutorsList.length} Tutors Available</span>
                    )}
                  </label>
                  <select
                    value={batchForm.tutor_id}
                    onChange={e => setBatchForm({ ...batchForm, tutor_id: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">-- Unassigned Tutor --</option>
                    {(tutorsList.length > 0 ? tutorsList : staffList).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.designation || 'Academy Tutor'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 9. Assigned Counselors (Multi-Select Pickers) */}
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assigned Admissions Counselors</span>
                  {counselorsList.length > 0 && (
                    <span className="text-[10px] text-primary font-semibold">{counselorsList.length} Counselors Available</span>
                  )}
                </label>
                <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 max-h-36 overflow-y-auto">
                  {(counselorsList.length > 0 ? counselorsList : staffList).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No counselors found in staff profiles.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(counselorsList.length > 0 ? counselorsList : staffList).map(staff => {
                        const isSelected = batchForm.selectedCounselorIds.includes(staff.id);
                        return (
                          <button
                            type="button"
                            key={staff.id}
                            onClick={() => toggleCounselorSelection(staff.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              isSelected
                                ? 'bg-primary/20 text-primary border-primary/40 font-bold shadow-sm'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center border border-current text-[9px]">
                              {isSelected ? '✓' : '+'}
                            </span>
                            <span>{staff.full_name}</span>
                            <span className="text-[9px] opacity-70">({staff.designation || 'Counselor'})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Selected counselors will have direct intake attribution for this batch.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSubmittingBatch}
                >
                  Cancel
                </Button>
                <Button
                  id="save-batch-submit-btn"
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="bg-primary text-primary-foreground font-bold px-6 cursor-pointer"
                >
                  {isSubmittingBatch ? 'Saving Batch...' : editingBatch ? 'Update Batch' : 'Create Batch'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK ENROLL STUDENT MODAL                                             */}
      {/* ========================================================================= */}
      {isEnrollModalOpen && targetBatchForEnroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button
              onClick={() => setIsEnrollModalOpen(false)}
              className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Enroll Student
              </h2>
              <p className="text-xs text-primary font-semibold mt-1">
                Batch: {targetBatchForEnroll.batch_name} ({targetBatchForEnroll.course_name})
              </p>
            </div>

            {enrollError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudentEnroll} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Student Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Mohammed Farhan"
                  value={enrollForm.name}
                  onChange={e => setEnrollForm({ ...enrollForm, name: e.target.value })}
                  className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={enrollForm.phone}
                    onChange={e => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="student@gmail.com"
                    value={enrollForm.email}
                    onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Total Package Fee (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={enrollForm.total_fee}
                    onChange={e => setEnrollForm({ ...enrollForm, total_fee: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Initial Deposit Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={enrollForm.paid_fee}
                    onChange={e => setEnrollForm({ ...enrollForm, paid_fee: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {parseFloat(enrollForm.paid_fee) > 0 && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Deposit Payment Mode
                  </label>
                  <select
                    value={enrollForm.payment_mode}
                    onChange={e => setEnrollForm({ ...enrollForm, payment_mode: e.target.value })}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="online">Online / UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Enrolling Counselor
                </label>
                <select
                  value={enrollForm.counselor_id}
                  onChange={e => setEnrollForm({ ...enrollForm, counselor_id: e.target.value })}
                  className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">-- None / Direct Admission --</option>
                  {(counselorsList.length > 0 ? counselorsList : staffList).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.designation || 'Counselor'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEnrollModalOpen(false)}
                  disabled={isSubmittingEnroll}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEnroll}
                  className="bg-primary text-primary-foreground font-bold px-6"
                >
                  {isSubmittingEnroll ? 'Enrolling...' : 'Confirm Admission'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
