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
  Table as TableIcon,
  Lock,
  ShieldAlert,
  Printer,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  Clock
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
        } catch (_) { }
      }

      let sData = sRes.data || [];
      if (sData.length === 0 && (!students || students.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/students?select=*');
          if (r.ok) sData = await r.json();
        } catch (_) { }
      }

      let aData = aRes.data || [];
      if (aData.length === 0 && (!attendances || attendances.length === 0)) {
        try {
          const r = await fetch('/supabase-admin/rest/v1/student_attendance?select=*&order=attendance_date.desc');
          if (r.ok) aData = await r.json();
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
      if (!attendances || attendances.length === 0) {
        setInternalAttendances(
          aData.map((a: any) => ({
            ...a,
            status: (a.status || 'present').toLowerCase()
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
  const isCounselor = (activeStaff?.designation || '').toLowerCase().includes('counselor');
  const isStaffTutor = (activeStaff?.designation || '').toLowerCase().includes('tutor') ||
    (activeStaff?.designation || '').toLowerCase().includes('faculty') ||
    (activeStaff?.designation || '').toLowerCase().includes('trainer') ||
    (activeStaff?.designation || '').toLowerCase().includes('instructor');
  const isTutor = isStaffTutor;

  // Filter batches: Admins/Owners retain unrestricted cross-batch access.
  // Academic Tutors (Online like Sinsiya & Offline like Safeer) ONLY see batches assigned to them.
  const availableBatches = useMemo(() => {
    if (isAdminMode || isOwner) return effectiveBatches;
    if (isStaffTutor && activeStaff?.id) {
      return effectiveBatches.filter((b) =>
        b.tutor_id === activeStaff.id ||
        (b.tutor_name && b.tutor_name.toLowerCase() === activeStaff.full_name?.toLowerCase())
      );
    }
    return effectiveBatches;
  }, [isAdminMode, isOwner, isStaffTutor, effectiveBatches, activeStaff?.id, activeStaff?.full_name]);

  // Selected Batch ID state (defaults to first available batch)
  const defaultBatchId = useMemo(() => {
    return (availableBatches[0]?.id || (isAdminMode || isOwner ? effectiveBatches[0]?.id : '') || '');
  }, [availableBatches, effectiveBatches, isAdminMode, isOwner]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId);

  // Keep selectedBatchId strictly within availableBatches for tutors
  useEffect(() => {
    if (isStaffTutor && !isAdminMode && !isOwner) {
      if (availableBatches.length > 0 && !availableBatches.some((b) => b.id === selectedBatchId)) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else if (!selectedBatchId && defaultBatchId) {
      setSelectedBatchId(defaultBatchId);
    }
  }, [availableBatches, selectedBatchId, defaultBatchId, isStaffTutor, isAdminMode, isOwner]);

  // Permission Check: Assigned Academic Tutor OR Admins/Owners can mark and edit attendance
  const canMarkAttendance = useMemo(() => {
    if (isAdminMode || isOwner) return true;
    if (!isStaffTutor || !activeStaff?.id) return false;
    // Any batch in availableBatches is an assigned batch for this tutor with universal marking rights
    const batch = effectiveBatches.find(b => b.id === selectedBatchId);
    if (batch?.tutor_id === activeStaff.id) return true;
    if (batch?.tutor_name && batch.tutor_name.toLowerCase() === activeStaff.full_name?.toLowerCase()) return true;
    return availableBatches.some(b => b.id === selectedBatchId);
  }, [isAdminMode, isOwner, isStaffTutor, activeStaff?.id, activeStaff?.full_name, effectiveBatches, selectedBatchId, availableBatches]);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'unmarked'>('all');

// Automated Weekend Holiday Detection (Saturday & Sunday)
const isWeekendHoliday = useMemo(() => {
  if (!selectedDate) return false;
  const parts = selectedDate.split('-');
  if (parts.length < 3) return false;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}, [selectedDate]);

const weekendDayLabel = useMemo(() => {
  if (!selectedDate) return '';
  const parts = selectedDate.split('-');
  if (parts.length < 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const day = d.getDay();
  if (day === 0) return 'Sunday';
  if (day === 6) return 'Saturday';
  return '';
}, [selectedDate]);

// Date shifting & quick jump helpers
const handleShiftDate = (days: number) => {
  try {
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  } catch (_) { }
};

const handleJumpToToday = () => {
  setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
};

const formattedDateTitle = useMemo(() => {
  try {
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return selectedDate;
  }
}, [selectedDate]);

const isToday = useMemo(() => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return selectedDate === today;
}, [selectedDate]);

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

const currentBatchTutor = useMemo(() => {
  if (!currentBatch?.tutor_id) return null;
  return staffList.find(s => s.id === currentBatch.tutor_id);
}, [currentBatch, staffList]);

// Students in selected batch
const batchStudents = useMemo(() => {
  if (!selectedBatchId) return [];
  return effectiveStudents.filter((s) => s.batch_id === selectedBatchId);
}, [effectiveStudents, selectedBatchId]);

// Filtered students by search query and status filter
const filteredBatchStudents = useMemo(() => {
  let list = batchStudents;
  const q = searchQuery.toLowerCase().trim();
  if (q) {
    list = list.filter((s) =>
      (s.student_name || s.name || '').toLowerCase().includes(q) ||
      (s.registration_number || s.student_id_code || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    list = list.filter((s) => {
      const att = effectiveAttendances.find(
        (a) => a.student_id === s.id && a.attendance_date === selectedDate
      );
      const st = (att?.status || '').toLowerCase();
      if (statusFilter === 'present') return st === 'present';
      if (statusFilter === 'late') return st === 'late';
      if (statusFilter === 'absent') return st === 'absent';
      if (statusFilter === 'unmarked') return st !== 'present' && st !== 'absent';
      if (statusFilter === 'unmarked') return st !== 'present' && st !== 'late' && st !== 'absent';
      return true;
    });
  }
  return list;
}, [batchStudents, searchQuery, statusFilter, effectiveAttendances, selectedDate]);

// Daily records for selected date
const dailyRecords = useMemo(() => {
  return effectiveAttendances.filter(
    (a) => a.attendance_date === selectedDate && batchStudents.some((s) => s.id === a.student_id)
  );
}, [effectiveAttendances, selectedDate, batchStudents]);

const presentCount = dailyRecords.filter((a) => (a.status || '').toLowerCase() === 'present').length;
const lateCount = dailyRecords.filter((a) => (a.status || '').toLowerCase() === 'late').length;
const absentCount = dailyRecords.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
const unmarkedCount = Math.max(0, batchStudents.length - (presentCount + lateCount + absentCount));
const dailyAttendanceRate = batchStudents.length > 0
  ? Math.round(((presentCount + lateCount) / batchStudents.length) * 100)
  : 0;

// Monthly Matrix Calculations
const monthlyStats = useMemo(() => {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const totalDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Records for this batch and month
  const monthLogs = effectiveAttendances.filter(
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
    const lCount = sLogs.filter((a) => (a.status || '').toLowerCase() === 'late').length;
    const aCount = sLogs.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
    const attended = pCount + lCount;
    const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

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
      lCount,
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
}, [selectedMonth, effectiveAttendances, selectedBatchId, batchStudents]);

// Overall Batch Attendance Aggregates for PDF & Reporting
const batchSummaryStats = useMemo(() => {
  if (!selectedBatchId || batchStudents.length === 0) {
    return {
      totalClasses: 0,
      turnoutRate: 0,
      regularStudents: 0,
      atRiskStudents: 0,
      studentAggregates: []
    };
  }

  const batchAtts = effectiveAttendances.filter(
    (a) => a.batch_id === selectedBatchId || batchStudents.some((s) => s.id === a.student_id)
  );

  const uniqueDates = Array.from(new Set(batchAtts.map((a) => a.attendance_date))).filter(Boolean);
  const totalClasses = uniqueDates.length;

  let totalAttendedCount = 0;
  let totalStudentSessions = 0;
  let regularCount = 0;
  let atRiskCount = 0;

  const studentAggregates = batchStudents.map((student) => {
    const studentLogs = batchAtts.filter((a) => a.student_id === student.id);
    const pCount = studentLogs.filter((a) => (a.status || '').toLowerCase() === 'present').length;
    const lCount = studentLogs.filter((a) => (a.status || '').toLowerCase() === 'late').length;
    const aCount = studentLogs.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
    const attended = pCount + lCount;
    const baseClasses = totalClasses > 0 ? totalClasses : (attended + aCount);
    const rate = baseClasses > 0 ? Math.round((attended / baseClasses) * 100) : 0;

    totalAttendedCount += attended;
    totalStudentSessions += baseClasses;

    let statusLabel: 'Excellent' | 'Good' | 'Average' | 'Critical' = 'Good';
    if (rate >= 85) {
      statusLabel = 'Excellent';
      regularCount++;
    } else if (rate >= 75) {
      statusLabel = 'Good';
      regularCount++;
    } else if (rate >= 60) {
      statusLabel = 'Average';
    } else {
      statusLabel = 'Critical';
      atRiskCount++;
    }

    return {
      student,
      presentCount: pCount,
      lateCount: lCount,
      absentCount: aCount,
      baseClasses,
      rate,
      statusLabel
    };
  }).sort((a, b) => b.rate - a.rate);

    const turnoutRate = totalStudentSessions > 0
      ? Math.round((totalAttendedCount / totalStudentSessions) * 100)
      : 0;

  return {
    totalClasses,
    turnoutRate,
    regularStudents: regularCount,
    atRiskStudents: atRiskCount,
    studentAggregates
  };
}, [selectedBatchId, batchStudents, effectiveAttendances]);

// Set individual student attendance: 'present' | 'late' | 'absent'
const handleSetAttendance = async (studentId: string, targetStatus: 'present' | 'late' | 'absent') => {
  if (!activeStaff || !selectedBatchId) return;
  if (!canMarkAttendance) {
    alert('Permission Denied: Daily student attendance marking is restricted to assigned Academic Tutors and Admins.');
    return;
  }
  setIsUpdating(true);

  // Optimistically update internal state for instant UI response
  setInternalAttendances((prev) => {
    const existingIdx = prev.findIndex(
      (a) => a.student_id === studentId && a.attendance_date === selectedDate
    );
    if (existingIdx >= 0) {
      const copy = [...prev];
      copy[existingIdx] = { ...copy[existingIdx], status: targetStatus };
      return copy;
    } else {
      return [
        {
          id: 'temp-' + Date.now(),
          batch_id: selectedBatchId,
          student_id: studentId,
          attendance_date: selectedDate,
          status: targetStatus,
          marked_by: activeStaff.id
        },
        ...prev
      ];
    }
  });

  try {
    const existing = effectiveAttendances.find(
      (a) => a.student_id === studentId && a.attendance_date === selectedDate
    );

    if (existing && !String(existing.id).startsWith('temp-') && !String(existing.id).startsWith('bulk-')) {
      // Try proxy update
      const patchRes = await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, marked_by: activeStaff.id })
      });

      if (!patchRes.ok) {
        await supabase
          .from('student_attendance')
          .update({ status: targetStatus, marked_by: activeStaff.id })
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
            status: targetStatus,
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
            status: targetStatus,
            marked_by: activeStaff.id
          }
        ]);
      }
    }

    if (onAttendanceChanged) await onAttendanceChanged();
  } catch (err) {
    console.error('Attendance update error:', err);
  } finally {
    setIsUpdating(false);
  }
};


// Mark all students Present, Late, or Absent
const handleMarkAll = async (status: 'present' | 'late' | 'absent') => {
  if (!activeStaff || !selectedBatchId || batchStudents.length === 0) return;
  if (!canMarkAttendance) {
    alert('Permission Denied: Daily student attendance marking is restricted to assigned Academic Tutors and Admins.');
    return;
  }
  setIsUpdating(true);

  // Optimistically update internal state
  setInternalAttendances((prev) => {
    const other = prev.filter(
      (a) => !(a.attendance_date === selectedDate && batchStudents.some((s) => s.id === a.student_id))
    );
    const nextRecords = batchStudents.map((s) => ({
      id: 'bulk-' + s.id + '-' + Date.now(),
      batch_id: selectedBatchId,
      student_id: s.id,
      attendance_date: selectedDate,
      status,
      marked_by: activeStaff.id
    }));
    return [...nextRecords, ...other];
  });

  try {
    for (const s of batchStudents) {
      const existing = effectiveAttendances.find(
        (a) => a.student_id === s.id && a.attendance_date === selectedDate
      );

      if (existing && !String(existing.id).startsWith('temp-') && !String(existing.id).startsWith('bulk-')) {
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
  } catch (err) {
    console.error('Mark all attendance error:', err);
  } finally {
    setIsUpdating(false);
  }
};

// Delete / Reset individual student attendance record
const handleDeleteAttendance = async (studentId: string) => {
  if (!activeStaff || !selectedBatchId) return;
  if (!canMarkAttendance) {
    alert('Permission Denied: Attendance correction is restricted to assigned Academic Tutors and Admins.');
    return;
  }
  const existing = effectiveAttendances.find(
    (a) => a.student_id === studentId && a.attendance_date === selectedDate
  );
  if (!existing) return;

  if (!window.confirm("Reset this student's attendance record for this date to Unmarked?")) return;

  // Optimistically update internal state
  setInternalAttendances((prev) =>
    prev.filter((a) => !(a.student_id === studentId && a.attendance_date === selectedDate))
  );
  setIsUpdating(true);

  try {
    if (existing.id && !String(existing.id).startsWith('temp-') && !String(existing.id).startsWith('bulk-')) {
      const delRes = await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
        method: 'DELETE'
      });
      if (!delRes.ok) {
        await supabase.from('student_attendance').delete().eq('id', existing.id);
      }
    } else {
      await fetch(`/supabase-admin/rest/v1/student_attendance?student_id=eq.${studentId}&attendance_date=eq.${selectedDate}&batch_id=eq.${selectedBatchId}`, {
        method: 'DELETE'
      }).catch(async () => {
        await supabase.from('student_attendance')
          .delete()
          .eq('student_id', studentId)
          .eq('attendance_date', selectedDate);
      });
    }

    if (onAttendanceChanged) await onAttendanceChanged();
  } catch (err) {
    console.error('Delete attendance error:', err);
  } finally {
    setIsUpdating(false);
  }
};

// Reset all records for this batch on selectedDate
const handleResetDate = async () => {
  if (!activeStaff || !selectedBatchId) return;
  if (!canMarkAttendance) {
    alert('Permission Denied: Attendance correction is restricted to assigned Academic Tutors and Admins.');
    return;
  }

  const dateRecs = effectiveAttendances.filter(
    (a) => a.attendance_date === selectedDate && (a.batch_id === selectedBatchId || batchStudents.some((s) => s.id === a.student_id))
  );
  if (dateRecs.length === 0) {
    alert('No attendance records found for this batch on this date.');
    return;
  }

  if (!window.confirm(`Are you sure you want to reset all ${dateRecs.length} attendance records for ${selectedDate}? All students will revert to Unmarked.`)) return;

  // Optimistically update internal state
  setInternalAttendances((prev) =>
    prev.filter((a) => !(a.attendance_date === selectedDate && (a.batch_id === selectedBatchId || batchStudents.some((s) => s.id === a.student_id))))
  );
  setIsUpdating(true);

  try {
    await fetch(`/supabase-admin/rest/v1/student_attendance?batch_id=eq.${selectedBatchId}&attendance_date=eq.${selectedDate}`, {
      method: 'DELETE'
    }).catch(async () => {
      await supabase.from('student_attendance')
        .delete()
        .eq('batch_id', selectedBatchId)
        .eq('attendance_date', selectedDate);
    });

    if (onAttendanceChanged) await onAttendanceChanged();
  } catch (err) {
    console.error('Reset batch date error:', err);
  } finally {
    setIsUpdating(false);
  }
};

// One-Click Official Batch PDF Export
const handleExportBatchPDF = () => {
  if (!currentBatch) {
    alert('Please select an academy batch to export.');
    return;
  }

  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocker prevented opening the printable report. Please allow popups for this site.');
      return;
    }

    const todayIST = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const tutorName = currentBatchTutor?.full_name || currentBatch?.tutor_name || activeStaff?.full_name || 'Academic Faculty';

    const rowsHtml = batchSummaryStats.studentAggregates.map((item, idx) => {
      const badgeColor = item.rate >= 85
        ? '#059669'
        : item.rate >= 75
          ? '#2563eb'
          : item.rate >= 60
            ? '#d97706'
            : '#dc2626';

      const badgeBg = item.rate >= 85
        ? '#ecfdf5'
        : item.rate >= 75
          ? '#eff6ff'
          : item.rate >= 60
            ? '#fffbeb'
            : '#fef2f2';

      return `
          <tr>
            <td style="text-align: center; font-family: monospace; color: #64748b;">${idx + 1}</td>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${item.student.name || item.student.student_name}</div>
              <div style="font-size: 10px; font-family: monospace; color: #6366f1;">${item.student.student_id_code || item.student.registration_number || '-'}</div>
            </td>
            <td style="font-size: 11px; color: #475569;">${item.student.phone || item.student.email || '-'}</td>
            <td style="text-align: center; font-weight: 700;">${item.baseClasses}</td>
            <td style="text-align: center; font-weight: 700; color: #059669;">${item.presentCount}</td>
            <td style="text-align: center; font-weight: 700; color: #d97706;">${item.lateCount}</td>
            <td style="text-align: center; font-weight: 700; color: #dc2626;">${item.absentCount}</td>
            <td style="text-align: center;">
              <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeColor}33;">
                ${item.rate}%
              </span>
            </td>
            <td style="text-align: center; font-weight: 700; font-size: 11px; color: ${badgeColor};">
              ${item.statusLabel}
            </td>
          </tr>
        `;
    }).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Attendance Report - ${currentBatch.batch_name}</title>
            <style>
              @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
              * { box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #0f172a;
                margin: 0;
                padding: 0;
                font-size: 12px;
                background: #fff;
              }
              .header-table {
                width: 100%;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 12px;
                margin-bottom: 16px;
              }
              .brand-title {
                font-size: 20px;
                font-weight: 900;
                color: #4f46e5;
                letter-spacing: -0.5px;
              }
              .brand-sub {
                font-size: 11px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .report-title-box {
                text-align: right;
              }
              .report-title {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
              }
              .report-meta {
                font-size: 11px;
                color: #64748b;
              }
              .meta-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 18px;
              }
              .meta-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px;
              }
              .meta-label {
                font-size: 9px;
                text-transform: uppercase;
                font-weight: 700;
                color: #64748b;
                margin-bottom: 4px;
              }
              .meta-value {
                font-size: 14px;
                font-weight: 800;
                color: #0f172a;
              }
              table.data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 11px;
              }
              table.data-table th {
                background: #f1f5f9;
                color: #475569;
                text-transform: uppercase;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.5px;
                padding: 8px 10px;
                border: 1px solid #cbd5e1;
                text-align: left;
              }
              table.data-table td {
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                vertical-align: middle;
              }
              table.data-table tr:nth-child(even) {
                background: #f8fafc;
              }
              .footer-signatures {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                padding-top: 20px;
                page-break-inside: avoid;
              }
              .signature-block {
                width: 220px;
                border-top: 1px solid #94a3b8;
                text-align: center;
                padding-top: 6px;
                font-size: 10px;
                font-weight: 700;
                color: #475569;
              }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand-title">TECH ADS ACADEMY</div>
                  <div class="brand-sub">Official Student Attendance Register</div>
                </td>
                <td class="report-title-box">
                  <div class="report-title">${currentBatch.batch_name}</div>
                  <div class="report-meta">Course: ${currentBatch.course_name || 'Standard Curriculum'}</div>
                  <div class="report-meta">Faculty: ${tutorName} • Mode: ${(currentBatch.batch_type || currentBatch.mode || 'Offline').toUpperCase()}</div>
                  <div class="report-meta">Report Generated: ${todayIST}</div>
                </td>
              </tr>
            </table>

            <div class="meta-grid">
              <div class="meta-card">
                <div class="meta-label">Total Enrolled</div>
                <div class="meta-value">${batchStudents.length} Students</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">Sessions Conducted</div>
                <div class="meta-value">${batchSummaryStats.totalClasses} Classes</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">Batch Turnout Rate</div>
                <div class="meta-value" style="color: #4f46e5;">${batchSummaryStats.turnoutRate}%</div>
              </div>
              <div class="meta-card">
                <div class="meta-label">Attendance Standing</div>
                <div class="meta-value" style="font-size: 11px;">
                  <span style="color: #059669; font-weight: 800;">${batchSummaryStats.regularStudents} Regular</span> / 
                  <span style="color: #dc2626; font-weight: 800;">${batchSummaryStats.atRiskStudents} At-Risk</span>
                </div>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">#</th>
                  <th>Student Name & Code</th>
                  <th>Contact</th>
                  <th style="text-align: center;">Sessions</th>
                  <th style="text-align: center;">Present</th>
                  <th style="text-align: center;">Late</th>
                  <th style="text-align: center;">Absent</th>
                  <th style="text-align: center;">Turnout %</th>
                  <th style="text-align: center;">Standing</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="footer-signatures">
              <div class="signature-block">
                Course Tutor Signature<br/>
                <span style="font-size: 9px; font-weight: normal; color: #64748b;">${tutorName}</span>
              </div>
              <div class="signature-block">
                Director / Academic Head<br/>
                <span style="font-size: 9px; font-weight: normal; color: #64748b;">Tech Ads Academy Administration</span>
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
    printWindow.document.close();
  } catch (err) {
    console.error('Error generating attendance PDF:', err);
    alert('Failed to generate attendance report.');
  }
};

