import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { supabase } from '../services/supabase';
import { useApp } from '../context/AppContext';
import { formatDisplayTime } from '../utils/attendanceRules';
import { TutorNoticeBoard } from './TutorNoticeBoard';
import {
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Search,
  Calendar,
  CalendarDays,
  Table as TableIcon,
  Building2,
  Wifi,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Camera,
  AlertCircle,
  Megaphone,
  UserCheck,
  Printer,
  Trash2,
  RotateCcw,
  FileText,
  Award
} from 'lucide-react';

interface TutorDashboardProps {
  activeStaff: any;
  onOpenPunchModal?: (type: 'IN' | 'OUT') => void;
}

export const TutorDashboard: React.FC<TutorDashboardProps> = ({
  activeStaff,
  onOpenPunchModal
}) => {
  const { todayAttendance } = useApp();
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab navigation inside Tutor Portal
  const [activePortalTab, setActivePortalTab] = useState<'attendance' | 'reports' | 'batches' | 'notices'>('attendance');

  // Attendance Register states
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [attendanceViewMode, setAttendanceViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<boolean>(false);

  // Expanded batch cards in Directory
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Online vs Offline classification check
  const isOnlineTutor = (activeStaff?.designation || '').toLowerCase().includes('online') ||
    (activeStaff?.shift_start_time && activeStaff.shift_start_time >= '18:00');

  useEffect(() => {
    if (activeStaff?.id) {
      loadTutorData();
    }
  }, [activeStaff?.id]);

  const loadTutorData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch batches assigned to this tutor
      let { data: bData, error: bErr } = await supabase
        .from('batches')
        .select('*')
        .eq('tutor_id', activeStaff.id)
        .order('created_at', { ascending: false });

      if (bErr || !bData || bData.length === 0) {
        // Fallback proxy fetch for assigned batches
        try {
          const r = await fetch(`/supabase-admin/rest/v1/batches?tutor_id=eq.${activeStaff.id}&order=created_at.desc`);
          if (r.ok) {
            const pb = await r.json();
            if (Array.isArray(pb)) bData = pb;
          }
        } catch (_) { }
      }

      const assignedBatches = bData || [];
      setBatches(assignedBatches);

      if (assignedBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(assignedBatches[0].id);
      }

      // 2. Fetch students belonging to these batches
      const batchIds = assignedBatches.map(b => b.id);
      let sData: any[] = [];
      if (batchIds.length > 0) {
        const { data: stData } = await supabase
          .from('students')
          .select('*')
          .in('batch_id', batchIds)
          .order('name');
        sData = stData || [];

        if (sData.length === 0) {
          try {
            const r = await fetch('/supabase-admin/rest/v1/students?select=*&order=name.asc');
            if (r.ok) {
              const allStudents = await r.json();
              if (Array.isArray(allStudents)) {
                sData = allStudents.filter(s => batchIds.includes(s.batch_id));
              }
            }
          } catch (_) { }
        }
      }
      setStudents(sData);

      // 3. Fetch student attendance records for these batches
      let aData: any[] = [];
      if (batchIds.length > 0) {
        const { data: attData } = await supabase
          .from('student_attendance')
          .select('*')
          .in('batch_id', batchIds)
          .order('attendance_date', { ascending: false });
        aData = attData || [];

        if (aData.length === 0) {
          try {
            const r = await fetch('/supabase-admin/rest/v1/student_attendance?select=*&order=attendance_date.desc');
            if (r.ok) {
              const allAtt = await r.json();
              if (Array.isArray(allAtt)) {
                aData = allAtt.filter(a => batchIds.includes(a.batch_id));
              }
            }
          } catch (_) { }
        }
      }
      setAttendances(
        aData.map(a => ({
          ...a,
          status: (a.status || '').toLowerCase() === 'present' ? 'present' : 'absent'
        }))
      );
    } catch (err) {
      console.error('Error fetching tutor portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-index students by batch ID
  const studentsByBatch = useMemo(() => {
    const map = new Map<string, any[]>();
    students.forEach(s => {
      const bId = s.batch_id || 'unassigned';
      if (!map.has(bId)) map.set(bId, []);
      map.get(bId)!.push(s);
    });
    return map;
  }, [students]);

  // Current selected batch
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || null;
  }, [batches, selectedBatchId]);

  // Students in current selected batch
  const currentBatchStudents = useMemo(() => {
    if (!currentBatch) return [];
    return studentsByBatch.get(currentBatch.id) || [];
  }, [currentBatch, studentsByBatch]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return currentBatchStudents;
    return currentBatchStudents.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.student_id_code || s.registration_number || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [currentBatchStudents, studentSearchQuery]);

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

  // Daily attendance records for current batch and date
  const dailyAttendanceMap = useMemo(() => {
    const map = new Map<string, 'present' | 'late' | 'absent'>();
    attendances.forEach(a => {
      if (a.attendance_date === selectedDate && (a.batch_id === currentBatch?.id || currentBatchStudents.some(s => s.id === a.student_id))) {
        const st = (a.status || '').toLowerCase();
        if (st === 'late') map.set(a.student_id, 'late');
        else if (st === 'absent') map.set(a.student_id, 'absent');
        else map.set(a.student_id, 'present');
      }
    });
    return map;
  }, [attendances, selectedDate, currentBatch, currentBatchStudents]);

  // Daily attendance summary numbers
  const dailyStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    currentBatchStudents.forEach(s => {
      const st = dailyAttendanceMap.get(s.id);
      if (st === 'present') present++;
      else if (st === 'late') late++;
      else if (st === 'absent') absent++;
    });
    const unmarked = Math.max(0, currentBatchStudents.length - (present + late + absent));
    const attended = present + late;
    const rate = currentBatchStudents.length > 0 ? Math.round((attended / currentBatchStudents.length) * 100) : 0;
    return { present, late, absent, unmarked, rate, total: currentBatchStudents.length };
  }, [currentBatchStudents, dailyAttendanceMap]);

  // Top metric aggregations
  const totalAssignedBatches = batches.length;
  const totalEnrolledStudents = students.length;
  const runningBatchesCount = batches.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'running' || st === 'ongoing' || st === 'active';
  }).length;
  const completedBatchesCount = batches.filter(b => {
    const st = (b.status || '').toLowerCase();
    return st === 'completed' || st === 'graduated';
  }).length;

  const overallAttendanceRate = useMemo(() => {
    if (attendances.length === 0) return 0;
    const attendedCount = attendances.filter(a => {
      const st = (a.status || '').toLowerCase();
      return st === 'present' || st === 'late';
    }).length;
    return Math.round((attendedCount / attendances.length) * 100);
  }, [attendances]);

  // Set/Toggle individual student attendance: 'present' | 'late' | 'absent'
  const handleToggleStudentAttendance = async (studentId: string, targetStatus: 'present' | 'late' | 'absent') => {
    if (!currentBatch || !activeStaff?.id) return;
    const nextStatus = targetStatus;

    // Optimistically update local state
    setAttendances(prev => {
      const existingIdx = prev.findIndex(a => a.student_id === studentId && a.attendance_date === selectedDate);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], status: nextStatus };
        return updated;
      } else {
        return [
          {
            id: 'temp-' + Date.now(),
            batch_id: currentBatch.id,
            student_id: studentId,
            attendance_date: selectedDate,
            status: nextStatus,
            marked_by: activeStaff.id
          },
          ...prev
        ];
      }
    });

    try {
      const existing = attendances.find(a => a.student_id === studentId && a.attendance_date === selectedDate);
      if (existing && !String(existing.id).startsWith('temp-')) {
        const patchRes = await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, marked_by: activeStaff.id })
        });
        if (!patchRes.ok) {
          await supabase
            .from('student_attendance')
            .update({ status: nextStatus, marked_by: activeStaff.id })
            .eq('id', existing.id);
        }
      } else {
        const insertRes = await fetch('/supabase-admin/rest/v1/student_attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            {
              batch_id: currentBatch.id,
              student_id: studentId,
              attendance_date: selectedDate,
              status: nextStatus,
              marked_by: activeStaff.id
            }
          ])
        });
        if (!insertRes.ok) {
          await supabase.from('student_attendance').insert([
            {
              batch_id: currentBatch.id,
              student_id: studentId,
              attendance_date: selectedDate,
              status: nextStatus,
              marked_by: activeStaff.id
            }
          ]);
        }
      }
    } catch (err) {
      console.warn('Failed to persist student attendance:', err);
    }
  };

  // Delete / Reset individual student attendance record
  const handleDeleteStudentAttendance = async (studentId: string) => {
    if (!currentBatch || !activeStaff?.id) return;

    const existing = attendances.find(
      a => a.student_id === studentId && a.attendance_date === selectedDate && (a.batch_id === currentBatch.id || currentBatchStudents.some(s => s.id === a.student_id))
    );

    if (!existing) return;

    // Optimistically remove from state
    setAttendances(prev => prev.filter(a => !(a.student_id === studentId && a.attendance_date === selectedDate)));

    try {
      if (existing.id && !String(existing.id).startsWith('temp-') && !String(existing.id).startsWith('bulk-')) {
        const delRes = await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
          method: 'DELETE'
        });
        if (!delRes.ok) {
          await supabase.from('student_attendance').delete().eq('id', existing.id);
        }
      } else {
        await fetch(`/supabase-admin/rest/v1/student_attendance?student_id=eq.${studentId}&attendance_date=eq.${selectedDate}&batch_id=eq.${currentBatch.id}`, {
          method: 'DELETE'
        }).catch(async () => {
          await supabase.from('student_attendance')
            .delete()
            .eq('student_id', studentId)
            .eq('attendance_date', selectedDate);
        });
      }
    } catch (err) {
      console.warn('Error deleting student attendance record:', err);
    }
  };

  // Clear / Reset all records for this batch on selectedDate
  const handleClearAllForDate = async () => {
    if (!currentBatch || currentBatchStudents.length === 0 || !activeStaff?.id) return;
    if (!window.confirm(`Are you sure you want to clear and reset all attendance records for ${selectedDate}? All students will revert to Unmarked.`)) {
      return;
    }

    setIsUpdatingAttendance(true);
    // Optimistic removal
    setAttendances(prev => prev.filter(
      a => !(a.attendance_date === selectedDate && (a.batch_id === currentBatch.id || currentBatchStudents.some(s => s.id === a.student_id)))
    ));

    try {
      await fetch(`/supabase-admin/rest/v1/student_attendance?batch_id=eq.${currentBatch.id}&attendance_date=eq.${selectedDate}`, {
        method: 'DELETE'
      }).catch(async () => {
        await supabase.from('student_attendance')
          .delete()
          .eq('batch_id', currentBatch.id)
          .eq('attendance_date', selectedDate);
      });
    } catch (err) {
      console.warn('Error clearing attendance for date:', err);
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Mark all students Present, Late, or Absent
  const handleMarkAllStudents = async (status: 'present' | 'late' | 'absent') => {
    if (!currentBatch || currentBatchStudents.length === 0 || !activeStaff?.id) return;
    setIsUpdatingAttendance(true);

    // Optimistic update
    setAttendances(prev => {
      const otherRecords = prev.filter(
        a => !(a.attendance_date === selectedDate && currentBatchStudents.some(s => s.id === a.student_id))
      );
      const newRecords = currentBatchStudents.map(s => ({
        id: 'bulk-' + s.id + '-' + Date.now(),
        batch_id: currentBatch.id,
        student_id: s.id,
        attendance_date: selectedDate,
        status,
        marked_by: activeStaff.id
      }));
      return [...newRecords, ...otherRecords];
    });

    try {
      for (const s of currentBatchStudents) {
        const existing = attendances.find(a => a.student_id === s.id && a.attendance_date === selectedDate);
        if (existing && !String(existing.id).startsWith('temp-') && !String(existing.id).startsWith('bulk-')) {
          await fetch(`/supabase-admin/rest/v1/student_attendance?id=eq.${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, marked_by: activeStaff.id })
          }).catch(async () => {
            await supabase.from('student_attendance').update({ status, marked_by: activeStaff.id }).eq('id', existing.id);
          });
        } else {
          await fetch('/supabase-admin/rest/v1/student_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([
              {
                batch_id: currentBatch.id,
                student_id: s.id,
                attendance_date: selectedDate,
                status,
                marked_by: activeStaff.id
              }
            ])
          }).catch(async () => {
            await supabase.from('student_attendance').insert([
              {
                batch_id: currentBatch.id,
                student_id: s.id,
                attendance_date: selectedDate,
                status,
                marked_by: activeStaff.id
              }
            ]);
          });
        }
      }
    } catch (err) {
      console.warn('Error in bulk marking attendance:', err);
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Monthly Matrix Calculations for selected batch
  const monthlyStats = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const totalDays = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

    const monthLogs = attendances.filter(
      a => a.attendance_date?.startsWith(selectedMonth) &&
        (a.batch_id === currentBatch?.id || currentBatchStudents.some(s => s.id === a.student_id))
    );

    const studentRows = currentBatchStudents.map(s => {
      const studentLogs = monthLogs.filter(a => a.student_id === s.id);
      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      const dayMap = new Map<number, 'present' | 'late' | 'absent'>();

      studentLogs.forEach(log => {
        const day = parseInt(log.attendance_date.split('-')[2], 10);
        const stRaw = (log.status || '').toLowerCase();
        const st: 'present' | 'late' | 'absent' = stRaw === 'late' ? 'late' : stRaw === 'absent' ? 'absent' : 'present';
        dayMap.set(day, st);
        if (st === 'present') pCount++;
        else if (st === 'late') lCount++;
        else aCount++;
      });

      const totalMarked = pCount + lCount + aCount;
      const attended = pCount + lCount;
      const rate = totalMarked > 0 ? Math.round((attended / totalMarked) * 100) : 0;

      return {
        student: s,
        pCount,
        lCount,
        aCount,
        rate,
        dayMap
      };
    });

    return { totalDays, dayNumbers, studentRows };
  }, [selectedMonth, attendances, currentBatch, currentBatchStudents]);

  // Batch Aggregate Summary & Analytics Computation
  const batchSummaryStats = useMemo(() => {
    if (!currentBatch) {
      return {
        totalClasses: 0,
        turnoutRate: 0,
        regularStudents: 0,
        atRiskStudents: 0,
        studentAggregates: []
      };
    }

    const batchLogs = attendances.filter(
      a => a.batch_id === currentBatch.id || currentBatchStudents.some(s => s.id === a.student_id)
    );

    const uniqueDates = Array.from(new Set(batchLogs.map(a => a.attendance_date))).filter(Boolean).sort();
    const totalClasses = uniqueDates.length;

    let totalStudentSessions = 0;
    let totalPresentCount = 0;
    let regularCount = 0;
    let atRiskCount = 0;

    const studentAggregates = currentBatchStudents.map(student => {
      const sLogs = batchLogs.filter(a => a.student_id === student.id);
      const presentCount = sLogs.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const lateCount = sLogs.filter(a => (a.status || '').toLowerCase() === 'late').length;
      const absentCount = sLogs.filter(a => (a.status || '').toLowerCase() === 'absent').length;
      const attended = presentCount + lateCount;
      const markedSessions = attended + absentCount;

      const baseClasses = Math.max(totalClasses, markedSessions);
      const rate = baseClasses > 0 ? Math.round((attended / baseClasses) * 100) : 100;

      totalStudentSessions += baseClasses;
      totalPresentCount += attended;

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
        presentCount,
        lateCount,
        absentCount,
        baseClasses,
        rate,
        statusLabel
      };
    }).sort((a, b) => b.rate - a.rate);

    const turnoutRate = totalStudentSessions > 0
      ? Math.round((totalPresentCount / totalStudentSessions) * 100)
      : 0;

    return {
      totalClasses,
      turnoutRate,
      regularStudents: regularCount,
      atRiskStudents: atRiskCount,
      studentAggregates
    };
  }, [currentBatch, attendances, currentBatchStudents]);

  // One-Click Official Batch PDF Export
  const handleExportBatchPDF = () => {
    if (!currentBatch) {
      alert('Please select an assigned batch to export.');
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
                  <div class="report-meta">Faculty: ${activeStaff?.full_name || 'Assigned Tutor'} • Mode: ${(currentBatch.mode || 'Offline').toUpperCase()}</div>
                  <div class="report-meta">Report Generated: ${todayIST}</div>
                </td>
              </tr>
            </table>

            <div class="meta-grid">
              <div class="meta-card">
                <div class="meta-label">Total Enrolled</div>
                <div class="meta-value">${currentBatchStudents.length} Students</div>
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
                <span style="font-size: 9px; font-weight: normal; color: #64748b;">${activeStaff?.full_name || 'Faculty'}</span>
              </div>
              <div class="signature-block">
                Academic Dean / Director<br/>
                <span style="font-size: 9px; font-weight: normal; color: #64748b;">Tech Ads Academy Administration</span>
              </div>
            </div>

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
      alert('Error generating PDF report: ' + e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-muted rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
        </div>
        <div className="h-80 bg-muted rounded-2xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Top Faculty Identity & Attendance Punch Strip */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-primary font-black text-xl shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {activeStaff?.full_name || 'Academic Faculty'}
                </h2>
                <Badge variant={isOnlineTutor ? "indigo" : "success"} className="text-[11px] py-0.5 px-2 font-bold flex items-center gap-1">
                  {isOnlineTutor ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      <span>Online Faculty</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3 h-3" />
                      <span>Offline Faculty</span>
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>
                  {isOnlineTutor ? 'Evening/Night Online Shifts • Remote Workstation Geolocation' : 'Daytime Office Schedule • Campus Geo-fenced'}
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="font-mono">{activeStaff?.shift_start_time?.substring(0, 5) || '09:30'} - {activeStaff?.shift_end_time?.substring(0, 5) || '17:00'}</span>
              </p>
            </div>
          </div>

          {/* Tutor's Own Daily Attendance Status */}
          <div className="flex flex-wrap items-center gap-3">
            {todayAttendance?.punch_in ? (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today's Attendance</div>
                  <div className="text-xs font-black">
                    Punched In: {formatDisplayTime(todayAttendance.punch_in)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily Shift Check-in</div>
                  <div className="text-xs font-semibold text-warning">Not Punched In Yet</div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenPunchModal?.('IN')}
                  className="font-bold text-xs !py-2.5 !px-4 shadow-md bg-primary hover:bg-primary/90 flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Punch In Attendance</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <Card variant="glass" className="p-4 border-border hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Assigned Batches</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{totalAssignedBatches}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Under your instruction</div>
        </Card>

        <Card variant="glass" className="p-4 border-border hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{totalEnrolledStudents}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Across your batches</div>
        </Card>

        <Card variant="glass" className="p-4 border-border hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Batches</span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{runningBatchesCount}</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {runningBatchesCount} Active {completedBatchesCount > 0 ? `• ${completedBatchesCount} Completed` : ''}
          </div>
        </Card>

        <Card variant="glass" className="p-4 border-border hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{overallAttendanceRate}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">Average student presence</div>
        </Card>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActivePortalTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activePortalTab === 'attendance'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Student Attendance Register</span>
        </button>
        <button
          onClick={() => setActivePortalTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activePortalTab === 'reports'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <FileText className="w-4 h-4" />
          <span>Batch Reports & PDF Export</span>
        </button>
        <button
          onClick={() => setActivePortalTab('batches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activePortalTab === 'batches'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>My Batches & Student Directory</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-background/20 font-mono">
            {batches.length}
          </span>
        </button>
        <button
          onClick={() => setActivePortalTab('notices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${activePortalTab === 'notices'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Faculty Notice Board</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAILY STUDENT ATTENDANCE REGISTER */}
      {/* ======================================================== */}
      {activePortalTab === 'attendance' && (
        <div className="space-y-6">
          {batches.length === 0 ? (
            <Card variant="glass" className="p-10 border-border text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-warning mx-auto" />
              <h3 className="text-base font-bold text-foreground">No Batches Assigned</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No active or upcoming batches are currently linked to your faculty profile. Please contact the Academy Admin to assign your course batches.
              </p>
            </Card>
          ) : (
            <>
              {/* Batch & Mode Controls Bar */}
              <Card variant="glass" className="p-4 border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                  {/* Batch Selector */}
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Select Assigned Batch
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                    >
                      {batches.map(b => {
                        const isCompleted = (b.status || '').toLowerCase() === 'completed';
                        return (
                          <option key={b.id} value={b.id}>
                            {b.batch_name} ({b.course_name || 'Course'} • {b.mode || b.batch_type || 'Offline'} • {isCompleted ? '🎓 Completed' : '⚡ Active'})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Date or Month Picker */}
                  <div className="md:col-span-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {attendanceViewMode === 'daily' ? 'Attendance Date' : 'Register Month'}
                      </label>
                      {attendanceViewMode === 'daily' && selectedDate !== new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}
                          className="text-[9px] text-primary font-bold hover:underline cursor-pointer"
                        >
                          Jump to Today
                        </button>
                      )}
                    </div>
                    {attendanceViewMode === 'daily' ? (
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                      />
                    ) : (
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-muted-2 border border-border rounded-xl px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                      />
                    )}
                  </div>

                  {/* View Mode Toggle Button */}
                  <div className="md:col-span-3 flex items-center justify-end">
                    <div className="inline-flex rounded-xl bg-muted-2 p-1 border border-border w-full justify-between">
                      <button
                        type="button"
                        onClick={() => setAttendanceViewMode('daily')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${attendanceViewMode === 'daily'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Daily</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceViewMode('monthly')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${attendanceViewMode === 'monthly'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Monthly</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch Context Details Pill */}
                {currentBatch && (
                  <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-foreground">{currentBatch.batch_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{currentBatch.course_name || 'Standard Curriculum'}</span>
                      <Badge variant={(currentBatch.mode || '').toLowerCase() === 'online' ? "indigo" : "success"} className="text-[9px] py-0 px-1.5">
                        {currentBatch.mode || currentBatch.batch_type || 'Offline'}
                      </Badge>
                      <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                        {currentBatch.status || 'Ongoing'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Seats: <span className="font-bold text-foreground">{currentBatchStudents.length}</span> / {currentBatch.total_seats || 30} enrolled
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePortalTab('reports')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* DAILY MARKING VIEW */}
              {attendanceViewMode === 'daily' && (
                <div className="space-y-4">
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
                            Regular academy classes are off on Saturdays and Sundays. Faculty can still mark attendance if weekend or compensatory classes were conducted.
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning" className="text-[10px] font-bold">
                        Weekend Off
                      </Badge>
                    </div>
                  )}

                  {/* Daily Marking Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="p-3 rounded-xl bg-card border border-border">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Enrolled</div>
                      <div className="text-xl font-black text-foreground">{dailyStats.total}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase">Present</div>
                      <div className="text-xl font-black text-emerald-400">{dailyStats.present}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <div className="text-[10px] font-bold text-amber-400 uppercase">Late</div>
                      <div className="text-xl font-black text-amber-400">{dailyStats.late}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <div className="text-[10px] font-bold text-rose-400 uppercase">Absent</div>
                      <div className="text-xl font-black text-rose-400">{dailyStats.absent}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-warning-soft border border-warning/25">
                      <div className="text-[10px] font-bold text-warning uppercase">Unmarked</div>
                      <div className="text-xl font-black text-warning">{dailyStats.unmarked}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase">Turnout</div>
                      <div className="text-xl font-black text-indigo-400">{dailyStats.rate}%</div>
                    </div>
                  </div>

                  {/* Actions Bar & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search student by name, code, phone..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button
                        type="button"
                        disabled={isUpdatingAttendance || currentBatchStudents.length === 0}
                        onClick={() => handleMarkAllStudents('present')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark All Present</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingAttendance || currentBatchStudents.length === 0}
                        onClick={() => handleMarkAllStudents('late')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Mark All Late</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingAttendance || currentBatchStudents.length === 0}
                        onClick={() => handleMarkAllStudents('absent')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Mark All Absent</span>
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingAttendance || (dailyStats.present === 0 && dailyStats.late === 0 && dailyStats.absent === 0)}
                        onClick={handleClearAllForDate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted-2 hover:bg-danger-soft text-muted-foreground hover:text-danger border border-border text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                        title="Clear and reset all attendance markings for this date"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Date</span>
                      </button>
                    </div>
                  </div>

                  {/* Student Register Table */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                    {filteredStudents.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-xs space-y-1">
                        <Users className="w-8 h-8 mx-auto opacity-40 mb-2" />
                        <p className="font-bold">No students found in this batch.</p>
                        <p className="text-[11px] opacity-75">Check other batches or clear search filters.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted-2 text-muted-foreground uppercase text-[10px] font-bold border-b border-border tracking-wider">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Student Details</th>
                              <th className="py-3 px-4 hidden md:table-cell">Contact</th>
                              <th className="py-3 px-4 hidden sm:table-cell">Fee Status</th>
                              <th className="py-3 px-4 text-center">Status ({selectedDate})</th>
                              <th className="py-3 px-4 text-right">Quick Marking & Correction</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredStudents.map((student, idx) => {
                              const currentStatus = dailyAttendanceMap.get(student.id);
                              const isPresent = currentStatus === 'present';
                              const isLate = currentStatus === 'late';
                              const isAbsent = currentStatus === 'absent';
                              const isUnmarked = !currentStatus;

                              return (
                                <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                                  <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                        {(student.name || 'S').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-foreground text-xs">
                                          {student.name || student.student_name}
                                        </div>
                                        <div className="text-[10px] font-mono text-primary font-bold">
                                          {student.student_id_code || student.registration_number || 'ENR-' + student.id.slice(0, 5)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 hidden md:table-cell text-muted-foreground text-[11px]">
                                    <div>{student.phone || '-'}</div>
                                    <div className="text-[10px] text-muted-foreground/75 truncate max-w-[160px]">{student.email || ''}</div>
                                  </td>
                                  <td className="py-3.5 px-4 hidden sm:table-cell">
                                    {Number(student.paid_fee || student.paid_fees || 0) >= Number(student.total_fee || student.total_fees || 1) ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Paid Full
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                        Balance Due
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {isPresent && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        <CheckCircle2 className="w-3 h-3" /> PRESENT
                                      </span>
                                    )}
                                    {isLate && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                        <Clock className="w-3 h-3" /> LATE
                                      </span>
                                    )}
                                    {isAbsent && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                        <XCircle className="w-3 h-3" /> ABSENT
                                      </span>
                                    )}
                                    {isUnmarked && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                                        Unmarked
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStudentAttendance(student.id, 'present')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isPresent
                                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                                          : 'bg-muted-2 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400'
                                          }`}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStudentAttendance(student.id, 'late')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isLate
                                          ? 'bg-amber-500 text-white shadow-xs font-black'
                                          : 'bg-muted-2 text-muted-foreground hover:bg-amber-500/20 hover:text-amber-400'
                                          }`}
                                      >
                                        Late
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStudentAttendance(student.id, 'absent')}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${isAbsent
                                          ? 'bg-rose-600 text-white shadow-xs font-black'
                                          : 'bg-muted-2 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400'
                                          }`}
                                      >
                                        Absent
                                      </button>
                                      {!isUnmarked && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteStudentAttendance(student.id)}
                                          title="Delete / Reset record to Unmarked"
                                          className="p-1.5 rounded-lg bg-muted-2 hover:bg-danger-soft text-muted-foreground hover:text-danger border border-border transition-colors cursor-pointer"
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
                    )}
                  </div>
                </div>
              )}

              {/* MONTHLY REGISTER VIEW */}
              {attendanceViewMode === 'monthly' && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Monthly Attendance Register</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {currentBatch?.batch_name} • Full Attendance Sheet for {selectedMonth}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2.5 text-[11px] font-semibold">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-[8px]">P</span>
                          <span>Present</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <span className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-[8px]">L</span>
                          <span>Late</span>
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <span className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/30 flex items-center justify-center font-bold text-[8px]">A</span>
                          <span>Absent</span>
                        </span>
                        <span className="flex items-center gap-1 text-amber-500/80">
                          <span className="w-4 h-4 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-[8px]">H</span>
                          <span>Weekend</span>
                        </span>
                      </div>
                      <div className="text-xs font-bold text-primary font-mono">
                        {monthlyStats.studentRows.length} Students Logged
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted-2 text-muted-foreground uppercase text-[9px] font-bold sticky top-0 z-10 border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 min-w-[160px] sticky left-0 bg-muted-2 z-20">Student</th>
                          <th className="py-2.5 px-2 text-center">Att %</th>
                          <th className="py-2.5 px-2 text-center text-emerald-400">P</th>
                          <th className="py-2.5 px-2 text-center text-amber-400">L</th>
                          <th className="py-2.5 px-2 text-center text-rose-400">A</th>
                          {monthlyStats.dayNumbers.map(day => {
                            const [yearStr, monthStr] = selectedMonth.split('-');
                            const dObj = new Date(Number(yearStr), Number(monthStr) - 1, day);
                            const dayOfWeek = dObj.getDay();
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const dayLabel = dayOfWeek === 0 ? 'Su' : dayOfWeek === 6 ? 'Sa' : '';

                            return (
                              <th
                                key={day}
                                className={`py-1.5 px-1 text-center min-w-[28px] font-mono ${isWeekend ? 'bg-amber-500/10 text-amber-400 font-extrabold' : ''
                                  }`}
                              >
                                <div>{day}</div>
                                {dayLabel && <div className="text-[7px] opacity-80">{dayLabel}</div>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {monthlyStats.studentRows.map(({ student, pCount, lCount, aCount, rate, dayMap }) => (
                          <tr key={student.id} className="hover:bg-muted/40 transition-colors">
                            <td className="py-2.5 px-3 font-sans font-bold text-foreground sticky left-0 bg-card z-10 border-r border-border truncate max-w-[180px]">
                              {student.name || student.student_name}
                            </td>
                            <td className="py-2 px-2 text-center font-bold">
                              <span className={rate >= 75 ? 'text-emerald-400' : rate >= 50 ? 'text-warning' : 'text-rose-400'}>
                                {rate}%
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-bold text-emerald-400">{pCount}</td>
                            <td className="py-2 px-2 text-center font-bold text-amber-400">{lCount}</td>
                            <td className="py-2 px-2 text-center font-bold text-rose-400">{aCount}</td>
                            {monthlyStats.dayNumbers.map(day => {
                              const st = dayMap.get(day);
                              const [yearStr, monthStr] = selectedMonth.split('-');
                              const dObj = new Date(Number(yearStr), Number(monthStr) - 1, day);
                              const dayOfWeek = dObj.getDay();
                              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                              return (
                                <td
                                  key={day}
                                  className={`py-2 px-1 text-center border-l border-border/40 ${isWeekend ? 'bg-amber-500/5' : ''
                                    }`}
                                >
                                  {st === 'present' ? (
                                    <span className="w-5 h-5 rounded-md inline-flex items-center justify-center font-bold text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      P
                                    </span>
                                  ) : st === 'late' ? (
                                    <span className="w-5 h-5 rounded-md inline-flex items-center justify-center font-bold text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      L
                                    </span>
                                  ) : st === 'absent' ? (
                                    <span className="w-5 h-5 rounded-md inline-flex items-center justify-center font-bold text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      A
                                    </span>
                                  ) : isWeekend ? (
                                    <span
                                      className="w-5 h-5 rounded-md inline-flex items-center justify-center font-bold text-[8px] bg-amber-500/10 text-amber-500/70 border border-amber-500/20"
                                      title="Weekend Off"
                                    >
                                      H
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/30">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BATCH REPORTS & ONE-CLICK PDF EXPORT */}
      {/* ======================================================== */}
      {activePortalTab === 'reports' && (
        <div className="space-y-6">
          {batches.length === 0 ? (
            <Card variant="glass" className="p-8 border-border text-center">
              <p className="text-muted-foreground text-sm">No batches currently assigned.</p>
            </Card>
          ) : (
            <>
              {/* Batch Selector & Export Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Batch Attendance Analytics & Official Reporting</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Comprehensive performance breakdown and one-click PDF export for academic archives.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="bg-muted-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {batches.map(b => {
                      const isCompleted = (b.status || '').toLowerCase() === 'completed';
                      return (
                        <option key={b.id} value={b.id}>
                          {b.batch_name} {isCompleted ? '🎓 (Completed)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExportBatchPDF}
                    className="font-bold text-xs !py-2 !px-4 shadow-md flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Export PDF</span>
                  </Button>
                </div>
              </div>

              {/* Summary KPIs Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Classes Conducted</div>
                  <div className="text-2xl font-black text-foreground">{batchSummaryStats.totalClasses}</div>
                  <div className="text-[10px] text-muted-foreground">Recorded class sessions</div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Average Turnout Rate</div>
                  <div className="text-2xl font-black text-indigo-400">{batchSummaryStats.turnoutRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Across total student sessions</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Regular Students</div>
                  <div className="text-2xl font-black text-emerald-400">{batchSummaryStats.regularStudents}</div>
                  <div className="text-[10px] text-emerald-400/80">≥ 75% attendance benchmark</div>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                  <div className="text-[10px] font-bold text-rose-400 uppercase">Students At-Risk</div>
                  <div className="text-2xl font-black text-rose-400">{batchSummaryStats.atRiskStudents}</div>
                  <div className="text-[10px] text-rose-400/80">&lt; 75% critical turnout</div>
                </div>
              </div>

              {/* Student Summary Table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-warning" />
                    <h4 className="font-bold text-foreground text-sm">Student Attendance Roster ({currentBatch?.batch_name})</h4>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {batchSummaryStats.studentAggregates.length} Students Registered
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted-2 text-muted-foreground uppercase text-[10px] font-bold border-b border-border tracking-wider">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Student Details</th>
                        <th className="py-3 px-4 hidden sm:table-cell">Contact</th>
                        <th className="py-3 px-4 text-center">Total Sessions</th>
                        <th className="py-3 px-4 text-center">Present</th>
                        <th className="py-3 px-4 text-center">Absent</th>
                        <th className="py-3 px-4 text-center">Turnout %</th>
                        <th className="py-3 px-4 text-center">Standing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {batchSummaryStats.studentAggregates.map((item, idx) => (
                        <tr key={item.student.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-xs">{item.student.name}</div>
                            <div className="text-[10px] font-mono text-primary font-bold">
                              {item.student.student_id_code || item.student.registration_number || 'ENR'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 hidden sm:table-cell text-muted-foreground text-[11px]">
                            {item.student.phone || item.student.email || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-foreground font-mono">
                            {item.baseClasses}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-400 font-mono">
                            {item.presentCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-rose-400 font-mono">
                            {item.absentCount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black border ${item.rate >= 85
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : item.rate >= 75
                                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                                : item.rate >= 60
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              }`}>
                              {item.rate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[11px] font-extrabold ${item.rate >= 75 ? 'text-emerald-400' : item.rate >= 60 ? 'text-warning' : 'text-rose-400'
                              }`}>
                              {item.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MY BATCHES & STUDENT DIRECTORY */}
      {/* ======================================================== */}
      {activePortalTab === 'batches' && (
        <div className="space-y-6">
          {batches.length === 0 ? (
            <Card variant="glass" className="p-8 border-border text-center">
              <p className="text-muted-foreground text-sm">No batches currently assigned.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {batches.map(batch => {
                const bStudents = studentsByBatch.get(batch.id) || [];
                const capacity = Number(batch.total_seats) || 30;
                const enrolled = bStudents.length;
                const occupancy = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
                const isExpanded = expandedBatchId === batch.id;

                return (
                  <Card key={batch.id} variant="glass" className="p-5 border-border hover:border-primary/40 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-foreground">{batch.batch_name}</h4>
                          <Badge variant={(batch.mode || '').toLowerCase() === 'online' ? "indigo" : "success"} className="text-[10px] py-0 px-2 font-bold">
                            {batch.mode || batch.batch_type || 'Offline'}
                          </Badge>
                          <Badge variant="warning" className="text-[10px] py-0 px-2 font-bold">
                            {batch.status || 'Ongoing'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{batch.course_name || 'Curriculum Course'}</span>
                          <span>•</span>
                          <span className="font-mono">{batch.batch_code || 'CODE-' + batch.id.slice(0, 4).toUpperCase()}</span>
                          {batch.start_date && (
                            <>
                              <span>•</span>
                              <span>Started: {new Date(batch.start_date).toLocaleDateString()}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedBatchId(batch.id);
                            setActivePortalTab('reports');
                          }}
                          className="font-bold text-xs !py-1.5 !px-3 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span>Report</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedBatchId(batch.id);
                            setActivePortalTab('attendance');
                          }}
                          className="font-bold text-xs !py-1.5 !px-3 shadow-xs"
                        >
                          Take Attendance
                        </Button>
                        <button
                          type="button"
                          onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                          className="p-2 rounded-xl bg-muted-2 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse Student List' : 'Expand Student List'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Capacity & Occupancy Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Batch Enrollment Capacity</span>
                        <span className="font-bold text-foreground">
                          {enrolled} / {capacity} Seats ({occupancy}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, occupancy)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Expandable Student Roster */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border animate-fade-in space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                            Enrolled Student Directory ({bStudents.length})
                          </span>
                        </div>

                        {bStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-3 text-center">No students currently enrolled in this batch.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {bStudents.map(student => (
                              <div key={student.id} className="p-3 rounded-xl bg-muted-2 border border-border flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                    {(student.name || 'S').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-bold text-foreground text-xs truncate">{student.name}</h5>
                                    <p className="text-[10px] text-muted-foreground truncate">{student.phone || student.email || 'No contact'}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                                  {student.student_id_code || student.registration_number || 'ENR'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: FACULTY NOTICE BOARD */}
      {/* ======================================================== */}
      {activePortalTab === 'notices' && (
        <div className="space-y-4">
          <TutorNoticeBoard />
        </div>
      )}
    </div>
  );
};