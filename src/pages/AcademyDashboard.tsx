import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import { AcademyBatches } from '../components/AcademyBatches';
import { compressSlipFile, extensionForBlob } from '../utils/imageUtils';
import { StudentAttendancePortal } from '../components/StudentAttendancePortal';
import { UnifiedEnrollmentModal } from '../components/UnifiedEnrollmentModal';
import { CounselorMonthlyReportView } from '../components/CounselorMonthlyReportView';
import { CourseTimelineTracker } from '../components/CourseTimelineTracker';
import { AcademyMasterDashboard } from '../components/academy/master-hub/AcademyMasterDashboard';
import { isStudentDiscontinued, getStudentFinancialState } from '../utils/dateAttribution';
import {
  Users, BookOpen, UserPlus, GraduationCap,
  Search, X,
  Layers, UserCheck,
  Eye, UploadCloud, Sun, Moon, TrendingUp, RotateCcw,
  Trash2, PlayCircle, Download, FileText, Edit2,
  Phone, Mail, Calendar, DollarSign, CreditCard, Receipt, Plus
} from 'lucide-react';

interface AcademyBatch {
  id: string;
  batch_name: string;
  batch_code: string;
  batch_type: string;
  status: string;
  tutor_id: string;
  created_at: string;
  total_seats?: number;
  fee_amount?: number;
  course_name?: string;
  mode?: string;
  start_date?: string;
  tutor?: { full_name: string };
}

interface AcademyStudent {
  id: string;
  counselor_name?: string;
  counselor_id?: string;
  registration_number: string;
  student_name: string;
  email: string;
  phone: string;
  batch_id: string;
  total_fees: number;
  paid_fee?: number;
  enrollment_date?: string;
  status: string;
  created_at: string;
  batch?: AcademyBatch;
}

interface AcademyInstallment {
  id: string;
  student_id: string;
  batch_id?: string;
  collected_by?: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes: string;
  proof_url?: string;
  created_at: string;
}

interface AcademyAttendance {
  id: string;
  batch_id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  marked_by: string;
}

