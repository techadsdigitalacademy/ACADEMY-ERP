import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Edit2, X, Download } from 'lucide-react';
import type { Attendance } from '../types';

interface AttendanceDashboardProps {
  staffId: string;
  fullName: string;
  designation: string;
  gender: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
  onOverrideSuccess?: () => void;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  staffId,
  fullName,
  designation,
  gender,
  avatarUrl,
  isAdmin = false,
  onOverrideSuccess
}) => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttMonth, setSelectedAttMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [enlargedSelfie, setEnlargedSelfie] = useState<string | null>(null);

  const [profileDetails, setProfileDetails] = useState<{
    shift_start_time: string;
    shift_end_time: string;
    weekly_off_day: string;
  } | null>(null);
  
  // Admin editing state
  const [editingAttendance, setEditingAttendance] = useState<any | null>(null);
  const [editAttStatus, setEditAttStatus] = useState<string>('PRESENT');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch staff metadata to get dynamic weekly_off and shift times
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('full_name')
        .eq('id', staffId)
        .maybeSingle();

      if (staffRecord) {
        const { data: profRecord } = await supabase
          .from('staff_profiles')
          .select('shift_start_time, shift_end_time, weekly_off_day')
          .eq('full_name', staffRecord.full_name)
          .maybeSingle();

        if (profRecord) {
          setProfileDetails({
            shift_start_time: profRecord.shift_start_time || '09:00:00',
            shift_end_time: profRecord.shift_end_time || '18:00:00',
            weekly_off_day: profRecord.weekly_off_day || 'Sunday'
          });
        }
      }

      // 2. Fetch attendance logs
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', staffId);
      if (attErr) throw attErr;
      setAttendance(attData || []);

      // 3. Fetch holidays
      const { data: holData, error: holErr } = await supabase
        .from('holidays')
        .select('*');
      if (holErr) throw holErr;
      setHolidays(holData || []);
    } catch (err: any) {
      console.error('Error fetching attendance logs:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [staffId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setIsUpdating(true);
    try {
      if (editingAttendance.isVirtual) {
        // Insert a new attendance row for that date
        const { error } = await supabase
          .from('attendance')
          .insert({
            staff_id: staffId,
            attendance_date: editingAttendance.date,
            status: editAttStatus,
            punch_in: profileDetails?.shift_start_time || '09:30:00',
            punch_out: profileDetails?.shift_end_time || '18:30:00',
            selfie_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop'
          });
        if (error) throw error;
      } else {
        // Update the existing row
        const { error } = await supabase
          .from('attendance')
          .update({ status: editAttStatus })
          .eq('id', editingAttendance.id);
        if (error) throw error;
      }

      setEditingAttendance(null);
      await fetchLogs();
      if (onOverrideSuccess) onOverrideSuccess();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Generate logs for selected month
  const [year, monthIdx] = selectedAttMonth.split('-').map(Number);
  const daysInMonth = new Date(year, monthIdx, 0).getDate();
  
  const monthlyLogs: any[] = [];
  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let leaveCount = 0;
  let holidayCount = 0;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-indexed
  const todayDate = today.getDate();

  let maxDay = daysInMonth;
  if (year === currentYear && monthIdx === currentMonth) {
    maxDay = todayDate;
  } else if (year > currentYear || (year === currentYear && monthIdx > currentMonth)) {
    maxDay = 0;
  }

  const userWeeklyOff = profileDetails?.weekly_off_day || 'Sunday';

  for (let d = 1; d <= maxDay; d++) {
    const dateStr = `${year}-${String(monthIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const matchedLog = attendance.find(a => a.attendance_date === dateStr);
    const dateObj = new Date(year, monthIdx - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeeklyOff = dayName.toLowerCase() === userWeeklyOff.toLowerCase();
    const matchHoliday = holidays.find(h => h.holiday_date === dateStr);
    
    if (matchedLog) {
      if (matchedLog.status === 'PRESENT') presentCount++;
      else if (matchedLog.status === 'LATE') lateCount++;
      else if (matchedLog.status === 'HALF_DAY') halfDayCount++;
      else if (matchedLog.status === 'LEAVE') leaveCount++;
      
      let workingHours = '-';
      if (matchedLog.punch_in && matchedLog.punch_out) {
        const [inH, inM] = matchedLog.punch_in.split(':').map(Number);
        const [outH, outM] = matchedLog.punch_out.split(':').map(Number);
        const diffMs = new Date(2000, 0, 1, outH, outM, 0).getTime() - new Date(2000, 0, 1, inH, inM, 0).getTime();
        const diffHrs = Math.max(0, diffMs / (1000 * 60 * 60));
        workingHours = `${diffHrs.toFixed(1)} hrs`;
      }

      monthlyLogs.push({
        id: matchedLog.id,
        date: dateStr,
        punch_in: matchedLog.punch_in || '-',
        punch_out: matchedLog.punch_out || '-',
        status: matchedLog.status,
        selfie_url: matchedLog.selfie_url,
        working_hours: workingHours,
        isVirtual: false
      });
    } else {
      if (isWeeklyOff || matchHoliday) {
        holidayCount++;
        monthlyLogs.push({
          date: dateStr,
          punch_in: '-',
          punch_out: '-',
          status: 'HOLIDAY',
          holiday_name: matchHoliday ? matchHoliday.holiday_name : `${userWeeklyOff} Holiday`,
          selfie_url: null,
          working_hours: '-',
          isVirtual: true
        });
      } else {
        leaveCount++;
        monthlyLogs.push({
          date: dateStr,
          punch_in: '-',
          punch_out: '-',
          status: 'LEAVE',
          selfie_url: null,
          working_hours: '-',
          isVirtual: true
        });
      }
    }
  }

  const totalWorkingDays = maxDay - holidayCount;
  const attendancePercentage = totalWorkingDays > 0 
    ? Math.min(100, Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalWorkingDays) * 100))
    : 0;

  const handleExportAttendance = () => {
    try {
      const csvRows = [];
      csvRows.push(['Date', 'Punch In', 'Punch Out', 'Working Hours', 'Selfie Status']);
      
      monthlyLogs.slice().reverse().forEach((log: any) => {
        csvRows.push([
          log.date, 
          log.punch_in || '-', 
          log.punch_out || '-', 
          log.working_hours || '-', 
          log.selfie_url ? 'Yes' : 'No'
        ]);
      });

      const csvContent = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_Report_${fullName.replace(/\s+/g, '_')}_${selectedAttMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Error exporting attendance: ' + e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 font-bold text-xs uppercase tracking-widest">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading Attendance Dashboard...
      </div>
    );
  }

  return (
    <section className="space-y-6 pt-2 animate-fade-in max-w-5xl">
      {/* Filter and Metrics Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Metrics</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
              {fullName} &bull; {designation} ({gender})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-450 uppercase">Filter Month:</span>
            <input 
              type="month" 
              value={selectedAttMonth}
              onChange={(e) => setSelectedAttMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Present */}
          <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-emerald-500/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-emerald-400 uppercase">Present</span>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">{presentCount}</p>
          </Card>

          {/* Late */}
          <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-indigo-500/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-indigo-400 uppercase">Late</span>
            <p className="text-xl font-extrabold text-indigo-400 mt-1">{lateCount}</p>
          </Card>

          {/* Half Day */}
          <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-indigo-500/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-indigo-400 uppercase">Half Day</span>
            <p className="text-xl font-extrabold text-indigo-400 mt-1">{halfDayCount}</p>
          </Card>

          {/* Leave */}
          <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-purple-500/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-purple-400 uppercase">Leave</span>
            <p className="text-xl font-extrabold text-purple-400 mt-1">{leaveCount}</p>
          </Card>

          {/* Holiday */}
          <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-purple-500/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-purple-400 uppercase">Holiday</span>
            <p className="text-xl font-extrabold text-purple-400 mt-1">{holidayCount}</p>
          </Card>

          {/* Worked Hours */}
          <Card variant="glass" className="p-3 flex flex-col justify-between border-white/5 min-h-[80px]">
            <span className="text-[9px] font-bold text-slate-450 uppercase">Worked Hours</span>
            <p className="text-sm font-extrabold text-white mt-1.5 truncate">
              {(() => {
                const totalMins = attendance.reduce((acc, curr) => {
                  if (curr.attendance_date.slice(0, 7) === selectedAttMonth && curr.punch_in && curr.punch_out) {
                    const [inH, inM] = curr.punch_in.split(':').map(Number);
                    const [outH, outM] = curr.punch_out.split(':').map(Number);
                    return acc + ((outH * 60 + outM) - (inH * 60 + inM));
                  }
                  return acc;
                }, 0);
                return `${(totalMins / 60).toFixed(1)} hrs`;
              })()}
            </p>
          </Card>

          {/* Attendance % */}
          <Card variant="glass" className="p-3 flex flex-col justify-between border-white/5 min-h-[80px]">
            <span className="text-[9px] font-bold text-slate-455 uppercase">Attendance %</span>
            <p className="text-xl font-extrabold text-white mt-1">{attendancePercentage}%</p>
          </Card>
        </div>
      </div>

      {/* History Logs Table */}
      <Card variant="glass" className="p-5 border-white/5 space-y-4">
        <div className="border-b border-white/5 pb-3 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-1">Attendance Logs History</h3>
            <button 
              onClick={handleExportAttendance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-indigo-400 hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          </div>

        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Selfie</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Clock In</th>
                <th className="py-2.5 px-3">Clock Out</th>
                <th className="py-2.5 px-3">Working HR's</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isAdmin && <th className="py-2.5 px-3 text-center">Override</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
              {monthlyLogs.slice().reverse().map((log: any) => (
                <tr key={log.date} className="hover:bg-slate-900/10">
                  <td className="py-2.5 px-3">
                    {log.selfie_url ? (
                      <button 
                        type="button"
                        onClick={() => setEnlargedSelfie(log.selfie_url)}
                        className="block focus:outline-none cursor-pointer"
                      >
                        <img 
                          src={log.selfie_url} 
                          alt="Selfie" 
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover cursor-pointer hover:border-indigo-400 transition-colors"
                        />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-[10px] text-slate-700 font-bold uppercase leading-none">
                        —
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{log.date}</td>
                  <td className="py-2.5 px-3 text-white font-bold">{log.punch_in}</td>
                  <td className="py-2.5 px-3 text-slate-350">{log.punch_out}</td>
                  <td className="py-2.5 px-3 text-slate-400">{log.working_hours}</td>
                  <td className="py-2.5 px-3 text-center">
                    {log.status === 'HOLIDAY' ? (
                      <Badge variant="indigo" className="text-[8px] font-bold uppercase tracking-wider">
                        {log.holiday_name || 'HOLIDAY'}
                      </Badge>
                    ) : (
                      <Badge 
                        variant={
                          log.status === 'PRESENT' ? 'success' : 
                          log.status === 'LATE' ? 'warning' : 
                          log.status === 'HALF_DAY' ? 'indigo' : 'error'
                        } 
                        className="text-[8px] font-bold uppercase tracking-wider"
                      >
                        {log.status}
                      </Badge>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttendance(log);
                          setEditAttStatus(log.status === 'HOLIDAY' || log.status === 'LEAVE' ? 'PRESENT' : log.status);
                        }}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {monthlyLogs.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500 font-semibold uppercase tracking-wider">
                    No logs available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Override status form (Admin Only) */}
        {isAdmin && editingAttendance && (
          <form onSubmit={handleUpdateStatus} className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in mt-4">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Override Attendance Status</p>
              <p className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">Date: {editingAttendance.date}</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={editAttStatus}
                onChange={(e) => setEditAttStatus(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="PRESENT">PRESENT</option>
                <option value="LATE">LATE</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="LEAVE">LEAVE</option>
              </select>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setEditingAttendance(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isUpdating}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>

      {/* Lightbox Selfie Modal */}
      {enlargedSelfie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-lg w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl p-2 flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setEnlargedSelfie(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={enlargedSelfie} 
              alt="Enlarged Selfie" 
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};