return (
  <div className="space-y-6 animate-fade-in">
    {/* 1. Header with Role Info & View Toggle */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border">
      <div className="flex items-center gap-3">
        <div className="p-2.5 sm:p-3 rounded-xl bg-primary-soft text-primary border border-primary/20">
          <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2 flex-wrap">
            <span>Student Attendance Portal</span>
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
      <div className="flex items-center gap-2 bg-muted-2 p-1 rounded-xl border border-border w-full sm:w-auto justify-between sm:justify-start">
        <button
          onClick={() => setViewMode('daily')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'daily'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily Marking</span>
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'monthly'
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Select Batch ({availableBatches.length} Available)
            </label>
            {isTutor && !isAdminMode && !isOwner && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Assigned Only
              </span>
            )}
          </div>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-xs"
          >
            <option value="">-- Choose an Academy Batch --</option>
            {availableBatches.map((b) => {
              const tutor = staffList.find((s) => s.id === b.tutor_id);
              const isCompleted = (b.status || '').toLowerCase() === 'completed';
              return (
                <option key={b.id} value={b.id}>
                  {b.batch_name} ({b.batch_code || b.batch_name.slice(0, 4).toUpperCase()} • {b.batch_type || b.mode || 'Offline'} • {isCompleted ? '🎓 Completed' : b.status || 'Active'}) {tutor ? `— Tutor: ${tutor.full_name}` : ''}
                </option>
              );
            })}
          </select>

          {currentBatch && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50 text-[11px]">
              <span className="font-bold text-foreground flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary" /> {currentBatch.batch_name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                {currentBatch.course_name || 'Standard Curriculum'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-primary-soft text-primary font-semibold">
                Tutor: {currentBatchTutor?.full_name || currentBatch.tutor_name || 'Assigned Tutor'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold">
                {(currentBatch.batch_type || currentBatch.mode || 'Offline').toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">
                {batchStudents.length} Students Enrolled
              </span>
            </div>
          )}
        </div>

        {/* Date Picker for Daily View OR Month Picker for Monthly View */}
        {viewMode === 'daily' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Attendance Date: <span className="text-foreground">{formattedDateTitle}</span>
              </label>
              <div className="flex items-center gap-1">
                {!isToday && (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="text-[10px] font-bold text-primary hover:text-primary-focus bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 cursor-pointer transition-all"
                  >
                    Jump to Today
                  </button>
                )}
                {isToday && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Today
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-2.5 rounded-xl bg-muted-2 hover:bg-muted border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-muted-2 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-xs"
              />
              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-2.5 rounded-xl bg-muted-2 hover:bg-muted border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
              <span>Auditing logs for <strong className="text-foreground">{selectedDate}</strong></span>
              <span className="text-primary font-bold">{presentCount} Present / {batchStudents.length} Total</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Attendance Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-xs"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
              <span>Monthly Register & Matrix</span>
              <span className="text-primary font-bold">{monthlyStats.totalSessions} Sessions Marked</span>
            </div>
          </div>
        )}
      </div>
    </Card>

    {/* 3. DAILY MARKING VIEW */}
    {viewMode === 'daily' && (
      <div className="space-y-4">
        {/* Empty State for Tutors with No Batches */}
        {isStaffTutor && !isAdminMode && !isOwner && availableBatches.length === 0 && (
          <Card variant="glass" className="p-8 border-border text-center space-y-3">
            <div className="p-3 w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Batches Assigned</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You are signed in as an Academic Tutor, but no active course batches are currently linked to your faculty profile ({activeStaff?.full_name}). Please contact the academy administrator to assign your course batches.
            </p>
          </Card>
        )}

        {/* Automated Weekend Holiday Status Banner */}
        {isWeekendHoliday && (
          <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs animate-fade-in text-amber-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-amber-200 text-sm flex items-center gap-2">
                  <span>Weekend Holiday ({weekendDayLabel})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Official Academy Off
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Regular academy classes are not scheduled on Saturdays and Sundays. Faculty can still mark attendance if special sessions or compensatory classes were conducted.
                </p>
              </div>
            </div>
            <Badge variant="warning" className="text-[10px] font-bold">
              Weekend Off
            </Badge>
          </div>
        )}

        {/* View-Only Mode Banner for Non-Authorized Staff (Hidden for assigned tutors) */}
        {selectedBatchId && !canMarkAttendance && !isStaffTutor && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-xs animate-fade-in">
            <div className="flex items-center gap-2.5 text-indigo-300 font-semibold">
              <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>View-Only Register:</strong> Daily student attendance marking is restricted to the assigned Academic Tutor ({currentBatchTutor?.full_name || currentBatch?.tutor_name || 'Tutor'}) and Administrators.
              </span>
            </div>
            <Badge variant="indigo" className="text-[10px] font-bold flex items-center gap-1 shrink-0">
              <Lock className="w-3 h-3" /> View Mode
            </Badge>
          </div>
        )}

        {/* Search & Status Filter Strip */}
        {selectedBatchId && batchStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card rounded-2xl border border-border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name, reg ID, phone, or email..."
                className="w-full bg-muted-2 border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'all'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted-2 text-muted-foreground hover:text-foreground border border-border'
                  }`}
              >
                All ({batchStudents.length})
              </button>
              <button
                onClick={() => setStatusFilter('present')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'present'
                    ? 'bg-success text-white shadow-xs'
                    : 'bg-muted-2 text-success hover:bg-success-soft border border-border'
                  }`}
              >
                Present ({presentCount})
              </button>
              <button
                onClick={() => setStatusFilter('late')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'late'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-muted-2 text-amber-400 hover:bg-amber-500/10 border border-border'
                  }`}
              >
                Late ({lateCount})
              </button>
              <button
                onClick={() => setStatusFilter('absent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'absent'
                    ? 'bg-danger text-white shadow-xs'
                    : 'bg-muted-2 text-danger hover:bg-danger-soft border border-border'
                  }`}
              >
                Absent ({absentCount})
              </button>
              <button
                onClick={() => setStatusFilter('unmarked')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === 'unmarked'
                    ? 'bg-muted-foreground text-background shadow-xs'
                    : 'bg-muted-2 text-muted-foreground hover:bg-muted border border-border'
                  }`}
              >
                Unmarked ({unmarkedCount})
              </button>
            </div>
          </div>
        )}

        {/* Quick Roster Status & Bulk Actions */}
        {selectedBatchId && batchStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                Batch Roster ({batchStudents.length})
              </span>
              <span className="text-xs font-bold text-success bg-success-soft px-3 py-1 rounded-full border border-success/20 flex items-center gap-1">
                <Check className="w-3 h-3" /> {presentCount} Present
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lateCount} Late
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
            <div className="flex items-center gap-2 flex-wrap">
              {canMarkAttendance ? (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleMarkAll('present')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-success bg-success-soft hover:bg-success/20 border border-success/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark All Present
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleMarkAll('late')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" /> Mark All Late
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleMarkAll('absent')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-danger bg-danger-soft hover:bg-danger/20 border border-danger/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" /> Mark All Absent
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || dailyRecords.length === 0}
                    onClick={handleResetDate}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-muted-2 hover:bg-muted border border-border flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                    title="Clear and reset all records for this date"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" /> Reset Date
                  </button>
                  <button
                    type="button"
                    onClick={handleExportBatchPDF}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Export official printable batch attendance report"
                  >
                    <Printer className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 px-3 py-1.5 rounded-xl bg-muted border border-border">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    Marking Restricted to Assigned Tutor
                  </span>
                  <button
                    type="button"
                    onClick={handleExportBatchPDF}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Export official printable batch attendance report"
                  >
                    <Printer className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </>
              )}
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
                  {filteredBatchStudents.map((s) => {
                    const att = effectiveAttendances.find(
                      (a) => a.student_id === s.id && a.attendance_date === selectedDate
                    );
                    const isPresent = (att?.status || '').toLowerCase() === 'present';
                    const isLate = (att?.status || '').toLowerCase() === 'late';
                    const isAbsent = (att?.status || '').toLowerCase() === 'absent';
                    const isMarked = isPresent || isLate || isAbsent;

                    return (
                      <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-primary font-bold">
                          {s.registration_number || s.student_id_code || `STU-${s.id.slice(0, 4)}`}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          <div>{s.student_name || s.name}</div>
                          {(s.email || s.phone) && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {s.email || s.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {s.phone || s.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPresent ? (
                            <Badge variant="success" className="font-bold inline-flex items-center gap-1 justify-center">
                              <Check className="w-3 h-3" /> Present
                            </Badge>
                          ) : isLate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Late
                            </span>
                          ) : isAbsent ? (
                            <Badge variant="error" className="font-bold inline-flex items-center gap-1 justify-center">
                              <X className="w-3 h-3" /> Absent
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Not marked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canMarkAttendance ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSetAttendance(s.id, 'present')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isPresent
                                    ? 'bg-success text-white shadow-xs font-black'
                                    : 'bg-muted-2 text-muted-foreground hover:bg-success-soft hover:text-success border border-border'
                                  }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSetAttendance(s.id, 'late')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isLate
                                    ? 'bg-amber-500 text-white shadow-xs font-black'
                                    : 'bg-muted-2 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-400 border border-border'
                                  }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleSetAttendance(s.id, 'absent')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isAbsent
                                    ? 'bg-danger text-white shadow-xs font-black'
                                    : 'bg-muted-2 text-muted-foreground hover:bg-danger-soft hover:text-danger border border-border'
                                  }`}
                              >
                                Absent
                              </button>
                              {isMarked && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleDeleteAttendance(s.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft border border-border hover:border-danger/30 transition-all cursor-pointer"
                                  title="Reset student record to Unmarked"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-muted-foreground bg-muted/60 border border-border">
                              <Lock className="w-3 h-3 text-muted-foreground/70" />
                              <span>{isPresent ? 'Marked Present' : isLate ? 'Marked Late' : isAbsent ? 'Marked Absent' : 'Unmarked'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBatchStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-xs">
                        {batchStudents.length === 0
                          ? 'No students currently enrolled in this batch.'
                          : 'No students match your search or filter criteria.'}
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

            {/* Legend & Export */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-success">
                  <span className="w-4 h-4 rounded bg-success-soft border border-success/30 flex items-center justify-center font-bold text-[9px]">P</span>
                  <span>Present</span>
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-[9px]">L</span>
                  <span>Late</span>
                </span>
                <span className="flex items-center gap-1 text-danger">
                  <span className="w-4 h-4 rounded bg-danger-soft border border-danger/30 flex items-center justify-center font-bold text-[9px]">A</span>
                  <span>Absent</span>
                </span>
                <span className="flex items-center gap-1 text-amber-500/80">
                  <span className="w-4 h-4 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-[8px]">H</span>
                  <span>Weekend Off</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-muted border border-border flex items-center justify-center font-bold text-[9px]">-</span>
                  <span>No Class / Off</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportBatchPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer"
                title="Print or export complete batch attendance register"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export Batch PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted-2 text-muted-foreground font-bold uppercase tracking-wider border-b border-border text-[10px]">
                  <th className="px-3 py-2.5 sticky left-0 bg-muted-2 z-10 min-w-[90px]">Reg No</th>
                  <th className="px-3 py-2.5 sticky left-[90px] bg-muted-2 z-10 min-w-[140px]">Student Name</th>
                  {monthlyStats.dayNumbers.map((dNum) => {
                    const [yearStr, monthStr] = selectedMonth.split('-');
                    const dObj = new Date(Number(yearStr), Number(monthStr) - 1, dNum);
                    const dayOfWeek = dObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const dayLabel = dayOfWeek === 0 ? 'Su' : dayOfWeek === 6 ? 'Sa' : '';

                    return (
                      <th
                        key={dNum}
                        className={`px-1 py-1.5 text-center min-w-[28px] ${isWeekend ? 'bg-amber-500/10 text-amber-500 font-extrabold' : ''
                          }`}
                      >
                        <div>{dNum}</div>
                        {dayLabel && <div className="text-[8px] font-mono opacity-80">{dayLabel}</div>}
                      </th>
                    );
                  })}
                  <th className="px-2 py-2.5 text-center text-success font-extrabold">P</th>
                  <th className="px-2 py-2.5 text-center text-amber-500 font-extrabold">L</th>
                  <th className="px-2 py-2.5 text-center text-danger font-extrabold">A</th>
                  <th className="px-3 py-2.5 text-center font-black">Rate</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyStats.studentRows.map(({ student, pCount, lCount, aCount, rate, dayMap }) => (
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
                      const isL = status === 'late';
                      const isA = status === 'absent';
                      const [yearStr, monthStr] = selectedMonth.split('-');
                      const dObj = new Date(Number(yearStr), Number(monthStr) - 1, dNum);
                      const dayOfWeek = dObj.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      return (
                        <td
                          key={dNum}
                          className={`px-1 py-2 text-center ${isWeekend ? 'bg-amber-500/5' : ''}`}
                        >
                          {isP ? (
                            <span className="w-5 h-5 mx-auto rounded bg-success-soft text-success border border-success/30 flex items-center justify-center font-bold text-[9px]">
                              P
                            </span>
                          ) : isL ? (
                            <span className="w-5 h-5 mx-auto rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-[9px]">
                              L
                            </span>
                          ) : isA ? (
                            <span className="w-5 h-5 mx-auto rounded bg-danger-soft text-danger border border-danger/30 flex items-center justify-center font-bold text-[9px]">
                              A
                            </span>
                          ) : isWeekend ? (
                            <span
                              className="w-5 h-5 mx-auto rounded bg-amber-500/10 text-amber-500/70 border border-amber-500/20 flex items-center justify-center font-bold text-[8px]"
                              title="Weekend Holiday (Off)"
                            >
                              H
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className="px-2 py-2.5 text-center font-extrabold text-success text-xs">
                      {pCount}
                    </td>
                    <td className="px-2 py-2.5 text-center font-extrabold text-amber-500 text-xs">
                      {lCount}
                    </td>
                    <td className="px-2 py-2.5 text-center font-extrabold text-danger text-xs">
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
                      colSpan={monthlyStats.totalDays + 7}
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