export const AcademyDashboard: React.FC = () => {
  const { activeStaff, activeTab, setActiveTab, isAdminMode, theme, toggleTheme } = useApp();
  const dbClient = supabase;

  // Role permissions
  const isCounselor = (activeStaff?.designation || '').toLowerCase().includes('counselor');
  const isOwner = (activeStaff?.designation || '').toLowerCase().includes('owner');
  const isTutor = (activeStaff?.designation || '').toLowerCase().includes('tutor');
  const canManageStudents = isAdminMode || isCounselor || isOwner;

  useEffect(() => {
    if (isTutor && activeTab !== 'academy_attendance') {
      setActiveTab('academy_attendance');
    }
  }, [isTutor, activeTab]);


  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [batches, setBatches] = useState<AcademyBatch[]>([]);
  const [students, setStudents] = useState<AcademyStudent[]>([]);
  const [installments, setInstallments] = useState<AcademyInstallment[]>([]);
  const [attendances, setAttendances] = useState<AcademyAttendance[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals & Forms
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ name: '', code: '', type: 'Offline', status: 'Upcoming', tutor_id: '' });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    student_id_code: '',
    name: '',
    email: '',
    phone: '',
    batch_id: '',
    total_fees: '',
    counselor_id: '',
    initial_payment: '',
    payment_mode: 'UPI',
    enrollment_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  });

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<AcademyStudent | null>(null);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  // Admin Edit Installment state
  const [isEditInstallmentModalOpen, setIsEditInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<AcademyInstallment | null>(null);
  const [editInstallmentForm, setEditInstallmentForm] = useState({
    amount: '',
    date: '',
    method: 'UPI',
    notes: ''
  });
  const [isSavingEditInstallment, setIsSavingEditInstallment] = useState(false);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Tutor Salary', amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  // Attendance specific
  // (Attendance managed via StudentAttendancePortal)

  // View States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentView, setSelectedStudentView] = useState<AcademyStudent | null>(null);

  // Unified Enrollment Modal state
  const [isUnifiedEnrollOpen, setIsUnifiedEnrollOpen] = useState(false);
  const [targetBatchForEnroll, setTargetBatchForEnroll] = useState<any | null>(null);

  // Start Batch Manual Date Picker state
  const [activatingBatch, setActivatingBatch] = useState<AcademyBatch | null>(null);
  const [manualStartDate, setManualStartDate] = useState(new Date().toISOString().slice(0, 10));


  // Student Hub Layout & Filter
  const [studentViewLayout, setStudentViewLayout] = useState<'batch' | 'flat'>('batch');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'completed' | 'discontinued'>('all');

  // Admin Edit Student state
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AcademyStudent | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    student_id_code: '',
    name: '',
    phone: '',
    email: '',
    total_fees: '',
    batch_id: '',
    counselor_id: '',
    enrollment_date: ''
  });

  useEffect(() => {
    fetchAcademyData();
    fetchStaff();

    const handleDataChanged = () => {
      fetchAcademyData();
    };
    window.addEventListener('batches_data_changed', handleDataChanged);
    window.addEventListener('students_data_changed', handleDataChanged);
    return () => {
      window.removeEventListener('batches_data_changed', handleDataChanged);
      window.removeEventListener('students_data_changed', handleDataChanged);
    };
  }, [activeStaff]);

  const fetchStaff = async () => {
    const { data } = await dbClient.from('staff_profiles').select('id, full_name, designation').order('full_name');
    if (data) setStaffList(data);
  };

  const fetchAcademyAttendance = async () => {
    const { data } = await dbClient
      .from('student_attendance')
      .select('*')
      .order('attendance_date', { ascending: false });
    if (data) {
      setAttendances(data.map((a: any) => ({
        ...a,
        status: (a.status || '').toLowerCase() === 'present' ? 'Present' : 'Absent'
      })));
    }
  };

  const fetchAcademyData = async () => {
    setIsLoading(true);
    try {
      // 1. Batches
      let bDataList: any[] = [];
      try {
        const { data: bData, error: bErr } = await dbClient.from('batches').select('*').order('created_at', { ascending: false });
        if (!bErr && bData && bData.length > 0) {
          bDataList = bData;
        } else {
          const res = await fetch('/supabase-admin/rest/v1/batches?select=*&order=created_at.desc');
          if (res.ok) {
            bDataList = await res.json();
          } else if (bData) {
            bDataList = bData;
          }
        }
      } catch (batchErr) {
        console.warn('Direct batch query error in dashboard, attempting proxy fetch:', batchErr);
        const res = await fetch('/supabase-admin/rest/v1/batches?select=*&order=created_at.desc');
        if (res.ok) bDataList = await res.json();
      }

      if (bDataList && bDataList.length > 0) {
        setBatches(bDataList.map((b: any) => ({
          ...b,
          id: b.id,
          batch_name: b.batch_name,
          batch_code: b.batch_code || b.batch_name?.slice(0, 4).toUpperCase() || 'BTCH',
          batch_type: b.mode === 'online' ? 'Online' : 'Offline',
          mode: b.mode || 'offline',
          status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Upcoming',
          tutor_id: b.tutor_id,
          created_at: b.created_at,
          total_seats: b.total_seats,
          fee_amount: b.fee_amount
        })));
      }

      // 2. Students
      let staffDataList: any[] = [];
      try {
        const { data: stData } = await dbClient.from('staff_profiles').select('id, full_name, designation').order('full_name');
        if (stData && stData.length > 0) staffDataList = stData;
        else {
          const stRes = await fetch('/supabase-admin/rest/v1/staff_profiles?select=id,full_name,designation');
          if (stRes.ok) staffDataList = await stRes.json();
        }
      } catch (_) { }
      if (staffDataList.length > 0) setStaffList(staffDataList);

      const staffMap = new Map<string, string>();
      staffDataList.forEach((st: any) => staffMap.set(st.id, st.full_name));

      const batchesMap = new Map<string, any>();
      bDataList.forEach((b: any) => batchesMap.set(b.id, b));

      let sData: any[] = [];
      const { data: sRes, error: sErr } = await dbClient.from('students').select('*').order('created_at', { ascending: false });
      if (!sErr && sRes && sRes.length > 0) {
        sData = sRes;
      } else {
        try {
          const pRes = await fetch('/supabase-admin/rest/v1/students?select=*&order=created_at.desc');
          if (pRes.ok) sData = await pRes.json();
        } catch (_) { }
      }
      if (sData) {
        const formattedStudents = sData.map((s: any) => {
          const isDiscontinued = isStudentDiscontinued(s);
          const cleanCode = s.student_id_code?.replace(/\s*\[DISCONTINUED\]/g, '') || `STU-${s.id.slice(0, 4)}`;
          const assignedBatch = batchesMap.get(s.batch_id);
          const counselorName = s.counselor_id ? staffMap.get(s.counselor_id) || 'Assigned Counselor' : 'Direct / Admin';
          const isBatchCompleted = (assignedBatch?.status || '').toLowerCase() === 'completed';
          const isStudentCompleted = isBatchCompleted || (s.status || '').toLowerCase() === 'completed';

          return {
            id: s.id,
            student_id_code: s.student_id_code,
            registration_number: cleanCode,
            student_name: s.name,
            name: s.name,
            email: s.email || '',
            phone: s.phone || '',
            batch_id: s.batch_id,
            batch: assignedBatch,
            counselor_id: s.counselor_id,
            counselor_name: counselorName,
            total_fees: Number(s.total_fee) || 0,
            total_fee: Number(s.total_fee) || 0,
            paid_fee: Number(s.paid_fee) || 0,
            enrollment_date: s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : ''),
            admission_date: s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : ''),
            status: isDiscontinued ? 'Discontinued' : isStudentCompleted ? 'Completed' : 'Active',
            created_at: s.created_at
          };
        });
        setStudents(formattedStudents);

        // Keep selected student view in sync with refreshed data
        setSelectedStudentView(prev => {
          if (!prev) return null;
          const matching = formattedStudents.find((s: any) => s.id === prev.id);
          return matching ? { ...prev, ...matching } : prev;
        });
      }

      // 3. Installments / Fee collections
      let iData: any[] = [];
      const { data: iRes, error: iErr } = await dbClient.from('fee_collections').select('*').order('created_at', { ascending: false });
      if (!iErr && iRes && iRes.length > 0) {
        iData = iRes;
      } else {
        try {
          const pfRes = await fetch('/supabase-admin/rest/v1/fee_collections?select=*&order=created_at.desc');
          if (pfRes.ok) iData = await pfRes.json();
        } catch (_) { }
      }
      if (iData) {
        setInstallments(iData.map((f: any) => {
          let proofUrl = f.payment_proof_url || f.proof_url || f.slip_url || '';
          let cleanNotes = f.notes || '';
          if (!proofUrl && cleanNotes.includes('[Slip:')) {
            const match = cleanNotes.match(/\[Slip:\s*([^\]]+)\]/);
            if (match) {
              proofUrl = match[1].trim();
              cleanNotes = cleanNotes.replace(/\[Slip:\s*[^\]]+\]/, '').trim();
            }
          }
          return {
            id: f.id,
            student_id: f.student_id,
            batch_id: f.batch_id,
            collected_by: f.collected_by,
            amount: Number(f.amount) || 0,
            amount_paid: Number(f.amount) || 0,
            installment_month: f.installment_month,
            payment_date: f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            payment_method: f.payment_mode ? f.payment_mode.toUpperCase() : 'ONLINE',
            payment_mode: f.payment_mode,
            notes: cleanNotes,
            proof_url: proofUrl,
            created_at: f.created_at
          };
        }));
      }

      // 4. Attendance
      await fetchAcademyAttendance();



    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleToggleStudentStatus = async (student: AcademyStudent) => {
    const isCurrentlyDiscontinued = isStudentDiscontinued(student);
    const willDiscontinue = !isCurrentlyDiscontinued;
    const cleanCode = (student.registration_number || student.student_name || '').replace(/\s*\[DISCONTINUED\]/gi, '').trim();
    const newCode = willDiscontinue
      ? `${cleanCode} [DISCONTINUED]`
      : cleanCode;

    try {
      const res = await fetch(`/supabase-admin/rest/v1/students?id=eq.${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id_code: newCode,
          status: willDiscontinue ? 'Discontinued' : 'Active'
        })
      });
      if (!res.ok) throw new Error('Failed to update student status');
      if (willDiscontinue) {
        localStorage.setItem(`student_status_${student.id}`, 'discontinued');
      } else {
        localStorage.removeItem(`student_status_${student.id}`);
      }
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      setSelectedStudentView(prev => prev ? { 
        ...prev, 
        status: willDiscontinue ? 'Discontinued' : 'Active',
        registration_number: cleanCode
      } : null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteStudent = async (student: AcademyStudent) => {
    if (!confirm(`Are you sure you want to permanently delete student "${student.student_name}" (${student.registration_number})? All payment and admission records will be permanently removed.`)) {
      return;
    }
    try {
      await fetch(`/supabase-admin/rest/v1/fee_collections?student_id=eq.${student.id}`, { method: 'DELETE' }).catch(() => { });
      await fetch(`/supabase-admin/rest/v1/student_attendance?student_id=eq.${student.id}`, { method: 'DELETE' }).catch(() => { });
      const res = await fetch(`/supabase-admin/rest/v1/students?id=eq.${student.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student from database');
      setSelectedStudentView(null);
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      alert(`Student "${student.student_name}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    const studentCount = students.filter(s => s.batch_id === batchId).length;
    const confirmMsg = studentCount > 0
      ? `This batch "${batchName}" has ${studentCount} students enrolled. Deleting it will permanently delete the batch and all associated dummy student & fee records. Proceed?`
      : `Are you sure you want to permanently delete batch "${batchName}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      await fetch(`/supabase-admin/rest/v1/fee_collections?batch_id=eq.${batchId}`, { method: 'DELETE' }).catch(() => { });
      await fetch(`/supabase-admin/rest/v1/student_attendance?batch_id=eq.${batchId}`, { method: 'DELETE' }).catch(() => { });
      await fetch(`/supabase-admin/rest/v1/students?batch_id=eq.${batchId}`, { method: 'DELETE' }).catch(() => { });
      const res = await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batchId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete batch from database');

      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      alert(`Batch "${batchName}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartBatchWithDate = async (batchId: string, startDate: string) => {
    try {
      await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'running', start_date: startDate })
      });
      setActivatingBatch(null);
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
    } catch (err: any) {
      alert(`Failed to start batch: ${err.message}`);
    }
  };

  const handleOpenEditStudentModal = (student: AcademyStudent) => {
    setEditingStudent(student);
    setEditStudentForm({
      student_id_code: student.registration_number || '',
      name: student.student_name,
      phone: student.phone || '',
      email: student.email || '',
      total_fees: String(student.total_fees || ''),
      batch_id: student.batch_id || '',
      counselor_id: student.counselor_id || '',
      enrollment_date: student.enrollment_date || (student.created_at ? student.created_at.slice(0, 10) : '')
    });
    setIsEditStudentModalOpen(true);
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const trimmedCode = editStudentForm.student_id_code.trim();
      const payload: any = {
        name: editStudentForm.name.trim(),
        phone: editStudentForm.phone.trim(),
        email: editStudentForm.email.trim() || null,
        total_fee: parseFloat(editStudentForm.total_fees) || 0,
        batch_id: editStudentForm.batch_id || editingStudent.batch_id,
        counselor_id: editStudentForm.counselor_id || null,
        enrollment_date: editStudentForm.enrollment_date || editingStudent.enrollment_date || null
      };
      if (trimmedCode) {
        payload.student_id_code = trimmedCode;
      }
      const res = await fetch(`/supabase-admin/rest/v1/students?id=eq.${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update student details');
      setIsEditStudentModalOpen(false);
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      setSelectedStudentView(prev => prev ? {
        ...prev,
        registration_number: trimmedCode || prev.registration_number,
        student_name: payload.name,
        phone: payload.phone,
        email: payload.email || '',
        total_fees: payload.total_fee,
        batch_id: payload.batch_id,
        counselor_id: payload.counselor_id || undefined,
        counselor_name: staffList.find(s => s.id === payload.counselor_id)?.full_name || 'Direct / Admin'
      } : null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name) return;
    try {
      const batchPayload = {
        batch_name: batchForm.name.trim(),
        course_name: batchForm.name.trim(),
        mode: batchForm.type.toLowerCase(),
        status: batchForm.status.toLowerCase(),
        tutor_id: batchForm.tutor_id || null,
        total_seats: 30,
        fee_amount: 25000,
        start_date: new Date().toISOString().split('T')[0]
      };
      const { error } = await dbClient.from('batches').insert([batchPayload]);
      if (error) {
        const proxyRes = await fetch('/supabase-admin/rest/v1/batches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([batchPayload])
        });
        if (!proxyRes.ok) throw error;
      }
      setIsBatchModalOpen(false);
      setBatchForm({ name: '', code: '', type: 'Offline', status: 'Upcoming', tutor_id: '' });
      fetchAcademyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.batch_id || !studentForm.total_fees) return;

    try {
      const studentCode = studentForm.student_id_code?.trim()
        ? studentForm.student_id_code.trim()
        : `STU-${new Date().getFullYear()}-${String(students.length + 101).padStart(3, '0')}`;
      const enrollingCounselorId = studentForm.counselor_id || (isCounselor ? activeStaff?.id : null);
      const initialAmt = parseFloat(studentForm.initial_payment) || 0;

      const effEnrollDate = studentForm.enrollment_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const histCreatedAt = new Date(effEnrollDate + 'T12:00:00Z').toISOString();

      const studentPayload: any = {
        student_id_code: studentCode,
        name: studentForm.name.trim(),
        email: studentForm.email.trim() || null,
        phone: studentForm.phone.trim() || null,
        batch_id: studentForm.batch_id,
        total_fee: parseFloat(studentForm.total_fees) || 0,
        paid_fee: initialAmt,
        counselor_id: enrollingCounselorId,
        enrollment_date: effEnrollDate,
        created_at: histCreatedAt
      };

      let newStudent: any = null;
      const { data, error } = await dbClient.from('students').insert([studentPayload]).select().single();
      if (!error && data) {
        newStudent = data;
      } else {
        const res = await fetch('/supabase-admin/rest/v1/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([studentPayload])
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || error?.message || 'Failed to register student');
        }
        const resArr = await res.json();
        newStudent = resArr[0];
      }

      if (initialAmt > 0 && newStudent?.id) {
        const instMonth = new Date(effEnrollDate).toLocaleString('default', { month: 'long', year: 'numeric' });
        const feePayload = {
          student_id: newStudent.id,
          batch_id: studentForm.batch_id,
          amount: initialAmt,
          payment_mode: (studentForm.payment_mode || 'UPI').toLowerCase(),
          installment_month: instMonth,
          notes: 'Initial Admission / Registration Fee',
          collected_by: activeStaff?.id || enrollingCounselorId || null,
          created_at: histCreatedAt
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

      setIsStudentModalOpen(false);
      setStudentForm({
        student_id_code: '',
        name: '',
        email: '',
        phone: '',
        batch_id: '',
        total_fees: '',
        counselor_id: isCounselor ? (activeStaff?.id || '') : '',
        initial_payment: '',
        payment_mode: 'UPI',
        enrollment_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      });
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForFee || !installmentForm.amount) return;

    try {
      setIsUploadingProof(true);
      const pMode = installmentForm.method === 'Cash' ? 'cash' : installmentForm.method === 'Bank Transfer' ? 'bank_transfer' : 'online';
      const curMonth = new Date(installmentForm.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      const amt = parseFloat(installmentForm.amount) || 0;

      let uploadedSlipUrl = '';
      if (proofFile) {
        const compressedSlip = await compressSlipFile(proofFile);
        const ext = extensionForBlob(compressedSlip);
        const fileName = `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

        let uploadRes = await dbClient.storage.from('academy_slips').upload(fileName, compressedSlip, {
          contentType: compressedSlip.type,
          cacheControl: '31536000'
        });
        if (uploadRes.error) {
          uploadRes = await dbClient.storage.from('payment_slips').upload(fileName, compressedSlip, {
            contentType: compressedSlip.type,
            cacheControl: '31536000'
          });
        }
        if (!uploadRes.error) {
          const bucketUsed = uploadRes.data?.path?.includes('academy_slips') ? 'academy_slips' : 'payment_slips';
          const { data: pubData } = dbClient.storage.from(bucketUsed).getPublicUrl(fileName);
          uploadedSlipUrl = pubData?.publicUrl || '';
        }
      }

      let notesWithProof = installmentForm.notes?.trim() || '';
      if (uploadedSlipUrl) {
        notesWithProof = notesWithProof ? `${notesWithProof} [Slip: ${uploadedSlipUrl}]` : `[Slip: ${uploadedSlipUrl}]`;
      }

      const feePayload = {
        student_id: selectedStudentForFee.id,
        batch_id: selectedStudentForFee.batch_id,
        collected_by: activeStaff?.id || selectedStudentForFee.counselor_id || null,
        amount: amt,
        payment_mode: pMode,
        installment_month: curMonth,
        notes: notesWithProof || 'Fee payment',
        created_at: installmentForm.date ? new Date(installmentForm.date + 'T12:00:00Z').toISOString() : new Date().toISOString()
      };

      // Persist fee collection: try admin proxy first to ensure bypass of RLS
      let feeSaved = false;
      try {
        const fRes = await fetch('/supabase-admin/rest/v1/fee_collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([feePayload])
        });
        if (fRes.ok) {
          const data = await fRes.json().catch(() => []);
          if (Array.isArray(data) && data.length > 0) feeSaved = true;
        }
      } catch (adminErr) {
        console.warn('Admin proxy insert fee error:', adminErr);
      }

      if (!feeSaved) {
        const { error } = await dbClient.from('fee_collections').insert([feePayload]);
        if (error) throw error;
      }

      // Update student paid fee with accurate sum
      const existingPaid = installments
        .filter(i => i.student_id === selectedStudentForFee.id)
        .reduce((sum, i) => sum + Number(i.amount_paid), 0);
      const newTotalPaid = existingPaid + amt;

      try {
        await fetch(`/supabase-admin/rest/v1/students?id=eq.${selectedStudentForFee.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ paid_fee: newTotalPaid })
        });
      } catch (_) {
        await dbClient.from('students').update({ paid_fee: newTotalPaid }).eq('id', selectedStudentForFee.id);
      }

      // Optimistically update selected student view
      setSelectedStudentView(prev => prev && prev.id === selectedStudentForFee.id ? {
        ...prev,
        paid_fee: newTotalPaid
      } : prev);

      setIsInstallmentModalOpen(false);
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });
      setProofFile(null);
      setProofPreview(null);
      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleOpenEditInstallment = (inst: AcademyInstallment) => {
    setEditingInstallment(inst);
    setEditInstallmentForm({
      amount: String(inst.amount_paid),
      date: inst.payment_date || (inst.created_at ? inst.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
      method: inst.payment_method === 'CASH' ? 'Cash' : (inst.payment_method === 'BANK TRANSFER' || inst.payment_method === 'BANK_TRANSFER') ? 'Bank Transfer' : 'UPI',
      notes: inst.notes || ''
    });
    setIsEditInstallmentModalOpen(true);
  };

  const handleSaveEditInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstallment) return;

    setIsSavingEditInstallment(true);
    try {
      const amt = parseFloat(editInstallmentForm.amount) || 0;
      const pMode = editInstallmentForm.method === 'Cash' ? 'cash' : editInstallmentForm.method === 'Bank Transfer' ? 'bank_transfer' : 'online';
      const curMonth = new Date(editInstallmentForm.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      const newCreatedAt = editInstallmentForm.date ? new Date(editInstallmentForm.date + 'T12:00:00Z').toISOString() : editingInstallment.created_at;

      // Preserve slip URL if previously present
      let finalNotes = editInstallmentForm.notes.trim();
      if (editingInstallment.proof_url && !finalNotes.includes(editingInstallment.proof_url)) {
        finalNotes = finalNotes ? `${finalNotes} [Slip: ${editingInstallment.proof_url}]` : `[Slip: ${editingInstallment.proof_url}]`;
      }

      const payload: any = {
        amount: amt,
        payment_mode: pMode,
        installment_month: curMonth,
        notes: finalNotes || 'Fee installment',
        created_at: newCreatedAt
      };

      // 1. Recalculate student total paid fee from all installments optimistically
      const updatedInstallments = installments.map(i =>
        i.id === editingInstallment.id
          ? {
            ...i,
            amount_paid: amt,
            payment_date: editInstallmentForm.date,
            payment_method: pMode.toUpperCase(),
            notes: editInstallmentForm.notes.trim(),
            created_at: newCreatedAt
          }
          : i
      );

      const newTotalPaid = updatedInstallments
        .filter(i => i.student_id === editingInstallment.student_id)
        .reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);

      // Instant optimistic UI updates across lists and open drawer
      setInstallments(updatedInstallments);
      setStudents(prev => prev.map(s => s.id === editingInstallment.student_id ? {
        ...s,
        paid_fee: newTotalPaid
      } : s));
      setSelectedStudentView(prev => prev && prev.id === editingInstallment.student_id ? {
        ...prev,
        paid_fee: newTotalPaid
      } : prev);

      // 2. Persist to fee_collections via /supabase-admin first to guarantee RLS bypass
      let feeSaved = false;
      try {
        const res = await fetch(`/supabase-admin/rest/v1/fee_collections?id=eq.${editingInstallment.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json().catch(() => []);
          if (Array.isArray(data) && data.length > 0) {
            feeSaved = true;
          }
        }
      } catch (err) {
        console.warn('Admin proxy update fee_collections error, attempting direct supabase:', err);
      }

      if (!feeSaved) {
        const { error: updErr } = await dbClient
          .from('fee_collections')
          .update(payload)
          .eq('id', editingInstallment.id);
        if (updErr) throw updErr;
      }

      // 3. Persist new paid_fee to students table via /supabase-admin
      try {
        await fetch(`/supabase-admin/rest/v1/students?id=eq.${editingInstallment.student_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ paid_fee: newTotalPaid })
        });
      } catch (_) {
        await dbClient.from('students').update({ paid_fee: newTotalPaid }).eq('id', editingInstallment.student_id);
      }

      setIsEditInstallmentModalOpen(false);
      setEditingInstallment(null);

      // 4. Reload all data to ensure server-client alignment
      await fetchAcademyData();

      // 5. Broadcast real-time events across all hubs and views
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
    } catch (err: any) {
      console.error('Error updating installment:', err);
      alert(`Error updating installment: ${err.message}`);
      await fetchAcademyData();
    } finally {
      setIsSavingEditInstallment(false);
    }
  };

  const handleDeleteInstallment = async (inst: AcademyInstallment) => {
    if (!confirm(`Are you sure you want to delete this payment of ₹${inst.amount_paid.toLocaleString()} recorded on ${inst.payment_date}? The student's total paid fees will be recalculated automatically.`)) {
      return;
    }

    try {
      // 1. Optimistic calculation
      const remainingInstallments = installments.filter(i => i.id !== inst.id);
      const newTotalPaid = remainingInstallments
        .filter(i => i.student_id === inst.student_id)
        .reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);

      // Instant optimistic UI updates
      setInstallments(remainingInstallments);
      setStudents(prev => prev.map(s => s.id === inst.student_id ? { ...s, paid_fee: newTotalPaid } : s));
      setSelectedStudentView(prev => prev && prev.id === inst.student_id ? { ...prev, paid_fee: newTotalPaid } : prev);

      // 2. Delete via /supabase-admin first
      let deleted = false;
      try {
        const res = await fetch(`/supabase-admin/rest/v1/fee_collections?id=eq.${inst.id}`, {
          method: 'DELETE'
        });
        if (res.ok) deleted = true;
      } catch (err) {
        console.warn('Admin proxy delete error, attempting direct supabase:', err);
      }

      if (!deleted) {
        const { error } = await dbClient.from('fee_collections').delete().eq('id', inst.id);
        if (error) throw error;
      }

      // 3. Update student's paid_fee
      try {
        await fetch(`/supabase-admin/rest/v1/students?id=eq.${inst.student_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ paid_fee: newTotalPaid })
        });
      } catch (_) {
        await dbClient.from('students').update({ paid_fee: newTotalPaid }).eq('id', inst.student_id);
      }

      await fetchAcademyData();
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
    } catch (err: any) {
      console.error('Error deleting payment record:', err);
      alert(`Error deleting payment record: ${err.message}`);
      await fetchAcademyData();
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    try {
      const { error } = await dbClient.from('expenses').insert([{
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount) || 0,
        expense_date: expenseForm.date,
        description: expenseForm.description
      }]);
      if (error) throw error;
      setIsExpenseModalOpen(false);
      setExpenseForm({ category: 'Tutor Salary', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
      fetchAcademyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- EXPORT FUNCTIONS FOR STUDENTS & ACADEMY OVERVIEW ---
  const handleExportStudentsExcel = () => {
    try {
      const csvRows: any[][] = [];
      csvRows.push([`Tech Ads ERP - Academy Students Directory`]);
      csvRows.push([`Generated on: ${new Date().toLocaleDateString('en-IN')}`, `Total Enrolled: ${students.length}`]);
      csvRows.push([]);
      csvRows.push(['Reg. No', 'Student Name', 'Assigned Batch', 'Phone', 'Email', 'Counselor', 'Total Fees (INR)', 'Paid Amount (INR)', 'Balance Due (INR)', 'Status', 'Admission Date']);

      const filteredExport = students.filter(s => {
        if (studentStatusFilter === 'active') return s.status !== 'Discontinued' && s.status !== 'Completed';
        if (studentStatusFilter === 'completed') return s.status === 'Completed';
        if (studentStatusFilter === 'discontinued') return s.status === 'Discontinued';
        return true;
      });

      filteredExport.forEach(s => {
        const batch = batches.find(b => b.id === s.batch_id);
        const counselor = staffList.find(staff => staff.id === s.counselor_id);
        const sInst = installments.filter(i => i.student_id === s.id);
        const paid = sInst.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
        const balance = s.status === 'Discontinued' ? 0 : Math.max(0, (s.total_fees || 0) - paid);

        csvRows.push([
          s.registration_number || s.id,
          s.student_name,
          batch?.batch_name || 'Unassigned',
          s.phone || '-',
          s.email || '-',
          counselor?.full_name || 'Direct / Management',
          s.total_fees || 0,
          paid,
          balance,
          s.status || 'Active',
          s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : '-')
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Academy_Students_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Error exporting students to Excel: ' + e.message);
    }
  };

  const handleExportStudentsPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const filteredExport = students.filter(s => {
        if (studentStatusFilter === 'active') return s.status !== 'Discontinued' && s.status !== 'Completed';
        if (studentStatusFilter === 'completed') return s.status === 'Completed';
        if (studentStatusFilter === 'discontinued') return s.status === 'Discontinued';
        return true;
      });

      const rowsHtml = filteredExport.map(s => {
        const batch = batches.find(b => b.id === s.batch_id);
        const counselor = staffList.find(staff => staff.id === s.counselor_id);
        const sInst = installments.filter(i => i.student_id === s.id);
        const paid = sInst.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
        const balance = s.status === 'Discontinued' ? 0 : Math.max(0, (s.total_fees || 0) - paid);

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-family: monospace; font-weight: bold;">${s.registration_number || '-'}</td>
            <td style="padding: 8px; font-weight: bold;">${s.student_name}</td>
            <td style="padding: 8px;">${batch?.batch_name || '-'}</td>
            <td style="padding: 8px;">${s.phone || '-'}</td>
            <td style="padding: 8px;">${counselor?.full_name || 'Direct'}</td>
            <td style="padding: 8px; text-align: right;">₹${(s.total_fees || 0).toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: #059669; font-weight: bold;">₹${paid.toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; color: ${balance > 0 ? '#e11d48' : '#64748b'}; font-weight: bold;">₹${balance.toLocaleString()}</td>
            <td style="padding: 8px; text-align: center; font-weight: bold; color: ${s.status === 'Completed' ? '#9333ea' : s.status === 'Discontinued' ? '#e11d48' : '#059669'};">${s.status || 'Active'}</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Academy Students Directory</title>
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
            <h1>Tech Ads ERP - Academy Students Directory</h1>
            <p>Generated on: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> &bull; Total Students: <strong>${filteredExport.length}</strong></p>
            <table>
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Student Name</th>
                  <th>Assigned Batch</th>
                  <th>Contact</th>
                  <th>Counselor</th>
                  <th class="right">Total Package</th>
                  <th class="right">Paid</th>
                  <th class="right">Balance Due</th>
                  <th class="center">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
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
      alert('Error exporting Students PDF: ' + e.message);
    }
  };

  // --- RENDERS ---

  const renderOverview = () => {
    return (
      <AcademyMasterDashboard
        batches={batches}
        students={students}
        installments={installments}
        attendances={attendances}
        staffList={staffList}
        activeStaff={activeStaff}
        isAdminMode={isAdminMode}
        onNavigateToBatches={() => setActiveTab('academy_batches')}
        onNavigateToStudents={(_batchId) => {
          setActiveTab('academy_students');
        }}
        onNavigateToAttendance={(_batchId) => {
          setActiveTab('academy_attendance');
        }}
        onNavigateToReports={(_counselorId) => {
          setActiveTab('academy_reports');
        }}
        onNavigateToFinances={() => setActiveTab('finance')}
        onEnrollStudent={(targetBatch) => {
          setTargetBatchForEnroll(targetBatch || null);
          setIsUnifiedEnrollOpen(true);
        }}
        onRecordPayment={(student) => {
          setSelectedStudentForFee(student);
          setIsInstallmentModalOpen(true);
        }}
        onRefreshData={fetchAcademyData}
      />
    );
  };


  const renderStudents = () => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = students?.filter(s => {
      if (studentStatusFilter === 'active' && (s.status === 'Discontinued' || s.status === 'Completed')) return false;
      if (studentStatusFilter === 'completed' && s.status !== 'Completed') return false;
      if (studentStatusFilter === 'discontinued' && s.status !== 'Discontinued') return false;

      if (!q) return true;
      return (
        s.student_name.toLowerCase().includes(q) ||
        s.registration_number.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    }) || [];

    // Group students by their assigned Batch
    const batchesWithStudents = batches.map(b => {
      const bStudents = filtered.filter(s => s.batch_id === b.id);
      const isUpcoming = (b.status || '').toLowerCase() === 'upcoming';
      const isRunning = (b.status || '').toLowerCase() === 'running';
      const isCompleted = (b.status || '').toLowerCase() === 'completed';
      const totalEnrolled = bStudents.length;
      const totalCapacity = b.total_seats || 30;

      let totalBatchFees = 0;
      let totalBatchPaid = 0;
      let totalBatchDue = 0;

      bStudents.forEach(s => {
        const studentInstallments = installments?.filter(i => i.student_id === s.id) || [];
        const paid = studentInstallments.reduce((isum, i) => isum + Number(i.amount_paid || 0), 0) || Number(s.paid_fee || 0);
        const fin = getStudentFinancialState(s, paid);
        totalBatchFees += fin.effectiveExpectedFee;
        totalBatchPaid += paid;
        totalBatchDue += fin.pendingDue;
      });

      return {
        batch: b,
        students: bStudents,
        isUpcoming,
        isRunning,
        isCompleted,
        totalEnrolled,
        totalCapacity,
        totalBatchFees,
        totalBatchPaid,
        totalBatchDue
      };
    });

    // Unassigned students (if any exist without a batch)
    const unassignedStudents = filtered.filter(s => !batches.some(b => b.id === s.batch_id));

    // Visible batches when searching
    const visibleBatches = batchesWithStudents.filter(item => {
      if (!q) return true;
      if (item.students.length > 0) return true;
      return item.batch.batch_name.toLowerCase().includes(q) || (item.batch.course_name && item.batch.course_name.toLowerCase().includes(q));
    });

    return (
      <div className="space-y-6 animate-fade-in flex flex-col lg:flex-row gap-6 h-full">
        {/* Main Students List Grouped by Batches */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 p-4 rounded-2xl border border-border">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Student Hub</span>
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Organized by Academy Batches &bull; Track registrations, installments, and fee collections
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search student, reg no, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* View Layout Switcher: By Batch vs All Roster */}
              <div className="flex items-center p-1 rounded-xl bg-muted border border-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStudentViewLayout('batch')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${studentViewLayout === 'batch' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  title="Group students by Academy Batches"
                >
                  By Batch
                </button>
                <button
                  type="button"
                  onClick={() => setStudentViewLayout('flat')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${studentViewLayout === 'flat' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  title="View full flat student roster"
                >
                  All Roster
                </button>
              </div>

              {/* Requirement 3: Restored direct Quick Admission */}
              <Button
                onClick={() => {
                  setTargetBatchForEnroll(null);
                  setIsUnifiedEnrollOpen(true);
                }}
                className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold bg-primary text-primary-foreground shadow-md rounded-xl cursor-pointer"
                title="Register a new student"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Register Student</span>
              </Button>

              {/* Export Options for Students Hub */}
              <button
                type="button"
                onClick={handleExportStudentsExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Export student directory to Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handleExportStudentsPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Export student directory to PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStudentStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${studentStatusFilter === 'all'
                  ? 'bg-primary/15 text-primary border-primary/30 shadow-sm font-black'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
            >
              All Students ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${studentStatusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm font-black'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
            >
              Active ({students.filter(s => s.status !== 'Discontinued' && s.status !== 'Completed').length})
            </button>
            <button
              type="button"
              onClick={() => setStudentStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${studentStatusFilter === 'completed'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-sm font-black'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
            >
              Completed ({students.filter(s => s.status === 'Completed').length})
            </button>
            <button
              type="button"
              onClick={() => setStudentStatusFilter('discontinued')}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${studentStatusFilter === 'discontinued'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-sm font-black'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
            >
              Discontinued ({students.filter(s => s.status === 'Discontinued').length})
            </button>
          </div>

          {/* Batches Sections or Flat Roster View */}
          {studentViewLayout === 'flat' ? (
            <Card variant="glass" className="overflow-hidden border border-border shadow-md">
              <div className="p-4 bg-muted-2 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">All Enrolled Students ({filtered.length})</h4>
                  <p className="text-xs text-muted-foreground">Comprehensive student directory across all batches</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Reg. No</th>
                      <th className="px-4 py-2.5">Student Name</th>
                      <th className="px-4 py-2.5">Assigned Batch</th>
                      <th className="px-4 py-2.5">Contact</th>
                      <th className="px-4 py-2.5">Counselor</th>
                      <th className="px-4 py-2.5 text-right">Package</th>
                      <th className="px-4 py-2.5 text-right">Paid</th>
                      <th className="px-4 py-2.5 text-right">Balance</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(s => {
                      const batch = batches.find(b => b.id === s.batch_id);
                      const studentInstallments = installments?.filter(i => i.student_id === s.id) || [];
                      const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
                      const balance = Math.max(0, s.total_fees - paid);

                      return (
                        <tr key={s.id} onClick={() => setSelectedStudentView(s)} className="hover:bg-muted/60 cursor-pointer">
                          <td className="px-4 py-3 font-mono text-primary font-bold">{s.registration_number}</td>
                          <td className="px-4 py-3 font-bold text-foreground">{s.student_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-semibold">
                              {batch ? batch.batch_name : 'Direct / Unassigned'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{s.phone || s.email || '-'}</td>
                          <td className="px-4 py-3">
                            {s.counselor_name ? <Badge variant="indigo">{s.counselor_name}</Badge> : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.total_fees)}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(paid)}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            {s.status === 'Discontinued' ? (
                              <span className="text-muted-foreground text-[11px] font-semibold italic">Waived (Discontinued)</span>
                            ) : (
                              <span className="text-rose-400">{formatCurrency(balance)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={s.status === 'Discontinued' ? 'error' : s.status === 'Completed' ? 'purple' : 'success'} className="text-[10px] font-bold">
                              {s.status || 'Active'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentView(s)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border cursor-pointer"
                              >
                                Details
                              </button>
                              {canManageStudents && (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedStudentForFee(s); setIsInstallmentModalOpen(true); }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                                  title="Add payment installment"
                                >
                                  + Pay
                                </button>
                              )}
                              {isAdminMode && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(s)}
                                  className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Permanently delete dummy student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-xs">
                          No students found matching current filter or search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {visibleBatches.map(({ batch, students: bStudents, isUpcoming, isRunning, isCompleted, totalEnrolled, totalCapacity, totalBatchPaid, totalBatchDue }) => (
                <Card
                  key={batch.id}
                  variant="glass"
                  className={`overflow-hidden border transition-all duration-300 shadow-md ${isRunning
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                      : isUpcoming
                        ? 'border-amber-500/30 bg-amber-500/[0.02]'
                        : isCompleted
                          ? 'border-purple-500/30 bg-purple-500/[0.02]'
                          : 'border-border'
                    }`}
                >
                  {/* Batch Header Bar */}
                  <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isRunning
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : isUpcoming
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : isCompleted
                          ? 'bg-purple-500/10 border-purple-500/20'
                          : 'bg-muted-2 border-border'
                    }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-foreground">
                          {batch.batch_name}
                        </span>
                        <Badge
                          variant={isRunning ? 'success' : isUpcoming ? 'warning' : isCompleted ? 'purple' : 'info'}
                          className="text-[10px] font-bold uppercase"
                        >
                          {isRunning ? '● Active Class' : isUpcoming ? 'Upcoming' : isCompleted ? '🎓 Completed' : batch.status}
                        </Badge>
                        <Badge
                          variant={batch.batch_type === 'Online' ? 'purple' : 'info'}
                          className="text-[10px] font-bold uppercase"
                        >
                          {batch.batch_type || 'Offline'}
                        </Badge>
                        {batch.course_name && (
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            &bull; {batch.course_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium flex-wrap">
                        <span>Roster: <strong className="text-foreground">{totalEnrolled}</strong> / {totalCapacity} seats filled</span>
                        <span>&bull;</span>
                        <span>Package: <strong className="text-foreground">{formatCurrency(batch.fee_amount || 25000)}</strong></span>
                        <span>&bull;</span>
                        <span className="text-emerald-400 font-bold">Collected: {formatCurrency(totalBatchPaid)}</span>
                        {totalBatchDue > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-rose-400 font-bold">Due: {formatCurrency(totalBatchDue)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {isAdminMode && isRunning && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Move batch "${batch.batch_name}" back to Upcoming?`)) return;
                              await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batch.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'upcoming' })
                              });
                              await fetchAcademyData();
                              window.dispatchEvent(new CustomEvent('batches_data_changed'));
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1"
                            title="Revert batch back to Upcoming"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Revert</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Mark batch "${batch.batch_name}" as Completed?`)) return;
                              await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batch.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'completed' })
                              });
                              await fetchAcademyData();
                              window.dispatchEvent(new CustomEvent('batches_data_changed'));
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/40 transition-colors cursor-pointer"
                            title="Mark batch as Completed"
                          >
                            Complete Batch
                          </button>
                        </div>
                      )}
                      {isAdminMode && isCompleted && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Re-open completed batch "${batch.batch_name}" back to Running status?`)) return;
                            await fetch(`/supabase-admin/rest/v1/batches?id=eq.${batch.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'running' })
                            });
                            await fetchAcademyData();
                            window.dispatchEvent(new CustomEvent('batches_data_changed'));
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/40 transition-colors cursor-pointer flex items-center gap-1"
                          title="Re-open Batch back to Active/Running status"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-open</span>
                        </button>
                      )}
                      {isAdminMode && isUpcoming && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivatingBatch(batch);
                            setManualStartDate(new Date().toISOString().slice(0, 10));
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black transition-colors cursor-pointer"
                          title="Start Classes (Move to Active Batches with manual start date)"
                        >
                          Start Batch
                        </button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => {
                          setTargetBatchForEnroll(batch);
                          setIsUnifiedEnrollOpen(true);
                        }}
                        className="text-xs font-bold bg-primary text-primary-foreground flex items-center gap-1 shadow-sm rounded-lg cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Enroll</span>
                      </Button>
                      {isAdminMode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.id, batch.batch_name)}
                          className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Batch and associated test records"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Course Timeline & Remaining Days Tracker on Active Classes */}
                  {isRunning && (
                    <div className="p-3 border-b border-border/40 bg-muted/10">
                      <CourseTimelineTracker startDate={batch.start_date || batch.created_at} />
                    </div>
                  )}

                  {/* Students Table for this Batch */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Reg. No</th>
                          <th className="px-4 py-2.5">Student Name</th>
                          <th className="px-4 py-2.5">Contact</th>
                          <th className="px-4 py-2.5">Enrolling Counselor</th>
                          <th className="px-4 py-2.5 text-right">Package</th>
                          <th className="px-4 py-2.5 text-right">Paid</th>
                          <th className="px-4 py-2.5 text-right">Balance</th>
                          <th className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {bStudents.map(s => {
                          const studentInstallments = installments?.filter(i => i.student_id === s.id) || [];
                          const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
                          const balance = Math.max(0, s.total_fees - paid);
                          const isSelected = selectedStudentView?.id === s.id;

                          return (
                            <tr
                              key={s.id}
                              onClick={() => setSelectedStudentView(s)}
                              className={`hover:bg-muted/60 cursor-pointer transition-colors ${isSelected ? 'bg-primary-soft/30 border-l-4 border-l-primary' : ''
                                }`}
                            >
                              <td className="px-4 py-3 font-mono text-xs text-primary font-bold">{s.registration_number}</td>
                              <td className="px-4 py-3 font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                  <span>{s.student_name}</span>
                                  {s.status === 'Discontinued' && (
                                    <Badge variant="error" className="text-[9.5px] py-0 px-1.5 font-bold uppercase tracking-wider">
                                      Discontinued
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {s.phone || s.email || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {s.counselor_name ? (
                                  <Badge variant="indigo" className="text-[10px] font-bold">
                                    {s.counselor_name}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-[11px] italic">Direct / Admin</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-foreground">
                                {formatCurrency(s.total_fees)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-400">
                                {formatCurrency(paid)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold">
                                {s.status === 'Discontinued' ? (
                                  <span className="text-muted-foreground text-[11px] font-semibold italic">
                                    Waived (Discontinued)
                                  </span>
                                ) : (
                                  <span className="text-rose-400">
                                    {formatCurrency(balance)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentView(s)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border transition-colors cursor-pointer"
                                  >
                                    Details
                                  </button>
                                  {canManageStudents && (
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedStudentForFee(s); setIsInstallmentModalOpen(true); }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                                      title="Add payment installment"
                                    >
                                      + Pay
                                    </button>
                                  )}
                                  {isAdminMode && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStudent(s)}
                                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Permanently delete dummy student"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {bStudents.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">
                              No students enrolled in this batch yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}

              {/* Unassigned Students Section (if any) */}
              {unassignedStudents.length > 0 && (
                <Card variant="glass" className="overflow-hidden border border-border">
                  <div className="p-4 bg-muted-2 border-b border-border">
                    <h4 className="text-sm font-bold text-foreground">Direct / Unassigned Students</h4>
                    <p className="text-xs text-muted-foreground">{unassignedStudents.length} students without an assigned batch</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Reg. No</th>
                          <th className="px-4 py-2.5">Student Name</th>
                          <th className="px-4 py-2.5">Contact</th>
                          <th className="px-4 py-2.5">Enrolling Counselor</th>
                          <th className="px-4 py-2.5 text-right">Package</th>
                          <th className="px-4 py-2.5 text-right">Balance</th>
                          <th className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {unassignedStudents.map(s => {
                          const studentInstallments = installments?.filter(i => i.student_id === s.id) || [];
                          const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
                          const balance = Math.max(0, s.total_fees - paid);

                          return (
                            <tr key={s.id} onClick={() => setSelectedStudentView(s)} className="hover:bg-muted/60 cursor-pointer">
                              <td className="px-4 py-3 font-mono text-primary font-bold">{s.registration_number}</td>
                              <td className="px-4 py-3 font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                  <span>{s.student_name}</span>
                                  {s.status === 'Discontinued' && (
                                    <Badge variant="error" className="text-[9.5px] py-0 px-1.5 font-bold uppercase tracking-wider">
                                      Discontinued
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{s.phone || '-'}</td>
                              <td className="px-4 py-3">
                                {s.counselor_name ? <Badge variant="indigo">{s.counselor_name}</Badge> : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.total_fees)}</td>
                              <td className="px-4 py-3 text-right font-bold">
                                {s.status === 'Discontinued' ? (
                                  <span className="text-muted-foreground text-[11px] font-semibold italic">
                                    Waived (Discontinued)
                                  </span>
                                ) : (
                                  <span className="text-rose-400">{formatCurrency(balance)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentView(s)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border cursor-pointer"
                                  >
                                    Details
                                  </button>
                                  {canManageStudents && (
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedStudentForFee(s); setIsInstallmentModalOpen(true); }}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                                      title="Add payment installment"
                                    >
                                      + Pay
                                    </button>
                                  )}
                                  {isAdminMode && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStudent(s)}
                                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                      title="Permanently delete dummy student"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {visibleBatches.length === 0 && unassignedStudents.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-sm bg-card rounded-2xl border border-dashed border-border">
                  No students or batches found matching "{searchQuery}".
                </div>
              )}
            </div>
          )}
        </div>

        {selectedStudentView && (
          <div className="w-full lg:w-[390px] shrink-0 space-y-4 animate-fade-in">
            <Card variant="glass" className="p-0 border-border/80 shadow-2xl relative overflow-hidden bg-card/90 backdrop-blur-xl rounded-2xl">
              {/* Top Gradient Accent Line */}
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-400" />

              <div className="p-5 space-y-4">
                {/* Header: Student Profile Hero */}
                <div className="relative pr-8">
                  <button
                    onClick={() => setSelectedStudentView(null)}
                    className="absolute -top-1 -right-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Close student details"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-start gap-3">
                    {/* Avatar Initials Badge */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-indigo-500/20 border border-primary/30 flex items-center justify-center text-primary font-black text-base shadow-sm shrink-0">
                      {selectedStudentView.student_name ? selectedStudentView.student_name.slice(0, 2).toUpperCase() : 'ST'}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="text-base font-black text-foreground truncate tracking-tight" title={selectedStudentView.student_name}>
                        {selectedStudentView.student_name}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                          {selectedStudentView.registration_number}
                        </span>
                        <Badge
                          variant={selectedStudentView.status === 'Discontinued' ? 'error' : selectedStudentView.status === 'Completed' ? 'purple' : 'success'}
                          className="text-[10px] font-bold uppercase tracking-wider"
                        >
                          {selectedStudentView.status || 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Batch & Counselor Metadata Strip */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>Assigned Batch</span>
                    </span>
                    <span className="font-bold text-foreground truncate max-w-[170px]" title={selectedStudentView.batch?.batch_name || 'Unassigned'}>
                      {selectedStudentView.batch?.batch_name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Enrolling Counselor</span>
                    </span>
                    <span className="font-bold text-primary">
                      {selectedStudentView.counselor_name || 'Direct / Admin'}
                    </span>
                  </div>

                  {(selectedStudentView.phone || selectedStudentView.email) && (
                    <div className="border-t border-border/40 pt-2 flex items-center justify-between gap-2 text-[11px]">
                      {selectedStudentView.phone && (
                        <a
                          href={`tel:${selectedStudentView.phone}`}
                          className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          title="Call student"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{selectedStudentView.phone}</span>
                        </a>
                      )}
                      {selectedStudentView.email && (
                        <a
                          href={`mailto:${selectedStudentView.email}`}
                          className="flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]"
                          title="Email student"
                        >
                          <Mail className="w-3 h-3 text-primary" />
                          <span className="truncate">{selectedStudentView.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Admin Management Buttons */}
                {isAdminMode && (
                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Admin Management</span>
                      <span className="text-[9px] text-primary font-mono font-bold">Privileged</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudentModal(selectedStudentView)}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Edit registration, fee, or counselor"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStudentStatus(selectedStudentView)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1 ${selectedStudentView.status === 'Discontinued'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                        title={selectedStudentView.status === 'Discontinued' ? 'Reactivate student' : 'Mark student as discontinued'}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{selectedStudentView.status === 'Discontinued' ? 'Reactivate' : 'Discontinue'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(selectedStudentView)}
                        className="px-2 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Delete student and records"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Financial & Fee Summary Card */}
                {(() => {
                  const studentInstallments = installments?.filter(i => i.student_id === selectedStudentView.id) || [];
                  const totalPaid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0) || Number(selectedStudentView.paid_fee || 0);
                  const fin = getStudentFinancialState(selectedStudentView, totalPaid);
                  const isDiscontinued = fin.isDiscontinued;
                  const balanceDue = fin.pendingDue;
                  const recoveryPct = fin.effectiveExpectedFee > 0
                    ? Math.min(100, Math.round((totalPaid / fin.effectiveExpectedFee) * 100))
                    : (isDiscontinued ? 100 : 0);

                  return (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Fee Summary</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDiscontinued
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : recoveryPct >= 100
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                          {isDiscontinued ? 'Discontinued (Waived)' : `${recoveryPct}% Settled`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-lg bg-background/80 border border-border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Package</span>
                          <span className="text-base font-black text-foreground block mt-0.5">
                            {formatCurrency(selectedStudentView.total_fees)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-background/80 border border-border">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Balance Due</span>
                          <span className={`text-base font-black block mt-0.5 ${isDiscontinued ? 'text-muted-foreground' : balanceDue === 0 ? 'text-emerald-400' : 'text-danger'
                            }`}>
                            {isDiscontinued ? (
                              <span>
                                ₹0 {fin.writtenOffAmount > 0 && <span className="text-[10px] font-medium text-muted-foreground">({formatCurrency(fin.writtenOffAmount)} waived)</span>}
                              </span>
                            ) : (
                              formatCurrency(balanceDue)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                          <span>Paid: <strong className="text-emerald-400 font-bold">{formatCurrency(totalPaid)}</strong></span>
                          <span>Due: <strong className={balanceDue > 0 ? 'text-rose-400 font-bold' : 'text-muted-foreground font-bold'}>{isDiscontinued ? '₹0' : formatCurrency(balanceDue)}</strong></span>
                        </div>
                        <div className="w-full bg-muted-2 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${recoveryPct >= 100 ? 'bg-emerald-400' : recoveryPct >= 50 ? 'bg-primary' : 'bg-amber-400'
                              }`}
                            style={{ width: `${recoveryPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Installment Payment History Section */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Payment History
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {installments?.filter(i => i.student_id === selectedStudentView.id).length}
                      </span>
                    </div>

                    {canManageStudents && (
                      <button
                        type="button"
                        onClick={() => { setSelectedStudentForFee(selectedStudentView); setIsInstallmentModalOpen(true); }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Payment</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-0.5">
                    {installments?.filter(i => i.student_id === selectedStudentView.id)?.map(inst => (
                      <div
                        key={inst.id}
                        className="p-3 rounded-xl bg-card border border-border/80 hover:border-primary/40 hover:bg-card/90 transition-all flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-emerald-400">
                              +{formatCurrency(inst.amount_paid)}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              {inst.payment_method}
                            </span>
                            {inst.proof_url && (
                              <button
                                type="button"
                                onClick={() => setPreviewSlipUrl(inst.proof_url || null)}
                                className="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[10px] font-bold hover:bg-primary/20 flex items-center gap-1 border border-primary/20 transition-colors cursor-pointer"
                                title="View Payment Screenshot"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Slip</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{new Date(inst.payment_date).toLocaleDateString()}</span>
                            </span>
                            {inst.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[130px] italic text-foreground/80" title={inst.notes}>
                                  {inst.notes}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {canManageStudents && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditInstallment(inst)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors cursor-pointer"
                              title="Edit payment installment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteInstallment(inst)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                              title="Delete payment installment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {installments?.filter(i => i.student_id === selectedStudentView.id).length === 0 && (
                      <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-1">
                        <CreditCard className="w-6 h-6 text-muted-foreground mx-auto opacity-40" />
                        <p className="text-xs font-semibold text-muted-foreground">No payments logged yet.</p>
                        <p className="text-[10px] text-muted-foreground">Click "+ Add Payment" to record a payment installment.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };



  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col lg:flex-row relative w-full overflow-x-hidden selection:bg-primary-soft">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-32 md:pb-12 relative">
        <main className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 w-full">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  {isTutor ? <UserCheck className="w-5 h-5 text-primary" /> : <BookOpen className="w-5 h-5 text-primary" />}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {isTutor ? 'Student Attendance Registry' : 'Academy ERP'}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {isTutor
                  ? 'Daily student attendance marking, past log auditing, and official PDF reporting for your assigned academy batches.'
                  : 'Manage batches, student registrations, fee tracking, and academy finances.'}
              </p>
            </div>

            {/* Header Right Actions & Theme Switcher */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                className="flex items-center justify-center p-2 rounded-lg text-secondary-foreground bg-card border border-border hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer shadow-sm"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-primary" />}
              </button>
            </div>
          </div>

          {/* Academy Sub-Navigation Tabs (Visible for Admins & Counselors) */}
          {!isTutor && (
            <div className="flex items-center gap-2 border-b border-border/80 overflow-x-auto pb-2.5 scrollbar-none">
              <button
                onClick={() => setActiveTab('academy_overview')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'academy_overview' || !['academy_batches', 'academy_students', 'academy_attendance', 'academy_reports'].includes(activeTab)
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('academy_batches')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'academy_batches'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Layers className="w-4 h-4" />
                <span>Academy Batches</span>
                {batches.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-background/30 font-mono font-bold">
                    {batches.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('academy_students')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'academy_students'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Users className="w-4 h-4" />
                <span>Students Hub</span>
                {students.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-background/30 font-mono font-bold">
                    {students.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('academy_attendance')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'academy_attendance'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Attendance</span>
              </button>

              <button
                onClick={() => setActiveTab('academy_reports')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'academy_reports'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Counselor Reports</span>
              </button>
            </div>
          )}

          {/* Render Active Sub-Section (Default: Overview) */}
          <div className="mt-6">
            {activeTab === 'academy_batches' ? (
              <AcademyBatches
                onNavigateToStudent={(_batchId) => {
                  setActiveTab('academy_students');

                }}
                onNavigateToAttendance={(_batchId) => {
                  setActiveTab('academy_attendance');

                }}
                onNavigateToFinances={() => setActiveTab('finance')}
              />
            ) : activeTab === 'academy_students' ? (
              renderStudents()
            ) : activeTab === 'academy_attendance' ? (
              <StudentAttendancePortal
                activeStaff={activeStaff}
                isAdminMode={isAdminMode}
                batches={batches}
                students={students}
                attendances={attendances}
                staffList={staffList}
                onAttendanceChanged={async () => {
                  await fetchAcademyAttendance();
                }}
              />
            ) : activeTab === 'academy_reports' ? (
              <CounselorMonthlyReportView
                counselorId={isCounselor ? activeStaff?.id : 'all'}
                isAdminView={isAdminMode || isOwner}
                activeStaff={activeStaff}
                students={students}
                batches={batches}
                installments={installments}
                staffList={staffList}
                onAddPayment={(stu) => {
                  const matching = students.find(s => s.id === stu.id) || stu;
                  setSelectedStudentForFee(matching);
                  setIsInstallmentModalOpen(true);
                }}
                onViewStudent={(stu) => {
                  const matching = students.find(s => s.id === stu.id) || stu;
                  setSelectedStudentView(matching);
                  setActiveTab('academy_students');
                }}
                onViewSlip={(slip) => setPreviewSlipUrl(slip)}
              />
            ) : (
              renderOverview()
            )}
          </div>

        </main>
      </div>

      {/* --- MODALS --- */}
      {/* UNIFIED ENROLLMENT MODAL */}
      <UnifiedEnrollmentModal
        isOpen={isUnifiedEnrollOpen}
        onClose={() => setIsUnifiedEnrollOpen(false)}
        targetBatch={targetBatchForEnroll}
        allBatches={batches}
        counselorsList={staffList.filter(s => (s.designation || '').toLowerCase().includes('counselor'))}
        staffList={staffList}
        activeStaff={activeStaff}
        isAdminMode={isAdminMode}
        onSuccess={() => fetchAcademyData()}
      />

      {/* ADMIN EDIT STUDENT MODAL */}
      {isEditStudentModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button
              onClick={() => setIsEditStudentModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-foreground mb-1">Edit Student Details</h3>
            <p className="text-xs text-muted-foreground mb-4">Update registration record, package fee, or assigned counselor.</p>

            <form onSubmit={handleSaveEditStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                  Student Registration Code (ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TECHADSA12025082"
                  value={editStudentForm.student_id_code}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, student_id_code: e.target.value.toUpperCase() })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editStudentForm.phone}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editStudentForm.email}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Package Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editStudentForm.total_fees}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, total_fees: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Assigned Batch</label>
                <select
                  value={editStudentForm.batch_id}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, batch_id: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} ({b.batch_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Enrolling Counselor</label>
                <select
                  value={editStudentForm.counselor_id}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, counselor_id: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">-- Direct / Admin --</option>
                  {staffList.filter(s => (s.designation || '').toLowerCase().includes('counselor')).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Admission / Enrollment Date</label>
                <input
                  type="date"
                  value={editStudentForm.enrollment_date}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, enrollment_date: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditStudentModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}


      {/* 1. Create Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsBatchModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Create New Batch</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Batch Name</label>
                <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Batch Code (e.g. A4)</label>
                <input required type="text" value={batchForm.code} onChange={e => setBatchForm({ ...batchForm, code: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground font-mono uppercase focus:border-primary/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Type</label>
                  <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                  <select value={batchForm.status} onChange={e => setBatchForm({ ...batchForm, status: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Assign Tutor</label>
                <select value={batchForm.tutor_id} onChange={e => setBatchForm({ ...batchForm, tutor_id: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                  <option value="">-- Unassigned --</option>
                  {(staffList?.filter(s => (s.designation || '').toLowerCase().includes('tutor')).length > 0
                    ? staffList.filter(s => (s.designation || '').toLowerCase().includes('tutor'))
                    : staffList)?.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.designation || 'Tutor'})</option>)}
                </select>
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Create Batch</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. Register Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsStudentModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Register Student</h2>
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Student / Registration Code</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank (e.g. TECHADSA12025082)"
                  value={studentForm.student_id_code}
                  onChange={e => setStudentForm({ ...studentForm, student_id_code: e.target.value.toUpperCase() })}
                  className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Student Name</label>
                <input required type="text" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Email (Optional)</label>
                  <input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone (Optional)</label>
                  <input type="tel" value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Assign to Batch</label>
                <select required value={studentForm.batch_id} onChange={e => setStudentForm({ ...studentForm, batch_id: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                  <option value="">-- Choose Batch --</option>
                  {batches?.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Fee Package (₹)</label>
                  <input required type="number" min="0" value={studentForm.total_fees} onChange={e => setStudentForm({ ...studentForm, total_fees: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Admission Date</label>
                  <input required type="date" value={studentForm.enrollment_date} onChange={e => setStudentForm({ ...studentForm, enrollment_date: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none cursor-pointer" />
                </div>
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Register & Generate ID</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3. Log Installment Modal */}
      {isInstallmentModalOpen && selectedStudentForFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsInstallmentModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-2">Log Payment</h2>
            <p className="text-sm text-primary mb-6">{selectedStudentForFee.student_name} ({selectedStudentForFee.registration_number})</p>

            <form onSubmit={handleLogInstallment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Paid</label>
                <input required type="number" min="1" value={installmentForm.amount} onChange={e => setInstallmentForm({ ...installmentForm, amount: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground text-lg font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={installmentForm.date} onChange={e => setInstallmentForm({ ...installmentForm, date: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Method</label>
                  <select value={installmentForm.method} onChange={e => setInstallmentForm({ ...installmentForm, method: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Payment Proof / Screenshot</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/50 bg-muted cursor-pointer transition-colors text-xs text-muted-foreground hover:text-foreground">
                    <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{proofFile ? proofFile.name : 'Upload Screenshot / Slip'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProofFile(file);
                          setProofPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {proofPreview && (
                    <div className="relative w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-border group">
                      <img src={proofPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setProofFile(null); setProofPreview(null); }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes (Optional)</label>
                <textarea value={installmentForm.notes} onChange={e => setInstallmentForm({ ...installmentForm, notes: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none h-20 resize-none" />
              </div>
              <div className="pt-4">
                <Button type="submit" disabled={isUploadingProof} className="w-full">
                  {isUploadingProof ? 'Uploading & Saving...' : 'Save Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT INSTALLMENT MODAL */}
      {isEditInstallmentModalOpen && editingInstallment && (() => {
        const studentForEdit = students.find(s => s.id === editingInstallment.student_id) || selectedStudentView;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <Card variant="glass" className="w-full max-w-md p-5 sm:p-6 border-border shadow-2xl relative my-auto">
              <button
                type="button"
                onClick={() => { setIsEditInstallmentModalOpen(false); setEditingInstallment(null); }}
                className="absolute top-4 sm:top-5 right-4 sm:right-5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                disabled={isSavingEditInstallment}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-2.5 mb-4 pr-6">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Edit Payment Record</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {studentForEdit ? (
                      <span>Student: <strong className="text-foreground">{studentForEdit.student_name}</strong> ({studentForEdit.registration_number})</span>
                    ) : (
                      'Update payment amount, historical date, or payment method.'
                    )}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveEditInstallment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Amount Paid (₹) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={editInstallmentForm.amount}
                    onChange={e => setEditInstallmentForm({ ...editInstallmentForm, amount: e.target.value })}
                    className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-foreground text-lg font-bold outline-none focus:border-primary transition-all font-mono"
                    placeholder="e.g. 5000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Payment Date *</label>
                    <input
                      required
                      type="date"
                      value={editInstallmentForm.date}
                      onChange={e => setEditInstallmentForm({ ...editInstallmentForm, date: e.target.value })}
                      className="w-full bg-muted-2 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none cursor-pointer focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Method *</label>
                    <select
                      value={editInstallmentForm.method}
                      onChange={e => setEditInstallmentForm({ ...editInstallmentForm, method: e.target.value })}
                      className="w-full bg-muted-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none cursor-pointer focus:border-primary transition-all"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Notes / Transaction ID</label>
                  <textarea
                    value={editInstallmentForm.notes}
                    onChange={e => setEditInstallmentForm({ ...editInstallmentForm, notes: e.target.value })}
                    className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none h-20 resize-none focus:border-primary transition-all"
                    placeholder="Reference, bank transaction ID, or note..."
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setIsEditInstallmentModalOpen(false); setEditingInstallment(null); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    disabled={isSavingEditInstallment}
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={isSavingEditInstallment}
                    className="font-bold bg-primary text-primary-foreground px-5 py-2 rounded-xl cursor-pointer shadow-sm hover:bg-primary/90"
                  >
                    {isSavingEditInstallment ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        );
      })()}

      {/* 4. Log Academy Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Log Academy Expense</h2>
            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                  <option value="Tutor Salary">Tutor Salary</option>
                  <option value="Software/Tools">Software/Tools</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount</label>
                  <input required type="number" min="1" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                <textarea required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none h-20 resize-none" />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Save Expense</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 5. Screenshot Lightbox Preview Modal */}
      {previewSlipUrl && (
        <div
          onClick={() => setPreviewSlipUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in cursor-zoom-out"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-2xl w-full max-h-[90vh] bg-card border border-border rounded-xl p-4 shadow-2xl cursor-default flex flex-col"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
              <span className="text-xs font-bold text-foreground">Payment Proof Screenshot</span>
              <button
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh] flex items-center justify-center rounded-lg bg-black/40 p-2">
              <img src={previewSlipUrl} alt="Payment Proof" className="max-w-full max-h-[68vh] object-contain rounded" />
            </div>
            <div className="pt-3 text-right">
              <a
                href={previewSlipUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                Open full image in new tab →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* START BATCH MODAL WITH MANUAL START DATE PICKER */}
      {activatingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border border-border shadow-2xl rounded-2xl bg-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Activate Batch & Start Course</h3>
                  <p className="text-xs text-muted-foreground">{activatingBatch.batch_name} ({activatingBatch.course_name})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivatingBatch(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Course Start Date (Class Commencement):
                </label>
                <input
                  type="date"
                  value={manualStartDate}
                  onChange={(e) => setManualStartDate(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  You can choose today's date or backdate if classes commenced previously. A 3-month (90-day) course timeline progress tracker will automatically activate.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActivatingBatch(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleStartBatchWithDate(activatingBatch.id, manualStartDate)}
                className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md rounded-xl"
              >
                Start Classes Now
              </Button>
            </div>
          </Card>
        </div>
      )}



    </div>
  );
};
