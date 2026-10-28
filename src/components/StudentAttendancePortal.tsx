import React, { useState, useMemo, useEffect } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { supabase } from '../services/supabase';
import {
  Calendar,
  CheckCircle2,
  Check,
  X,
  AlertTriangle,
  Award,
  GraduationCap,
  CalendarDays,
  Table as TableIcon
} from 'lucide-react';

export interface StudentAttendancePortalProps {
  activeStaff?: any;
  isAdminMode?: boolean;
  batches?: any[];
  students?: any[];
  attendances?: any[];
  staffList?: any[];
  onAttendanceChanged?: () => Promise<void> | void;
}

export const StudentAttendancePortal: React.FC<StudentAttendancePortalProps> = ({
  activeStaff,
  isAdminMode = false,
  batches = [],
  students = [],
  attendances = [],
  staffList = [],
  onAttendanceChanged
}) => {
  // Internal fallback states
  const [internalBatches, setInternalBatches] = useState<any[]>([]);
  const [internalStudents, setInternalStudents] = useState<any[]>([]);
  const [internalAttendances, setInternalAttendances] = useState<any[]>([]);
  
  const loadAttendancePortalData = async () => {
    try {
      const [bRes, sRes, aRes, stRes] = await Promise.all([
        batches && batches.length > 0 ? Promise.resolve({ data: batches }) : supabase.from('batches').select('*'),
        students && students.length > 0 ? Promise.resolve({ data: students }) : supabase.from('students').select('*'),
        attendances && attendances.length > 0 ? Promise.resolve({ data: attendances }) : supabase.from('student_attendance').select('*'),
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

      let aData = aRes.data || [];
      if (aData.length === 0 && (!attendances || attendances.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/student_attendance?select=*&order=attendance_date.desc');
          if (r.ok) aData = await r.json();
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
      if (!attendances || attendances.length === 0) {
        setInternalAttendances(
          aData.map((a: any) => ({
            ...a,
            status: (a.status || '').toLowerCase() === 'present' ? 'Present' : 'Absent'
          }))
        );
      }
          } catch (e) {
      console.warn('Attendance portal data load fallback:', e);
    }
  };

  useEffect(() => {
    if ((!batches || batches.length === 0) || (!students || students.length === 0) || (!attendances || attendances.length === 0)) {
      loadAttendancePortalData();
    }
  }, [batches?.length, students?.length, attendances?.length]);

  const effectiveBatches = (batches && batches.length > 0) ? batches : internalBatches;
  const effectiveStudents = (students && students.length > 0) ? students : internalStudents;
  const effectiveAttendances = (attendances && attendances.length > 0) ? attendances : internalAttendances;
  
  // Role checks
  const isOwner = (activeStaff?.designation || '').toLowerCase().includes('owner');
    const isTutor = (activeStaff?.designation || '').toLowerCase().includes('tutor');
  const isCounselor = (activeStaff?.designation || '').toLowerCase().includes('counselor');
  
  // Filter batches assigned to active tutor
  const tutorBatches = useMemo(() => {
    if (!isTutor) return effectiveBatches;
    const assigned = effectiveBatches.filter((b) => b.tutor_id === activeStaff?.id);
    return assigned.length > 0 ? assigned : effectiveBatches;
  }, [isTutor, effectiveBatches, activeStaff?.id]);

  // Selected Batch ID state (defaults to tutor's assigned batch if available, else first batch)
  const defaultBatchId = useMemo(() => {
    return (tutorBatches[0]?.id || effectiveBatches[0]?.id || '');
  }, [tutorBatches, effectiveBatches]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId);

  useEffect(() => {
    if (!selectedBatchId && defaultBatchId) {
      setSelectedBatchId(defaultBatchId);
    }
  }, [defaultBatchId, selectedBatchId]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Month selector options
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

  // Selected batch info
  const currentBatch = useMemo(() => {
    return effectiveBatches.find((b) => b.id === selectedBatchId);
  }, [effectiveBatches, selectedBatchId]);

  // Students in selected batch
  const batchStudents = useMemo(() => {
    if (!selectedBatchId) return [];
    return effectiveStudents.filter((s) => s.batch_id === selectedBatchId);
  }, [effectiveStudents, selectedBatchId]);

  // Daily records for selected date
  const dailyRecords = useMemo(() => {
    return effectiveAttendances.filter(
      (a) => a.attendance_date === selectedDate && batchStudents.some((s) => s.id === a.student_id)
    );
  }, [effectiveAttendances, selectedDate, batchStudents]);

  const presentCount = dailyRecords.filter((a) => (a.status || '').toLowerCase() === 'present').length;
  const absentCount = dailyRecords.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
  const unmarkedCount = Math.max(0, batchStudents.length - dailyRecords.length);
  const dailyAttendanceRate = batchStudents.length > 0 ? Math.round((presentCount / batchStudents.length) * 100) : 0;

  // Monthly Matrix Calculations
  const monthlyStats = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const totalDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

    // Records for this batch and month
    const monthLogs = attendances.filter(
      (a) => a.attendance_date?.startsWith(selectedMonth) &&
        (a.batch_id === selectedBatchId || batchStudents.some((s) => s.id === a.student_id))
    );

    // Unique dates marked in this month
    const markedDates = Array.from(new Set(monthLogs.map((a) => a.attendance_date))).sort();
    const totalSessions = markedDates.length;

    // Student summary
    let fullAttendanceCount = 0;
    let lowAttendanceCount = 0;
    let totalRateSum = 0;

    const studentRows = batchStudents.map((s) => {
      const sLogs = monthLogs.filter((a) => a.student_id === s.id);
      const pCount = sLogs.filter((a) => (a.status || '').toLowerCase() === 'present').length;
      const aCount = sLogs.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
            const rate = totalSessions > 0 ? Math.round((pCount / totalSessions) * 100) : 0;

      if (totalSessions > 0 && rate === 100) fullAttendanceCount++;
      if (totalSessions > 0 && rate < 75) lowAttendanceCount++;
      totalRateSum += rate;

      // Day lookup map
      const dayMap: { [day: number]: string } = {};
      sLogs.forEach((log) => {
        const dNum = parseInt(log.attendance_date.split('-')[2], 10);
        dayMap[dNum] = (log.status || '').toLowerCase();
      });

      return {
        student: s,
        pCount,
        aCount,
        rate,
        dayMap
      };
    });

    const averageRate = batchStudents.length > 0 ? Math.round(totalRateSum / batchStudents.length) : 0;

    return {
      totalDays,
      dayNumbers,
      totalSessions,
      averageRate,
      fullAttendanceCount,
      lowAttendanceCount,
      studentRows
    };
  }, [selectedMonth, attendances, selectedBatchId, batchStudents]);

  // Toggle individual student attendance
  const handleToggleAttendance = async (studentId: string, currentStatus?: string) => {
    if (!activeStaff || !selectedBatchId) return;
    const newStatus = (currentStatus || '').toLowerCase() === 'present' ? 'absent' : 'present';
    setIsUpdating(true);

    try {
      const existing = effectiveAttendances.find(
        (a) => a.student_id === studentId && a.attendance_date === selectedDate
      );

      if (existing) {
        // Try proxy update
        const patchRes = await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, marked_by: activeStaff.id })
        });

        if (!patchRes.ok) {
          await supabase
            .from('student_attendance')
            .update({ status: newStatus, marked_by: activeStaff.id })
            .eq('id', existing.id);
        }
      } else {
        // Insert new record
        const insertRes = await fetch('/supabase-admin/rest/v1/student_attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            {
              batch_id: selectedBatchId,
              student_id: studentId,
              attendance_date: selectedDate,
              status: newStatus,
              marked_by: activeStaff.id
            }
          ])
        });

        if (!insertRes.ok) {
          await supabase.from('student_attendance').insert([
            {
              batch_id: selectedBatchId,
              student_id: studentId,
              attendance_date: selectedDate,
              status: newStatus,
              marked_by: activeStaff.id
            }
          ]);
        }
      }

      if (onAttendanceChanged) await onAttendanceChanged();
      await loadAttendancePortalData();
    } catch (err) {
      console.error('Attendance toggle error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark all students Present or Absent
  const handleMarkAll = async (status: 'present' | 'absent') => {
    if (!activeStaff || !selectedBatchId || batchStudents.length === 0) return;
    setIsUpdating(true);

    try {
      for (const s of batchStudents) {
        const existing = attendances.find(
          (a) => a.student_id === s.id && a.attendance_date === selectedDate
        );

        if (existing) {
          await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, marked_by: activeStaff.id })
          }).catch(async () => {
            await supabase
              .from('student_attendance')
              .update({ status, marked_by: activeStaff.id })
              .eq('id', existing.id);
          });
        } else {
          await fetch('/supabase-admin/rest/v1/student_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
              {
                batch_id: selectedBatchId,
                student_id: s.id,
                attendance_date: selectedDate,
                status,
                marked_by: activeStaff.id
              }
            ])
          }).catch(async () => {
            await supabase.from('student_attendance').insert([
              {
                batch_id: selectedBatchId,
                student_id: s.id,
                attendance_date: selectedDate,
                status,
                marked_by: activeStaff.id
              }
            ]);
          });
        }
      }

      if (onAttendanceChanged) await onAttendanceChanged();
      await loadAttendancePortalData();
    } catch (err) {
      console.error('Mark all attendance error:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header with Role Info & View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-soft text-primary border border-primary/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              Student Attendance Portal
              {isTutor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Tutor Portal
                </span>
              ) : isCounselor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Counselor View
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                  {isAdminMode || isOwner ? 'Admin Portal' : 'Academy Register'}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {isTutor
                ? 'Mark and manage daily student attendance for your assigned academy batches'
                : 'Comprehensive daily attendance marking and full monthly registers for all academy students'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2 bg-muted-2 p-1 rounded-xl border border-border">
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Marking</span>
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Monthly Register</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Bar (Batch Selector + Date/Month Picker) */}
      <Card variant="glass" className="p-4 border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batch Selector */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Select Batch {isTutor && '(Your Assigned Batches)'}
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">-- Choose an Academy Batch --</option>
              {(isTutor ? tutorBatches : batches).map((b) => {
                const tutor = staffList.find((s) => s.id === b.tutor_id);
                return (
                  <option key={b.id} value={b.id}>
                    {b.batch_name} ({b.batch_code || b.batch_name.slice(0, 4).toUpperCase()} • {b.batch_type || b.mode || 'Offline'}) {tutor ? `— Tutor: ${tutor.full_name}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Picker for Daily View OR Month Picker for Monthly View */}
          {viewMode === 'daily' ? (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Attendance Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Attendance Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* 3. DAILY MARKING VIEW */}
      {viewMode === 'daily' && (
        <div className="space-y-4">
          {/* Quick Roster Status & Bulk Actions */}
          {selectedBatchId && batchStudents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-foreground">
                  Batch Roster ({batchStudents.length})
                </span>
                <span className="text-xs font-bold text-success bg-success-soft px-3 py-1 rounded-full border border-success/20 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {presentCount} Present
                </span>
                <span className="text-xs font-bold text-danger bg-danger-soft px-3 py-1 rounded-full border border-danger/20 flex items-center gap-1">
                  <X className="w-3 h-3" /> {absentCount} Absent
                </span>
                {unmarkedCount > 0 && (
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
                    {unmarkedCount} Unmarked
                  </span>
                )}
                <span className="text-xs font-black text-primary ml-1">
                  {dailyAttendanceRate}% Attendance Rate
                </span>
              </div>

              {/* Bulk Mark Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleMarkAll('present')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-success bg-success-soft hover:bg-success/20 border border-success/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Mark All Present
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleMarkAll('absent')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-danger bg-danger-soft hover:bg-danger/20 border border-danger/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Mark All Absent
                </button>
              </div>
            </div>
          )}

          {/* Daily Roster Table */}
          {selectedBatchId ? (
            <Card variant="glass" className="overflow-hidden border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-muted-2 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Student Reg No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-center">Today's Status</th>
                      <th className="px-4 py-3 text-right">Marking Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batchStudents.map((s) => {
                      const att = attendances.find(
                        (a) => a.student_id === s.id && a.attendance_date === selectedDate
                      );
                      const isPresent = (att?.status || '').toLowerCase() === 'present';
                      const isAbsent = (att?.status || '').toLowerCase() === 'absent';
                      const isMarked = isPresent || isAbsent;

                      return (
                        <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-primary font-bold">
                            {s.registration_number || `STU-${s.id.slice(0, 4)}`}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">
                            {s.student_name || s.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {s.phone || s.email || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isMarked ? (
                              <Badge variant={isPresent ? 'success' : 'error'}>
                                {isPresent ? 'Present' : 'Absent'}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Not marked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              disabled={isUpdating}
                              onClick={() => handleToggleAttendance(s.id, att?.status)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isPresent
                                  ? 'bg-danger-soft text-danger hover:bg-danger/20 border border-danger/20'
                                  : 'bg-success-soft text-success hover:bg-success/20 border border-success/20'
                              }`}
                            >
                              Mark {isPresent ? 'Absent' : 'Present'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {batchStudents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-xs">
                          No students currently enrolled in this batch.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card variant="glass" className="p-10 text-center border-dashed border-border">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <h4 className="text-sm font-bold text-foreground">Please Select a Batch</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Choose an academy batch from the dropdown above to mark daily attendance.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* 4. COMPREHENSIVE MONTHLY REGISTER VIEW (For Admins, Counselors & Tutors) */}
      {viewMode === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="glass" className="p-4 border-primary/20 bg-primary-soft/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Batch Average Attendance
                </span>
                <div className="p-2 bg-primary-soft rounded-lg text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-foreground">{monthlyStats.averageRate}%</div>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                  Overall presence for {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}
                </p>
              </div>
            </Card>

            <Card variant="glass" className="p-4 border-indigo/20 bg-indigo-500/10 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Marked Sessions
                </span>
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-foreground">{monthlyStats.totalSessions}</div>
                <p className="text-[10px] text-indigo-400 font-semibold mt-1">Class sessions conducted</p>
              </div>
            </Card>

            <Card variant="glass" className="p-4 border-success/20 bg-success-soft/30 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  100% Attendance
                </span>
                <div className="p-2 bg-success-soft rounded-lg text-success">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-success">{monthlyStats.fullAttendanceCount}</div>
                <p className="text-[10px] text-success font-semibold mt-1">Students with perfect attendance</p>
              </div>
            </Card>

            <Card variant="glass" className="p-4 border-danger/20 bg-danger-soft/20 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  At-Risk Students (&lt; 75%)
                </span>
                <div className="p-2 bg-danger-soft rounded-lg text-danger">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-danger">{monthlyStats.lowAttendanceCount}</div>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Students below attendance criteria</p>
              </div>
            </Card>
          </div>

          {/* Full Monthly Register Grid Table */}
          <Card variant="glass" className="p-5 border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-primary" />
                  Monthly Attendance Matrix — {currentBatch?.batch_name || 'Batch'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Full day-by-day attendance register for {monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth}
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-success">
                  <span className="w-4 h-4 rounded bg-success-soft border border-success/30 flex items-center justify-center font-bold text-[9px]">P</span>
                  <span>Present</span>
                </span>
                <span className="flex items-center gap-1 text-danger">
                  <span className="w-4 h-4 rounded bg-danger-soft border border-danger/30 flex items-center justify-center font-bold text-[9px]">A</span>
                  <span>Absent</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-muted border border-border flex items-center justify-center font-bold text-[9px]">-</span>
                  <span>No Class / Off</span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted-2 text-muted-foreground font-bold uppercase tracking-wider border-b border-border text-[10px]">
                    <th className="px-3 py-2.5 sticky left-0 bg-muted-2 z-10 min-w-[90px]">Reg No</th>
                    <th className="px-3 py-2.5 sticky left-[90px] bg-muted-2 z-10 min-w-[140px]">Student Name</th>
                    {monthlyStats.dayNumbers.map((dNum) => (
                      <th key={dNum} className="px-1.5 py-2 text-center min-w-[28px]">
                        {dNum}
                      </th>
                    ))}
                    <th className="px-2.5 py-2.5 text-center text-success font-extrabold">P</th>
                    <th className="px-2.5 py-2.5 text-center text-danger font-extrabold">A</th>
                    <th className="px-3 py-2.5 text-center font-black">Rate</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyStats.studentRows.map(({ student, pCount, aCount, rate, dayMap }) => (
                    <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-primary font-bold sticky left-0 bg-card z-10 text-[11px]">
                        {student.registration_number || `STU-${student.id.slice(0, 4)}`}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-foreground sticky left-[90px] bg-card z-10 text-xs">
                        {student.student_name || student.name}
                      </td>

                      {/* Day Cells 1..31 */}
                      {monthlyStats.dayNumbers.map((dNum) => {
                        const status = dayMap[dNum];
                        const isP = status === 'present';
                        const isA = status === 'absent';

                        return (
                          <td key={dNum} className="px-1 py-2 text-center">
                            {isP ? (
                              <span className="w-5 h-5 mx-auto rounded bg-success-soft text-success border border-success/30 flex items-center justify-center font-bold text-[9px]">
                                P
                              </span>
                            ) : isA ? (
                              <span className="w-5 h-5 mx-auto rounded bg-danger-soft text-danger border border-danger/30 flex items-center justify-center font-bold text-[9px]">
                                A
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30 text-[10px]">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Columns */}
                      <td className="px-2.5 py-2.5 text-center font-extrabold text-success text-xs">
                        {pCount}
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-extrabold text-danger text-xs">
                        {aCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-black text-xs text-foreground">
                        {rate}%
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={rate >= 85 ? 'success' : rate >= 75 ? 'info' : 'error'}>
                          {rate >= 85 ? 'Excellent' : rate >= 75 ? 'Good' : 'Low (<75%)'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {monthlyStats.studentRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={monthlyStats.totalDays + 6}
                        className="px-4 py-12 text-center text-muted-foreground text-xs"
                      >
                        No students enrolled in this batch for attendance tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
