import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Edit2, X, Download, FileText } from 'lucide-react';
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
  avatarUrl: _avatarUrl,
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
  const [editClockIn, setEditClockIn] = useState<string>('09:30');
  const [editClockOut, setEditClockOut] = useState<string>('18:30');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAttendanceForMonth = async () => {
    try {
      const [y, m] = selectedAttMonth.split('-').map(Number);
      const monthStart = `${selectedAttMonth}-01`;
      const monthEnd = `${selectedAttMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('staff_id', staffId)
        .gte('attendance_date', monthStart)
        .lte('attendance_date', monthEnd);
      if (error) throw error;
      const normalized = (data || []).map((d: any) => ({
        ...d,
        status: (d.status || 'present').toUpperCase(),
        punch_in: d.punch_in || (d.created_at ? new Date(d.created_at).toLocaleTimeString('en-US', { hour12: false }) : '09:00:00')
      }));
      setAttendance(normalized);
    } catch (err: any) {
      console.error('Error fetching attendance logs:', err.message);
    }
  };

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

      // 2. Holidays
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

  useEffect(() => {
    fetchAttendanceForMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, selectedAttMonth]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    setIsUpdating(true);
    try {
      const dbStatus = editAttStatus.toLowerCase();
      if (editingAttendance.isVirtual) {
        // Insert a new attendance row for that date
        try {
          let proxyRes = await fetch('/supabase-admin/rest/v1/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{
              staff_id: staffId,
              attendance_date: editingAttendance.date,
              status: dbStatus
            }])
          });
          if (!proxyRes.ok) {
            proxyRes = await fetch('/supabase-admin/rest/v1/staff_attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{
                staff_id: staffId,
                attendance_date: editingAttendance.date,
                status: dbStatus
              }])
            });
          }
          if (!proxyRes.ok) {
            const { error } = await supabase
              .from('attendance')
              .insert({
                staff_id: staffId,
                attendance_date: editingAttendance.date,
                status: dbStatus
              });
            if (error) {
              await supabase
                .from('staff_attendance')
                .insert({
                  staff_id: staffId,
                  attendance_date: editingAttendance.date,
                  status: dbStatus
                });
            }
          }
        } catch (e) {
          console.warn('Attendance insert error:', e);
        }
      } else {
        // Update the existing row
        try {
          let proxyPatch = await fetch(`/supabase-admin/rest/v1/attendance?id=eq.${editingAttendance.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: dbStatus })
          });
          if (!proxyPatch.ok) {
            proxyPatch = await fetch(`/supabase-admin/rest/v1/staff_attendance?id=eq.${editingAttendance.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: dbStatus })
            });
          }
          if (!proxyPatch.ok) {
            const { error } = await supabase
              .from('attendance')
              .update({ status: dbStatus })
              .eq('id', editingAttendance.id);
            if (error) {
              await supabase
                .from('staff_attendance')
                .update({ status: dbStatus })
                .eq('id', editingAttendance.id);
            }
          }
        } catch (e) {
          console.warn('Attendance patch error:', e);
        }
      }

      setEditingAttendance(null);
      await fetchAttendanceForMonth();
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

  const handleExportAttendanceExcel = () => {
    try {
      const csvRows = [];
      csvRows.push([`Tech Ads ERP - Staff Attendance Report`]);
      csvRows.push([`Staff Name: ${fullName}`, `Designation: ${designation}`, `Month: ${selectedAttMonth}`]);
      csvRows.push([`Present: ${presentCount}`, `Late: ${lateCount}`, `Half Day: ${halfDayCount}`, `Leave: ${leaveCount}`, `Holiday: ${holidayCount}`, `Attendance %: ${attendancePercentage}%`]);
      csvRows.push([]);
      csvRows.push(['Date', 'Clock In', 'Clock Out', 'Working Hours', 'Status', 'Selfie Verified']);
      
      monthlyLogs.slice().reverse().forEach((log: any) => {
        csvRows.push([
          log.date, 
          log.punch_in || '-', 
          log.punch_out || '-', 
          log.working_hours || '-', 
          log.status || 'ABSENT',
          log.selfie_url ? 'Yes' : 'No'
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
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

  const handleExportAttendancePDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const rowsHtml = monthlyLogs.slice().reverse().map((log: any) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-weight: bold;">${log.date}</td>
            <td style="padding: 8px;">${log.punch_in || '-'}</td>
            <td style="padding: 8px;">${log.punch_out || '-'}</td>
            <td style="padding: 8px;">${log.working_hours || '-'}</td>
            <td style="padding: 8px; text-align: center; font-weight: bold; color: ${log.status === 'PRESENT' ? '#059669' : log.status === 'LATE' ? '#4f46e5' : log.status === 'HALF_DAY' ? '#6366f1' : '#e11d48'};">${log.status || 'ABSENT'}</td>
            <td style="padding: 8px; text-align: center;">${log.selfie_url ? 'Yes' : 'No'}</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Attendance Report - ${fullName}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
              .metrics { display: flex; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
              .metric-item { flex: 1; text-align: center; }
              .metric-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
              .metric-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
              th.center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Staff Attendance Report</h1>
            <p>Staff: <strong>${fullName}</strong> &bull; Designation: <strong>${designation}</strong> &bull; Month: <strong>${selectedAttMonth}</strong></p>
            
            <div class="metrics">
              <div class="metric-item">
                <div class="metric-label">Present</div>
                <div class="metric-val" style="color: #059669;">${presentCount}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Late</div>
                <div class="metric-val" style="color: #4f46e5;">${lateCount}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Half Day</div>
                <div class="metric-val" style="color: #6366f1;">${halfDayCount}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Leave</div>
                <div class="metric-val" style="color: #9333ea;">${leaveCount}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Holiday</div>
                <div class="metric-val" style="color: #a855f7;">${holidayCount}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Attendance %</div>
                <div class="metric-val">${attendancePercentage}%</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Working HR's</th>
                  <th class="center">Status</th>
                  <th class="center">Selfie Verified</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      alert('Error exporting PDF: ' + e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground font-bold text-xs uppercase tracking-widest">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
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
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attendance Metrics</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
              {fullName} &bull; {designation} ({gender})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Filter Month:</span>
            <input 
              type="month" 
              value={selectedAttMonth}
              onChange={(e) => setSelectedAttMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Present */}
          <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-success/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-success uppercase">Present</span>
            <p className="text-xl font-extrabold text-success mt-1">{presentCount}</p>
          </Card>

          {/* Late */}
          <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-primary/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-primary uppercase">Late</span>
            <p className="text-xl font-extrabold text-primary mt-1">{lateCount}</p>
          </Card>

          {/* Half Day */}
          <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-primary/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-primary uppercase">Half Day</span>
            <p className="text-xl font-extrabold text-primary mt-1">{halfDayCount}</p>
          </Card>

          {/* Leave */}
          <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-primary/10 min-h-[80px]">
            <span className="text-[9px] font-bold text-primary uppercase">Leave</span>
            <p className="text-xl font-extrabold text-primary mt-1">{leaveCount}</p>
          </Card>

          {/* Worked Hours */}
          <Card variant="glass" className="p-3 flex flex-col justify-between border-border min-h-[80px]">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Worked Hours</span>
            <p className="text-sm font-extrabold text-foreground mt-1.5 truncate">
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
          <Card variant="glass" className="p-3 flex flex-col justify-between border-border min-h-[80px]">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Attendance %</span>
            <p className="text-xl font-extrabold text-foreground mt-1">{attendancePercentage}%</p>
          </Card>
        </div>
      </div>

      {/* History Logs Table */}
      <Card variant="glass" className="p-5 border-border space-y-4">
        <div className="border-b border-border pb-3 flex justify-between items-center gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex-1">Attendance Logs History</h3>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportAttendanceExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft hover:bg-success-soft text-success border border-success/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Export Attendance Report to Excel / CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button 
                  onClick={handleExportAttendancePDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger border border-danger/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Export Attendance Report to PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
              </div>
            )}
          </div>

        <div className="overflow-x-auto rounded-md border border-border bg-muted-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-2.5 px-3">Selfie</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Clock In</th>
                <th className="py-2.5 px-3">Clock Out</th>
                <th className="py-2.5 px-3">Working HR's</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {isAdmin && <th className="py-2.5 px-3 text-center">Override</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-secondary-foreground font-semibold">
              {monthlyLogs.slice().reverse().filter((log: any) => !log.isVirtual || log.status !== 'HOLIDAY').map((log: any) => (
                <tr key={log.date} className="hover:bg-muted-2">
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
                          className="w-8 h-8 rounded-full border border-border object-cover cursor-pointer hover:border-primary transition-colors"
                        />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-[10px] text-foreground font-bold uppercase leading-none">
                        —
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{log.date}</td>
                  <td className="py-2.5 px-3 text-foreground font-bold">{log.punch_in}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{log.punch_out}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{log.working_hours}</td>
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

                          let defaultIn = profileDetails?.shift_start_time || '09:30';
                          if (log.punch_in && log.punch_in !== '-') {
                            defaultIn = log.punch_in.length >= 5 ? log.punch_in.slice(0, 5) : log.punch_in;
                          }
                          setEditClockIn(defaultIn);

                          let defaultOut = profileDetails?.shift_end_time || '18:30';
                          if (log.punch_out && log.punch_out !== '-') {
                            defaultOut = log.punch_out.length >= 5 ? log.punch_out.slice(0, 5) : log.punch_out;
                          }
                          setEditClockOut(defaultOut);
                        }}
                        className="p-1.5 rounded bg-muted hover:bg-muted text-primary transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {monthlyLogs.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground font-semibold uppercase tracking-wider">
                    No logs available for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Attendance Edit Modal (Admin Only - Centered Popup) */}
      {isAdmin && editingAttendance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-card/80 animate-fade-in">
          <div className="relative max-w-md w-full rounded-lg bg-card border border-primary/30 p-6 shadow-2xl space-y-5 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary-soft border border-primary/20 text-primary">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-wide">Edit Attendance</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {fullName} &bull; <span className="text-primary font-semibold">{editingAttendance.date}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAttendance(null)}
                className="p-1.5 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              {/* Attendance Status */}
              <div>
                <label className="block text-xs font-bold text-secondary-foreground uppercase tracking-wider mb-1.5">
                  Attendance Status
                </label>
                <select
                  value={editAttStatus}
                  onChange={(e) => setEditAttStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="HALF_DAY">HALF DAY</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>

              {/* Clock In & Clock Out Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-secondary-foreground uppercase tracking-wider mb-1.5">
                    Clock-In Time
                  </label>
                  <input
                    type="time"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary-foreground uppercase tracking-wider mb-1.5">
                    Clock-Out Time
                  </label>
                  <input
                    type="time"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-md bg-primary-soft border border-primary/10 text-[11px] text-muted-foreground leading-relaxed">
                Updating attendance will record status and timing overrides for this date.
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  type="button" 
                  onClick={() => setEditingAttendance(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  type="submit" 
                  isLoading={isUpdating}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Selfie Modal */}
      {enlargedSelfie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-card/90 animate-fade-in">
          <div className="relative max-w-lg w-full rounded-lg overflow-hidden border border-border bg-card shadow-2xl p-2 flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setEnlargedSelfie(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-card/80 hover:bg-muted text-muted-foreground hover:text-white transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={enlargedSelfie} 
              alt="Enlarged Selfie" 
              className="w-full max-h-[85vh] object-contain rounded-md"
            />
          </div>
        </div>
      )}
    </section>
  );
};
