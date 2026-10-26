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
import { 
  Users, BookOpen, UserPlus, GraduationCap, DollarSign,
  Wallet, Search, X,
  ArrowUpRight, Layers, UserCheck,
  Eye, UploadCloud, Check
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
  tutor?: { full_name: string };
}

interface AcademyStudent {
  id: string;
  registration_number: string;
  student_name: string;
  email: string;
  phone: string;
  batch_id: string;
  total_fees: number;
  status: string;
  created_at: string;
  batch?: AcademyBatch;
}

interface AcademyInstallment {
  id: string;
  student_id: string;
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
  const { activeStaff, activeTab, setActiveTab, isAdminMode } = useApp();
  const dbClient = supabase;

  
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
  const [studentForm, setStudentForm] = useState({ name: '', email: '', phone: '', batch_id: '', total_fees: '' });

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<AcademyStudent | null>(null);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Tutor Salary', amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  // Attendance specific
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);

  // View States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentView, setSelectedStudentView] = useState<AcademyStudent | null>(null);

  useEffect(() => {
    fetchAcademyData();
    fetchStaff();
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
      const { data: bData } = await dbClient.from('batches').select('*').order('created_at', { ascending: false });
      if (bData) {
        setBatches(bData.map((b: any) => ({
          id: b.id,
          batch_name: b.batch_name,
          batch_code: b.batch_name.slice(0, 4).toUpperCase(),
          batch_type: b.mode === 'online' ? 'Online' : 'Offline',
          status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Upcoming',
          tutor_id: b.tutor_id,
          created_at: b.created_at,
          total_seats: b.total_seats,
          fee_amount: b.fee_amount
        })));
      }

      // 2. Students
      const { data: sData } = await dbClient.from('students').select('*').order('created_at', { ascending: false });
      if (sData) {
        setStudents(sData.map((s: any) => ({
          id: s.id,
          registration_number: s.student_id_code || `STU-${s.id.slice(0, 4)}`,
          student_name: s.name,
          email: s.email || '',
          phone: s.phone || '',
          batch_id: s.batch_id,
          total_fees: Number(s.total_fee) || 0,
          status: 'Active',
          created_at: s.created_at
        })));
      }

      // 3. Installments / Fee collections
      const { data: iData } = await dbClient.from('fee_collections').select('*').order('created_at', { ascending: false });
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
            amount_paid: Number(f.amount) || 0,
            payment_date: f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            payment_method: f.payment_mode ? f.payment_mode.toUpperCase() : 'ONLINE',
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

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name) return;
    try {
      const { error } = await dbClient.from('batches').insert([{
        batch_name: batchForm.name.trim(),
        course_name: batchForm.name.trim(),
        mode: batchForm.type.toLowerCase(),
        status: batchForm.status.toLowerCase(),
        tutor_id: batchForm.tutor_id || null,
        total_seats: 30,
        fee_amount: 25000,
        start_date: new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
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
      const studentCode = `STU-${new Date().getFullYear()}-${String(students.length + 101).padStart(3, '0')}`;
      const { error } = await dbClient.from('students').insert([{
        student_id_code: studentCode,
        name: studentForm.name.trim(),
        email: studentForm.email.trim() || null,
        phone: studentForm.phone.trim() || null,
        batch_id: studentForm.batch_id,
        total_fee: parseFloat(studentForm.total_fees) || 0,
        paid_fee: 0
      }]);
      if (error) throw error;
      
      setIsStudentModalOpen(false);
      setStudentForm({ name: '', email: '', phone: '', batch_id: '', total_fees: '' });
      fetchAcademyData();
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

      const { error } = await dbClient.from('fee_collections').insert([{
        student_id: selectedStudentForFee.id,
        batch_id: selectedStudentForFee.batch_id,
        amount: amt,
        payment_mode: pMode,
        installment_month: curMonth,
        notes: notesWithProof || 'Fee payment'
      }]);
      if (error) throw error;

      // Update student paid fee with accurate sum
      const existingPaid = installments
        .filter(i => i.student_id === selectedStudentForFee.id)
        .reduce((sum, i) => sum + Number(i.amount_paid), 0);
      const newTotalPaid = existingPaid + amt;

      await dbClient.from('students').update({
        paid_fee: newTotalPaid
      }).eq('id', selectedStudentForFee.id);

      setIsInstallmentModalOpen(false);
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });
      setProofFile(null);
      setProofPreview(null);
      fetchAcademyData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingProof(false);
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

  const handleToggleAttendance = async (studentId: string, currentStatus: string | undefined) => {
    if (!activeStaff) return;
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      const existing = attendances.find(a => a.student_id === studentId && a.attendance_date === attDate);
      if (existing) {
        await dbClient.from('student_attendance').update({ status: newStatus.toLowerCase(), marked_by: activeStaff.id }).eq('id', existing.id);
      } else {
        await dbClient.from('student_attendance').insert([{
          batch_id: attBatchId,
          student_id: studentId,
          attendance_date: attDate,
          status: newStatus.toLowerCase(),
          marked_by: activeStaff.id
        }]);
      }
      fetchAcademyAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAttendance = async (status: 'Present' | 'Absent') => {
    if (!activeStaff || !attBatchId) return;
    const selectedBatchStudents = students?.filter(s => s.batch_id === attBatchId);
    if (!selectedBatchStudents || selectedBatchStudents.length === 0) return;

    try {
      for (const s of selectedBatchStudents) {
        const existing = attendances.find(a => a.student_id === s.id && a.attendance_date === attDate);
        if (existing) {
          await dbClient.from('student_attendance').update({ status: status.toLowerCase(), marked_by: activeStaff.id }).eq('id', existing.id);
        } else {
          await dbClient.from('student_attendance').insert([{
            batch_id: attBatchId,
            student_id: s.id,
            attendance_date: attDate,
            status: status.toLowerCase(),
            marked_by: activeStaff.id
          }]);
        }
      }
      fetchAcademyAttendance();
    } catch (err) {
      console.error(err);
    }
  };

  // --- RENDERS ---

  const renderOverview = () => {
    const totalCollected = installments.reduce((a, b) => a + Number(b.amount_paid || 0), 0);
    const totalFeesExpected = students.reduce((a, b) => a + Number(b.total_fees || 0), 0);
    const balanceRemaining = Math.max(0, totalFeesExpected - totalCollected);
    const upcomingBatches = batches.filter(b => (b.status || '').toLowerCase() === 'upcoming');
    const runningBatches = batches.filter(b => (b.status || '').toLowerCase() === 'running');

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top Header Card with Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 border border-border p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-soft text-primary border border-primary/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Academy Overview</h2>
              <p className="text-xs text-muted-foreground font-medium">Real-time academy performance, active admissions & batch status</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('academy_batches')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Manage Batches</span>
            </button>
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Student</span>
            </button>
            <button
              onClick={() => setActiveTab('academy_attendance')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-success" />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glass" className="p-4 border-success/20 bg-success-soft/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Fee Collected</span>
              <div className="p-2 bg-success-soft rounded-lg text-success">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{formatCurrency(totalCollected)}</div>
              <p className="text-[10px] text-success font-semibold mt-1">Confirmed Student Receipts</p>
            </div>
          </Card>

          <Card variant="glass" className="p-4 border-primary/20 bg-primary-soft/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Students</span>
              <div className="p-2 bg-primary-soft rounded-lg text-primary">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{students.length}</div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">Enrolled across all batches</p>
            </div>
          </Card>

          <Card variant="glass" className="p-4 border-indigo/20 bg-primary-soft/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Batches</span>
              <div className="p-2 bg-primary-soft rounded-lg text-primary">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{batches.length}</div>
              <div className="flex items-center gap-2 text-[10px] font-bold mt-1">
                <span className="text-primary">{runningBatches.length} Running</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{upcomingBatches.length} Upcoming</span>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4 border-warning/20 bg-warning-soft/20 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Balance</span>
              <div className="p-2 bg-warning-soft rounded-lg text-warning">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-warning">{formatCurrency(balanceRemaining)}</div>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">From {formatCurrency(totalFeesExpected)} total fees</p>
            </div>
          </Card>
        </div>

        {/* Overview Dual Panels: Batches Snapshot & Recent Enrollments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Batches Snapshot */}
          <Card variant="glass" className="p-5 border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Active & Upcoming Batches</span>
              </h3>
              <button
                onClick={() => setActiveTab('academy_batches')}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All ({batches.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {batches.slice(0, 5).map(b => {
                const enrolled = students.filter(s => s.batch_id === b.id).length;
                const total = b.total_seats || 30;
                const balance = Math.max(0, total - enrolled);
                const isUpcoming = (b.status || '').toLowerCase() === 'upcoming';
                return (
                  <div key={b.id} className="p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{b.batch_name}</span>
                        <Badge variant={isUpcoming ? 'warning' : 'success'} className="text-[9px] py-0">
                          {b.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">({b.batch_type})</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Course Fee: {formatCurrency(b.fee_amount || 25000)}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-success">{enrolled} Filled</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-bold text-primary">{balance} Left</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Total: {total} seats</span>
                    </div>
                  </div>
                );
              })}
              {batches.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No batches created yet. Click "Manage Batches" to create your first batch.
                </div>
              )}
            </div>
          </Card>

          {/* Right Panel: Recent Student Enrollments */}
          <Card variant="glass" className="p-5 border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-success" />
                <span>Recent Student Registrations</span>
              </h3>
              <button
                onClick={() => setActiveTab('academy_students')}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Students Hub ({students.length})</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {students.slice(0, 5).map(s => {
                const batch = batches.find(b => b.id === s.batch_id);
                const paid = installments.filter(i => i.student_id === s.id).reduce((sum, i) => sum + Number(i.amount_paid || 0), 0);
                return (
                  <div key={s.id} className="p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-all flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{s.student_name}</span>
                        <span className="font-mono text-[9px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border">{s.registration_number}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {batch ? batch.batch_name : 'Assigned Batch'} • {s.phone || 'No phone'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-success">{formatCurrency(paid)}</div>
                      <span className="text-[9px] text-muted-foreground">of {formatCurrency(s.total_fees)}</span>
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No students registered yet. Click "Register Student" to enroll.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };


  const renderStudents = () => {
    const filtered = students?.filter(s => s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="space-y-4 animate-fade-in flex h-full">
        <div className={`flex-1 space-y-4 ${selectedStudentView ? 'hidden md:block md:w-2/3' : 'w-full'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Student Hub</h3>
              <p className="text-sm text-muted-foreground">Manage registrations and fee tracking.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              {isAdminMode && (
                <Button onClick={() => setIsStudentModalOpen(true)} className="flex items-center gap-2 whitespace-nowrap">
                  <UserPlus className="w-4 h-4" /> Register Student
                </Button>
              )}
            </div>
          </div>

          <Card variant="glass" className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted-2 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Reg. No</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Fees</th>
                    <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered?.map(s => {
                    const studentInstallments = installments?.filter(i => i.student_id === s.id);
                    const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid), 0);
                    const balance = s.total_fees - paid;
                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedStudentView(s)}
                        className="hover:bg-muted cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary">{s.registration_number}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{s.student_name}</td>
                        <td className="px-4 py-3 text-secondary-foreground">{s.batch?.batch_name || '-'}</td>
                        <td className="px-4 py-3 text-right text-secondary-foreground">{formatCurrency(s.total_fees)}</td>
                        <td className="px-4 py-3 text-right font-bold text-danger">{formatCurrency(balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {selectedStudentView && (
          <div className="w-full md:w-1/3 md:ml-4 flex flex-col space-y-4">
            <Card variant="glass" className="p-4 border-border relative">
              <button 
                onClick={() => setSelectedStudentView(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-lg font-bold text-foreground pr-6">{selectedStudentView.student_name}</h3>
              <p className="text-sm font-mono text-primary mt-1">{selectedStudentView.registration_number}</p>
              
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Fees</p>
                  <p className="text-sm font-bold text-secondary-foreground">{formatCurrency(selectedStudentView.total_fees)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Balance Due</p>
                  <p className="text-sm font-bold text-danger">
                    {formatCurrency(selectedStudentView.total_fees - installments?.filter(i => i.student_id === selectedStudentView.id).reduce((sum, i) => sum + Number(i.amount_paid), 0))}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-secondary-foreground">Installments</h4>
                  {isAdminMode && (
                    <button 
                      onClick={() => { setSelectedStudentForFee(selectedStudentView); setIsInstallmentModalOpen(true); }}
                      className="text-xs text-primary hover:text-primary font-bold"
                    >
                      + Add Payment
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {installments?.filter(i => i.student_id === selectedStudentView.id)?.map(inst => (
                    <div key={inst.id} className="bg-muted-2 p-2.5 rounded-lg flex justify-between items-center border border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-success">+{formatCurrency(inst.amount_paid)}</p>
                          {inst.proof_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewSlipUrl(inst.proof_url || null)}
                              className="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[10px] font-bold hover:bg-primary/20 flex items-center gap-1 border border-primary/20 transition-colors cursor-pointer"
                              title="View Payment Screenshot"
                            >
                              <Eye className="w-3 h-3" /> Slip
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(inst.payment_date).toLocaleDateString()} • {inst.payment_method}</p>
                      </div>
                      {inst.notes && <p className="text-[10px] text-muted-foreground italic max-w-[120px] truncate" title={inst.notes}>{inst.notes}</p>}
                    </div>
                  ))}
                  {installments?.filter(i => i.student_id === selectedStudentView.id).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No payments logged yet.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    const selectedBatchStudents = students?.filter(s => s.batch_id === attBatchId) || [];
    const currentDayLogs = attendances.filter(a => a.attendance_date === attDate && selectedBatchStudents.some(s => s.id === a.student_id));
    const presentCount = currentDayLogs.filter(a => a.status === 'Present').length;
    const absentCount = currentDayLogs.filter(a => a.status === 'Absent').length;
    const unmarkedCount = selectedBatchStudents.length - currentDayLogs.length;
    const attendanceRate = selectedBatchStudents.length > 0 ? Math.round((presentCount / selectedBatchStudents.length) * 100) : 0;

    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h3 className="text-lg font-bold text-foreground">Student Attendance Portal</h3>
          <p className="text-sm text-muted-foreground">Mark daily batch-wise student attendance for academy batches.</p>
        </div>

        <Card variant="glass" className="p-4 border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Batch</label>
              <select 
                value={attBatchId}
                onChange={e => setAttBatchId(e.target.value)}
                className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="">-- Choose Batch --</option>
                {batches?.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
              <input 
                type="date"
                value={attDate}
                onChange={e => setAttDate(e.target.value)}
                className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </Card>

        {attBatchId && selectedBatchStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted-2 rounded-xl border border-border">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Batch Roster ({selectedBatchStudents.length})
              </span>
              <span className="text-xs font-bold text-success bg-success-soft px-2.5 py-0.5 rounded-full border border-success/20">
                {presentCount} Present
              </span>
              <span className="text-xs font-bold text-danger bg-danger-soft px-2.5 py-0.5 rounded-full border border-danger/20">
                {absentCount} Absent
              </span>
              {unmarkedCount > 0 && (
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                  {unmarkedCount} Unmarked
                </span>
              )}
              <span className="text-xs font-extrabold text-primary ml-1">
                {attendanceRate}% Rate
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAllAttendance('Present')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-success bg-success-soft hover:bg-success/20 border border-success/30 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAllAttendance('Absent')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-danger bg-danger-soft hover:bg-danger/20 border border-danger/30 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Mark All Absent
              </button>
            </div>
          </div>
        )}

        {attBatchId && (
          <Card variant="glass" className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted-2 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedBatchStudents?.map(s => {
                    const att = attendances.find(a => a.student_id === s.id && a.attendance_date === attDate);
                    const isPresent = att?.status === 'Present';
                    return (
                      <tr key={s.id} className="hover:bg-muted transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{s.student_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.registration_number}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {att ? (
                            <Badge variant={isPresent ? 'success' : 'error'}>{att.status}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not marked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleToggleAttendance(s.id, att?.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPresent ? 'bg-danger-soft text-danger hover:bg-danger-soft' : 'bg-success-soft text-success hover:bg-success-soft'}`}
                          >
                            Mark {isPresent ? 'Absent' : 'Present'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedBatchStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-sm">No students in this batch.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
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
    <div className="min-h-screen bg-[#020617] text-foreground font-sans flex flex-col lg:flex-row relative w-full overflow-x-hidden selection:bg-primary-soft">
      <Sidebar />
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-32 md:pb-12 relative">
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary-soft rounded-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Academy ERP</h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                Manage batches, student registrations, fee tracking, and academy finances.
              </p>
            </div>
          </div>



          {/* Academy Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border/80 overflow-x-auto pb-2.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('academy_overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'academy_overview' || !['academy_batches', 'academy_students', 'academy_attendance'].includes(activeTab)
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('academy_batches')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'academy_batches'
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'academy_students'
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'academy_attendance'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Attendance</span>
            </button>
          </div>

          {/* Render Active Sub-Section (Default: Overview) */}
          <div className="mt-6">
            {activeTab === 'academy_batches' ? (
              <AcademyBatches
                onNavigateToStudent={(batchId) => {
                  setActiveTab('academy_students');
                  if (batchId) setAttBatchId(batchId);
                }}
                onNavigateToAttendance={(batchId) => {
                  setActiveTab('academy_attendance');
                  if (batchId) setAttBatchId(batchId);
                }}
                onNavigateToFinances={() => setActiveTab('finance')}
              />
            ) : activeTab === 'academy_students' ? (
              renderStudents()
            ) : activeTab === 'academy_attendance' ? (
              renderAttendance()
            ) : (
              renderOverview()
            )}
          </div>

        </main>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Create Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsBatchModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Create New Batch</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Batch Name</label>
                <input required type="text" value={batchForm.name} onChange={e => setBatchForm({...batchForm, name: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary/50 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Batch Code (e.g. A4)</label>
                <input required type="text" value={batchForm.code} onChange={e => setBatchForm({...batchForm, code: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground font-mono uppercase focus:border-primary/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Type</label>
                  <select value={batchForm.type} onChange={e => setBatchForm({...batchForm, type: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                  <select value={batchForm.status} onChange={e => setBatchForm({...batchForm, status: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Assign Tutor</label>
                <select value={batchForm.tutor_id} onChange={e => setBatchForm({...batchForm, tutor_id: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
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
            <button onClick={() => setIsStudentModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Register Student</h2>
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Student Name</label>
                <input required type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Email (Optional)</label>
                  <input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Phone (Optional)</label>
                  <input type="tel" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Assign to Batch</label>
                <select required value={studentForm.batch_id} onChange={e => setStudentForm({...studentForm, batch_id: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                  <option value="">-- Choose Batch --</option>
                  {batches?.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Fee Package</label>
                <input required type="number" min="0" value={studentForm.total_fees} onChange={e => setStudentForm({...studentForm, total_fees: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
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
            <button onClick={() => setIsInstallmentModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-2">Log Payment</h2>
            <p className="text-sm text-primary mb-6">{selectedStudentForFee.student_name} ({selectedStudentForFee.registration_number})</p>
            
            <form onSubmit={handleLogInstallment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount Paid</label>
                <input required type="number" min="1" value={installmentForm.amount} onChange={e => setInstallmentForm({...installmentForm, amount: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground text-lg font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={installmentForm.date} onChange={e => setInstallmentForm({...installmentForm, date: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Method</label>
                  <select value={installmentForm.method} onChange={e => setInstallmentForm({...installmentForm, method: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
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
                <textarea value={installmentForm.notes} onChange={e => setInstallmentForm({...installmentForm, notes: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none h-20 resize-none" />
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

      {/* 4. Log Academy Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-border shadow-2xl relative">
            <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-foreground mb-6">Log Academy Expense</h2>
            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none">
                  <option value="Tutor Salary">Tutor Salary</option>
                  <option value="Software/Tools">Software/Tools</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount</label>
                  <input required type="number" min="1" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                <textarea required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-muted-2 border border-border rounded-lg px-3 py-2 text-foreground outline-none h-20 resize-none" />
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
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white cursor-pointer"
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

    </div>
  );
};
