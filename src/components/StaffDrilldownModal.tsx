import React, { useState, useEffect } from 'react';
import { X, Wallet, CalendarDays, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import type { StaffProfile } from '../types';

interface StaffDrilldownModalProps {
  profile: StaffProfile;
  onClose: () => void;
  onEdit: () => void;
}

export const StaffDrilldownModal: React.FC<StaffDrilldownModalProps> = ({ profile, onClose, onEdit }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchDrilldownData();
  }, [profile, month]);

  const fetchDrilldownData = async () => {
    setIsLoading(true);
    try {
      // Fetch attendance for the selected month
      const { data: attData } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('staff_id', profile.id)
        .like('date', `${month}%`)
        .order('date', { ascending: false });
      
      if (attData) setAttendance(attData);

      // If tutor, fetch fee history (installments) from students in their batches
      if (profile.designation.toLowerCase().includes('tutor')) {
        // Find batches where this staff is the tutor
        const { data: batches } = await supabase
          .from('academy_batches')
          .select('id, batch_name')
          .eq('tutor_id', profile.id);
          
        if (batches && batches.length > 0) {
          const batchIds = batches.map(b => b.id);
          
          // Find students in those batches
          const { data: students } = await supabase
            .from('academy_students')
            .select('id, student_name, batch_id')
            .in('batch_id', batchIds);
            
          if (students && students.length > 0) {
            const studentIds = students.map(s => s.id);
            
            // Find installments for those students
            const { data: installments } = await supabase
              .from('academy_installments')
              .select('*')
              .in('student_id', studentIds)
              .like('payment_date', `${month}%`)
              .order('payment_date', { ascending: false });
              
            if (installments) {
              // Map installments with student and batch info
              const enriched = installments.map(inst => {
                const student = students.find(s => s.id === inst.student_id);
                const batch = batches.find(b => b.id === student?.batch_id);
                return {
                  ...inst,
                  student_name: student?.student_name,
                  batch_name: batch?.batch_name
                };
              });
              setFeeHistory(enriched);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching drilldown:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isTutor = profile.designation.toLowerCase().includes('tutor');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <Card variant="solid" className="w-full max-w-4xl bg-slate-900 border border-slate-700 relative shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
              <img src={`https://avatar.iran.liara.run/public/${profile.gender.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(profile.full_name)}`} alt={profile.full_name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{profile.full_name}</h2>
              <p className="text-sm text-indigo-400 font-medium">{profile.designation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { onClose(); onEdit(); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Edit Profile
            </button>
            <button onClick={onClose} className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Profile Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Base Salary</p>
              <p className="text-lg font-black text-white">{formatCurrency(profile.base_salary || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Shift Timing</p>
              <p className="text-sm font-bold text-white mt-1.5">{profile.shift_start_time.substring(0, 5)} - {profile.shift_end_time.substring(0, 5)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Weekly Off</p>
              <p className="text-sm font-bold text-white mt-1.5">{profile.weekly_off_day}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</p>
              <p className="text-sm font-bold text-emerald-400 mt-1.5">Active</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Monthly Overview</h3>
            <input 
              type="month" 
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Attendance Record */}
            <Card variant="glass" className="p-5 border-white/5">
              <h4 className="font-bold text-white mb-4 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-400"/> Attendance Record</h4>
              {isLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm animate-pulse">Loading...</div>
              ) : attendance.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No attendance records for {month}</div>
              ) : (
                <div className="space-y-2">
                  {attendance.map(record => (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/50 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-bold text-slate-300">{record.date}</div>
                        {record.status === 'Present' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-400">
                        {record.check_in ? record.check_in.substring(0, 5) : '--:--'} to {record.check_out ? record.check_out.substring(0, 5) : '--:--'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Fee History (Tutors Only) */}
            {isTutor && (
              <Card variant="glass" className="p-5 border-white/5">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-400"/> Fee Collection (Assigned Batches)</h4>
                {isLoading ? (
                  <div className="py-8 text-center text-slate-500 text-sm animate-pulse">Loading...</div>
                ) : feeHistory.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">No fees collected in {month}</div>
                ) : (
                  <div className="space-y-3">
                    {feeHistory.map(fee => (
                      <div key={fee.id} className="p-3 rounded-xl bg-slate-900/50 border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-white">{fee.student_name}</p>
                            <p className="text-[10px] text-indigo-400 uppercase tracking-wider">{fee.batch_name}</p>
                          </div>
                          <p className="text-sm font-black text-emerald-400">{formatCurrency(fee.amount_paid)}</p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>{fee.payment_date}</span>
                          <span>{fee.payment_method}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

          </div>

        </div>
      </Card>
    </div>
  );
};
