import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import { 
  Users, BookOpen, UserPlus, GraduationCap, DollarSign,
  Wallet, Search, Plus, X,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface AcademyBatch {
  id: string;
  batch_name: string;
  batch_code: string;
  batch_type: string;
  status: string;
  tutor_id: string;
  created_at: string;
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

interface AcademyExpense {
  id: string;
  expense_category: string;
  amount: number;
  expense_date: string;
  description: string;
  created_at: string;
}

export const AcademyDashboard: React.FC = () => {
  const { activeStaff, activeTab, isAdminMode } = useApp();

  
  const [isLoading, setIsLoading] = useState(true);

  // Data States
  const [batches, setBatches] = useState<AcademyBatch[]>([]);
  const [students, setStudents] = useState<AcademyStudent[]>([]);
  const [installments, setInstallments] = useState<AcademyInstallment[]>([]);
  const [attendances, setAttendances] = useState<AcademyAttendance[]>([]);
  const [expenses, setExpenses] = useState<AcademyExpense[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals & Forms
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ name: '', code: '', type: 'Offline', status: 'Upcoming', tutor_id: '' });

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', phone: '', batch_id: '', total_fees: '' });

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<AcademyStudent | null>(null);
  const [installmentForm, setInstallmentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });

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
    const { data } = await supabase.from('staff').select('id, full_name, designation').order('full_name');
    if (data) setStaffList(data);
  };

  const fetchAcademyData = async () => {
    setIsLoading(true);
    try {
      // 1. Batches
      const { data: bData } = await supabase.from('academy_batches').select('*, tutor:tutor_id(full_name)').order('created_at', { ascending: false });
      if (bData) setBatches(bData);

      // 2. Students
      const { data: sData } = await supabase.from('academy_students').select('*, batch:batch_id(*)').order('created_at', { ascending: false });
      if (sData) setStudents(sData);

      // 3. Installments
      const { data: iData } = await supabase.from('academy_installments').select('*').order('payment_date', { ascending: false });
      if (iData) setInstallments(iData);

      // 4. Attendance
      const { data: aData } = await supabase.from('academy_attendance').select('*').order('attendance_date', { ascending: false });
      if (aData) setAttendances(aData);

      // 5. Expenses
      const { data: eData } = await supabase.from('academy_expenses').select('*').order('expense_date', { ascending: false });
      if (eData) setExpenses(eData);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.name || !batchForm.code) return;
    try {
      const { error } = await supabase.from('academy_batches').insert({});
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
      // Generate ID
      const batch = batches.find(b => b.id === studentForm.batch_id);
      if (!batch) throw new Error("Invalid batch selected");

      
      

      const { error } = await supabase.from('academy_students').insert({});
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
      const { error } = await supabase.from('academy_installments').insert({});
      if (error) throw error;
      setIsInstallmentModalOpen(false);
      setInstallmentForm({ amount: '', date: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' });
      fetchAcademyData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    try {
      const { error } = await supabase.from('academy_expenses').insert({});
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
        await supabase.from('academy_attendance').update({ status: newStatus, marked_by: activeStaff.id }).eq('id', existing.id);
      } else {
        await supabase.from('academy_attendance').insert({
          batch_id: attBatchId,
          student_id: studentId,
          attendance_date: attDate,
          status: newStatus,
          marked_by: activeStaff.id
        });
      }
      fetchAcademyData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- RENDERS ---

    const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase">Academy Overview</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High-Level Summary</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Revenue</span>
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{formatCurrency(installments.reduce((a, b) => a + Number(b.amount_paid), 0))}</div>
        </Card>

        <Card variant="glass" className="p-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase">Active Students</span>
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{students.filter(s => s.status === 'Active').length}</div>
        </Card>

        <Card variant="glass" className="p-4 border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Batches</span>
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{batches.length}</div>
        </Card>
      </div>
    </div>
  );

  const renderBatches = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Batch Management</h3>
          <p className="text-sm text-slate-400">Manage online and offline batches.</p>
        </div>
        {isAdminMode && (
          <Button onClick={() => setIsBatchModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Batch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches?.map(b => (
          <Card key={b.id} variant="glass" className="p-4 border-white/5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-white flex items-center gap-2">
                  {b.batch_name}
                  <Badge variant={b.status === 'Completed' ? 'success' : b.status === 'Ongoing' ? 'indigo' : 'warning'}>{b.status}</Badge>
                </h4>
                <p className="text-xs text-slate-400 mt-1">Code: <span className="text-indigo-400 font-mono">{b.batch_code}</span></p>
              </div>
              <Badge variant={b.batch_type === 'Online' ? 'purple' : 'info'}>{b.batch_type}</Badge>
            </div>
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Tutor: {b.tutor ? b.tutor.full_name : 'Unassigned'}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStudents = () => {
    const filtered = students?.filter(s => s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.registration_number.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <div className="space-y-4 animate-fade-in flex h-full">
        <div className={`flex-1 space-y-4 ${selectedStudentView ? 'hidden md:block md:w-2/3' : 'w-full'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Student Hub</h3>
              <p className="text-sm text-slate-400">Manage registrations and fee tracking.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              {isAdminMode && (
                <Button onClick={() => setIsStudentModalOpen(true)} className="flex items-center gap-2 whitespace-nowrap">
                  <UserPlus className="w-4 h-4" /> Register Student
                </Button>
              )}
            </div>
          </div>

          <Card variant="glass" className="overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-900/50 border-b border-white/5 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Reg. No</th>
                    <th className="px-4 py-3 font-semibold">Student Name</th>
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Fees</th>
                    <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered?.map(s => {
                    const studentInstallments = installments?.filter(i => i.student_id === s.id);
                    const paid = studentInstallments.reduce((sum, i) => sum + Number(i.amount_paid), 0);
                    const balance = s.total_fees - paid;
                    return (
                      <tr 
                        key={s.id} 
                        onClick={() => setSelectedStudentView(s)}
                        className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-indigo-400">{s.registration_number}</td>
                        <td className="px-4 py-3 font-medium text-white">{s.student_name}</td>
                        <td className="px-4 py-3 text-slate-300">{s.batch?.batch_name || '-'}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(s.total_fees)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-400">{formatCurrency(balance)}</td>
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
            <Card variant="glass" className="p-4 border-white/5 relative">
              <button 
                onClick={() => setSelectedStudentView(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-lg font-bold text-white pr-6">{selectedStudentView.student_name}</h3>
              <p className="text-sm font-mono text-indigo-400 mt-1">{selectedStudentView.registration_number}</p>
              
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Fees</p>
                  <p className="text-sm font-bold text-slate-300">{formatCurrency(selectedStudentView.total_fees)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Balance Due</p>
                  <p className="text-sm font-bold text-red-400">
                    {formatCurrency(selectedStudentView.total_fees - installments?.filter(i => i.student_id === selectedStudentView.id).reduce((sum, i) => sum + Number(i.amount_paid), 0))}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-300">Installments</h4>
                  {isAdminMode && (
                    <button 
                      onClick={() => { setSelectedStudentForFee(selectedStudentView); setIsInstallmentModalOpen(true); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                      + Add Payment
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  {installments?.filter(i => i.student_id === selectedStudentView.id)?.map(inst => (
                    <div key={inst.id} className="bg-slate-900/50 p-2.5 rounded-lg flex justify-between items-center border border-white/5">
                      <div>
                        <p className="text-xs font-bold text-green-400">+{formatCurrency(inst.amount_paid)}</p>
                        <p className="text-[10px] text-slate-400">{new Date(inst.payment_date).toLocaleDateString()} • {inst.payment_method}</p>
                      </div>
                      {inst.notes && <p className="text-[10px] text-slate-500 italic max-w-[80px] truncate" title={inst.notes}>{inst.notes}</p>}
                    </div>
                  ))}
                  {installments?.filter(i => i.student_id === selectedStudentView.id).length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">No payments logged yet.</p>
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
    const selectedBatchStudents = students?.filter(s => s.batch_id === attBatchId);

    return (
      <div className="space-y-4 animate-fade-in">
        <div>
          <h3 className="text-lg font-bold text-white">Attendance Portal</h3>
          <p className="text-sm text-slate-400">Mark daily attendance for batches.</p>
        </div>

        <Card variant="glass" className="p-4 border-white/5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Batch</label>
              <select 
                value={attBatchId}
                onChange={e => setAttBatchId(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">-- Choose Batch --</option>
                {batches?.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
              <input 
                type="date"
                value={attDate}
                onChange={e => setAttDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>
        </Card>

        {attBatchId && (
          <Card variant="glass" className="overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 border-b border-white/5 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedBatchStudents?.map(s => {
                    const att = attendances.find(a => a.student_id === s.id && a.attendance_date === attDate);
                    const isPresent = att?.status === 'Present';
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{s.student_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.registration_number}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {att ? (
                            <Badge variant={isPresent ? 'success' : 'error'}>{att.status}</Badge>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Not marked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleToggleAttendance(s.id, att?.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isPresent ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                          >
                            Mark {isPresent ? 'Absent' : 'Present'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedBatchStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">No students in this batch.</td>
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

  const renderFinances = () => {
    const totalRev = installments.reduce((sum, i) => sum + Number(i.amount_paid), 0);
    const totalExp = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRev - totalExp;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Academy Finances</h3>
            <p className="text-sm text-slate-400">Independent financial overview.</p>
          </div>
          {isAdminMode && (
            <Button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Expense
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="glass" className="p-5 border-white/5">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <ArrowDownRight className="w-5 h-5 text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(totalRev)}</p>
          </Card>
          <Card variant="glass" className="p-5 border-white/5">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <ArrowUpRight className="w-5 h-5 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(totalExp)}</p>
          </Card>
          <Card variant="glass" className="p-5 border-white/5">
            <div className="flex items-center gap-3 text-slate-400 mb-2">
              <Wallet className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
            </div>
            <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </p>
          </Card>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-bold text-white mb-3">Recent Expenses</h4>
          <Card variant="glass" className="overflow-hidden border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 border-b border-white/5 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses?.map(e => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-300">{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-white">{e.expense_category}</td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[200px]">{e.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-400">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No expenses logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] font-sans selection:bg-indigo-500/30">
      <Sidebar />
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 overflow-y-auto custom-scrollbar relative">
        <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-white/5 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academy ERP</h1>
              </div>
              <p className="text-sm text-slate-400 max-w-xl">
                Manage batches, student registrations, fee tracking, and academy finances.
              </p>
            </div>
          </div>



          {/* Render Active View */}
          <div className="mt-6">
            {activeTab === 'academy_overview' && renderOverview()}
            {activeTab === 'academy_batches' && renderBatches()}
            {activeTab === 'academy_students' && renderStudents()}
            {activeTab === 'academy_attendance' && renderAttendance()}
            {activeTab === 'academy_finances' && renderFinances()}
          </div>

        </main>
      </div>

      {/* --- MODALS --- */}

      {/* 1. Create Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-white/10 shadow-2xl relative">
            <button onClick={() => setIsBatchModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-white mb-6">Create New Batch</h2>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Batch Name</label>
                <input required type="text" value={batchForm.name} onChange={e => setBatchForm({...batchForm, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white focus:border-indigo-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Batch Code (e.g. A4)</label>
                <input required type="text" value={batchForm.code} onChange={e => setBatchForm({...batchForm, code: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-indigo-500/50 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                  <select value={batchForm.type} onChange={e => setBatchForm({...batchForm, type: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select value={batchForm.status} onChange={e => setBatchForm({...batchForm, status: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assign Tutor</label>
                <select value={batchForm.tutor_id} onChange={e => setBatchForm({...batchForm, tutor_id: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                  <option value="">-- Unassigned --</option>
                  {staffList?.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-white/10 shadow-2xl relative">
            <button onClick={() => setIsStudentModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-white mb-6">Register Student</h2>
            <form onSubmit={handleRegisterStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                <input required type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email (Optional)</label>
                  <input type="email" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone (Optional)</label>
                  <input type="tel" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assign to Batch</label>
                <select required value={studentForm.batch_id} onChange={e => setStudentForm({...studentForm, batch_id: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                  <option value="">-- Choose Batch --</option>
                  {batches?.map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fee Package</label>
                <input required type="number" min="0" value={studentForm.total_fees} onChange={e => setStudentForm({...studentForm, total_fees: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-white/10 shadow-2xl relative">
            <button onClick={() => setIsInstallmentModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-white mb-2">Log Payment</h2>
            <p className="text-sm text-indigo-400 mb-6">{selectedStudentForFee.student_name} ({selectedStudentForFee.registration_number})</p>
            
            <form onSubmit={handleLogInstallment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount Paid</label>
                <input required type="number" min="1" value={installmentForm.amount} onChange={e => setInstallmentForm({...installmentForm, amount: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white text-lg font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={installmentForm.date} onChange={e => setInstallmentForm({...installmentForm, date: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Method</label>
                  <select value={installmentForm.method} onChange={e => setInstallmentForm({...installmentForm, method: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes (Optional)</label>
                <textarea value={installmentForm.notes} onChange={e => setInstallmentForm({...installmentForm, notes: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none h-20 resize-none" />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Save Payment</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. Log Academy Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card variant="glass" className="w-full max-w-md p-6 border-white/10 shadow-2xl relative">
            <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-white mb-6">Log Academy Expense</h2>
            <form onSubmit={handleLogExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none">
                  <option value="Tutor Salary">Tutor Salary</option>
                  <option value="Software/Tools">Software/Tools</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</label>
                  <input required type="number" min="1" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
                <textarea required value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white outline-none h-20 resize-none" />
              </div>
              <div className="pt-4">
                <Button type="submit" className="w-full">Save Expense</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
};
