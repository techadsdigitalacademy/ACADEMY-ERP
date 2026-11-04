import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase, STAFF_PROFILE_COLUMNS } from '../services/supabase';
import { dataCache } from '../services/dataCache';
import { enrichAttendanceRecords, fetchStaffAttendanceRecords, getStoredPunchLocal, normalize24HourTime, formatDisplayTime, evaluatePunchStatus, calculateWorkingHours } from '../utils/attendanceStorage';
import { deduplicateStaffProfiles, getLinkedStaffIds } from '../utils/staffAliases';
import { fetchCompanyHolidays } from '../utils/holidayStorage';
import type { CompanyHoliday } from '../utils/holidayStorage';
import { HolidayManagementModal } from '../components/HolidayManagementModal';
import { MetricCardsSkeleton, TableSkeleton } from '../components/Skeleton';
import type { Staff, Attendance } from '../types';
import {
  AlertCircle,
  Search,
  Filter,
  Award,
  X,
  TrendingUp,
  Briefcase,
  UserCheck,
  Calendar,
  Download,
  FileText,
  Star,
} from 'lucide-react';

interface StaffWithAttendance extends Staff {
  todayRecord?: Attendance;
  linked_ids?: string[];
}

export const AdminAttendance: React.FC = () => {
  const { activeStaff, setActiveTab, isAdminMode, isLoading } = useApp();

  if (!activeStaff) return null;

  // Wait for the session to resolve before enforcing the permission
  // redirect - isAdminMode is false while loading, which would otherwise
  // bounce a deep link away from this page on first paint.
  useEffect(() => {
    if (isLoading) return;
    const isOwnerUser = activeStaff?.designation?.toLowerCase().includes('owner') || false;
    if (!isAdminMode && !isOwnerUser) {
      setActiveTab('sales');
    }
  }, [isAdminMode, isLoading, activeStaff]);

  // Component local states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffWithAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late' | 'Half Day' | 'Leave' | 'Absent' | 'Holiday'>('All');
  const [selectedRegistryDate, setSelectedRegistryDate] = useState<string>(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [adminTab, setAdminTab] = useState<'registry' | 'reports'>('registry');
  const [masterStaffList, setMasterStaffList] = useState<any[]>([]);
  const [enlargedSelfie, setEnlargedSelfie] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);

  const handleExportStaffAttendanceExcel = (staff: any, month: string, logs: any[], present: number, late: number, halfDay: number, leave: number, holiday: number, attPct: number) => {
    try {
      const csvRows = [];
      csvRows.push([`Tech Ads ERP - Staff Attendance Report`]);
      csvRows.push([`Staff Name: ${staff?.full_name || 'Staff'}`, `Designation: ${staff?.designation || 'Staff'}`, `Month: ${month}`]);
      csvRows.push([`Present: ${present}`, `Late: ${late}`, `Half Day: ${halfDay}`, `Leave: ${leave}`, `Holiday: ${holiday}`, `Attendance %: ${attPct}%`]);
      csvRows.push([]);
      csvRows.push(['Date', 'Clock In', 'Clock Out', 'Working Hours', 'Status', 'Selfie Verified']);

      (logs || []).slice().reverse().forEach((log: any) => {
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
      link.setAttribute('download', `Attendance_Report_${(staff?.full_name || 'Staff').replace(/\s+/g, '_')}_${month}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Error exporting attendance: ' + e);
    }
  };

  const handleExportStaffAttendancePDF = (staff: any, month: string, logs: any[], present: number, late: number, halfDay: number, leave: number, holiday: number, attPct: number) => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const rowsHtml = (logs || []).slice().reverse().map((log: any) => {
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
            <title>Attendance Report - ${staff?.full_name}</title>
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
            <p>Staff: <strong>${staff?.full_name || 'Staff'}</strong> &bull; Designation: <strong>${staff?.designation || 'Staff'}</strong> &bull; Month: <strong>${month}</strong></p>
            
            <div class="metrics">
              <div class="metric-item">
                <div class="metric-label">Present</div>
                <div class="metric-val" style="color: #059669;">${present}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Late</div>
                <div class="metric-val" style="color: #4f46e5;">${late}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Half Day</div>
                <div class="metric-val" style="color: #6366f1;">${halfDay}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Leave</div>
                <div class="metric-val" style="color: #9333ea;">${leave}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Holiday</div>
                <div class="metric-val" style="color: #a855f7;">${holiday}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Attendance %</div>
                <div class="metric-val">${attPct}%</div>
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

  // Custom Reports states
  const [reportFromDate, setReportFromDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE'));
  const [reportToDate, setReportToDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Drilldown states
  const [selectedStaffForDrill, setSelectedStaffForDrill] = useState<any | null>(null);
  const [drillMonth, setDrillMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [drillLogs, setDrillLogs] = useState<any[]>([]);
  const [loadingDrill, setLoadingDrill] = useState(false);

  // The drill-down only ever reads the days of `drillMonth`, so fetch that month
  // rather than the staff member's entire attendance history. The month is part of
  // the cache key, and every month stays reachable through the picker.
  const fetchDrillLogs = async (staffId: string, month: string, forceRefresh = false) => {
    setLoadingDrill(true);
    try {
      const cacheKey = `attendance_drill_${staffId}_${month}`;
      const [dYear, dMonth] = month.split('-').map(Number);
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${String(new Date(dYear, dMonth, 0).getDate()).padStart(2, '0')}`;

      // Resolve linked alias IDs
      const targetStaff = staffList.find(s => s.id === staffId) || selectedStaffForDrill;
      const linkedIds = targetStaff?.linked_ids || getLinkedStaffIds(staffId, masterStaffList);
      const idsToQuery = Array.from(new Set([staffId, ...linkedIds].filter(Boolean)));

      const logs = await dataCache.fetchWithCache(
        cacheKey,
        async () => {
          const data = await fetchStaffAttendanceRecords({
            staffIds: idsToQuery,
            startDate: monthStart,
            endDate: monthEnd
          });
          const aliasMap = new Map<string, string[]>();
          aliasMap.set(staffId, idsToQuery);
          const enriched = await enrichAttendanceRecords(data || [], aliasMap);
          return enriched.map((d: any) => ({
            ...d,
            status: (d.status || 'present').toUpperCase(),
            punch_in: d.punch_in || (d.created_at ? new Date(d.created_at).toLocaleTimeString('en-US', { hour12: false }) : '09:00:00')
          }));
        },
        { ttlMs: 60000, forceRefresh }
      );
      setDrillLogs(logs);
    } catch (err: any) {
      console.error("Error loading drill logs:", err);
    } finally {
      setLoadingDrill(false);
    }
  };

  const handleOpenDrillModal = (staff: any) => {
    setSelectedStaffForDrill(staff);
    setDrillMonth(new Date().toISOString().slice(0, 7));
  };

  useEffect(() => {
    if (selectedStaffForDrill?.id && drillMonth) {
      fetchDrillLogs(selectedStaffForDrill.id, drillMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffForDrill?.id, drillMonth]);

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      let rangeAttData: any[] = [];
      try {
        const data = await fetchStaffAttendanceRecords({
          startDate: reportFromDate,
          endDate: reportToDate
        });

        if (data && data.length > 0) {
          const enriched = await enrichAttendanceRecords(data);
          rangeAttData = enriched.map((d: any) => ({
            ...d,
            status: (d.status || 'present').toUpperCase(),
            punch_in: d.punch_in || (d.created_at ? new Date(d.created_at).toLocaleTimeString('en-US', { hour12: false }) : '09:00:00')
          }));
        }
      } catch (err: any) {
        console.warn("Could not query staff_attendance for report:", err);
      }

      const logs = rangeAttData || [];
      const targetStaffs = (masterStaffList.length > 0 ? masterStaffList : staffList).filter(s => s && s.full_name && !s.full_name.toLowerCase().includes('althaf'));

      const aggregated = targetStaffs.map(staff => {
        const staffLinkedIds = staff.linked_ids || [staff.id];
        const staffLogs = logs.filter(l => staffLinkedIds.includes(l.staff_id) || l.staff_id === staff.id);

        let present = 0;
        let late = 0;
        let halfDay = 0;
        let leave = 0;

        staffLogs.forEach(l => {
          if (l.status === 'PRESENT') present++;
          else if (l.status === 'LATE') late++;
          else if (l.status === 'HALF_DAY') halfDay++;
          else if (l.status === 'LEAVE') leave++;
        });

        return {
          id: staff.id,
          full_name: staff.full_name,
          designation: staff.designation || staff.role_name || 'Senior Sales Consultant',
          department: staff.department_name,
          present,
          late,
          halfDay,
          leave
        };
      });

      setReportData(aggregated);
    } catch (err: any) {
      alert("Failed to generate report: " + err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleExportCustomReportExcel = () => {
    if (reportData.length === 0) return;
    try {
      const csvRows: any[][] = [];
      csvRows.push([`Tech Ads ERP - Custom Date Range Attendance Report`]);
      csvRows.push([`Report Period: ${reportFromDate} to ${reportToDate}`, `Total Employees: ${reportData.length}`]);
      csvRows.push([]);
      csvRows.push(['Staff Name', 'Designation', 'Present Days', 'Late Days', 'Half Days', 'Leave Days']);

      reportData.forEach(row => {
        csvRows.push([
          row.full_name,
          row.designation,
          row.present,
          row.late,
          row.halfDay,
          row.leave
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Attendance_Custom_Report_${reportFromDate}_to_${reportToDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Error exporting Custom Report Excel: ' + e.message);
    }
  };

  const handleExportCustomReportPDF = () => {
    if (reportData.length === 0) return;
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const rowsHtml = reportData.map(row => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; font-weight: bold;">${row.full_name}</td>
          <td style="padding: 8px; color: #475569;">${row.designation}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #059669;">${row.present}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #d97706;">${row.late}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #6366f1;">${row.halfDay}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #2563eb;">${row.leave}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Custom Attendance Report (${reportFromDate} to ${reportToDate})</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
              th.center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Custom Date Range Attendance Report</h1>
            <p>Report Period: <strong>${reportFromDate}</strong> to <strong>${reportToDate}</strong> &bull; Total Staff: <strong>${reportData.length}</strong></p>

            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Designation</th>
                  <th class="center">Present Days</th>
                  <th class="center">Late Days</th>
                  <th class="center">Half Days</th>
                  <th class="center">Leave Days</th>
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
      alert('Error exporting Custom Report PDF: ' + e.message);
    }
  };

  const handleExportDailyRegistryExcel = () => {
    try {
      const todayDisplayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const csvRows: any[][] = [];
      csvRows.push([`Tech Ads ERP - Daily Staff Attendance Registry`]);
      csvRows.push([`Registry Date: ${todayDisplayDate}`, `Total Staff: ${filteredStaff.length}`]);
      csvRows.push([]);
      csvRows.push(['Staff Name', 'Staff Code', 'Designation', 'Department', 'Punch In', 'Punch Out', 'Working Hours', 'Status', 'GPS Verified', 'Selfie Verified']);

      filteredStaff.forEach(staff => {
        const rawIn = staff.todayRecord?.punch_in;
        const rawOut = staff.todayRecord?.punch_out;
        const status = getEvaluatedTodayStatus(staff).toUpperCase();
        const hasGps = (staff.todayRecord?.lat && staff.todayRecord?.lng) ? 'Yes' : 'No';
        const hasSelfie = staff.todayRecord?.selfie_url ? 'Yes' : 'No';

        csvRows.push([
          staff.full_name,
          staff.staff_code,
          staff.designation || staff.role_name || 'Staff',
          staff.department_name || 'Sales & Growth',
          formatDisplayTime(rawIn),
          formatDisplayTime(rawOut),
          staff.todayRecord?.working_hours || '-',
          status,
          hasGps,
          hasSelfie
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Attendance_Registry_${todayStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Error exporting Daily Registry Excel: ' + e.message);
    }
  };

  const handleExportDailyRegistryPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const todayDisplayDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const rowsHtml = filteredStaff.map(staff => {
        const rawIn = staff.todayRecord?.punch_in;
        const rawOut = staff.todayRecord?.punch_out;
        const status = getEvaluatedTodayStatus(staff).toUpperCase();
        const hasSelfie = staff.todayRecord?.selfie_url ? 'Yes' : 'No';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-weight: bold;">${staff.full_name} <span style="font-size: 10px; color: #64748b;">(${staff.staff_code})</span></td>
            <td style="padding: 8px; color: #475569;">${staff.designation || staff.role_name || 'Staff'}</td>
            <td style="padding: 8px; font-weight: bold;">${formatDisplayTime(rawIn)}</td>
            <td style="padding: 8px;">${formatDisplayTime(rawOut)}</td>
            <td style="padding: 8px; text-align: center; font-weight: bold; color: ${status === 'PRESENT' ? '#059669' : status === 'LATE' ? '#d97706' : status === 'HALF DAY' ? '#6366f1' : '#e11d48'};">${status}</td>
            <td style="padding: 8px; text-align: center;">${hasSelfie}</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Daily Staff Attendance Registry - ${todayDisplayDate}</title>
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
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Daily Staff Attendance Registry</h1>
            <p>Registry Date: <strong>${todayDisplayDate}</strong> &bull; Total Filtered Staff: <strong>${filteredStaff.length}</strong></p>
            
            <div class="metrics">
              <div class="metric-item"><div class="metric-label">Total Staff</div><div class="metric-val">${totalStaffCount}</div></div>
              <div class="metric-item"><div class="metric-label">Present</div><div class="metric-val" style="color: #059669;">${presentCount}</div></div>
              <div class="metric-item"><div class="metric-label">Late</div><div class="metric-val" style="color: #d97706;">${lateCount}</div></div>
              <div class="metric-item"><div class="metric-label">Half Day</div><div class="metric-val" style="color: #6366f1;">${halfDayCount}</div></div>
              <div class="metric-item"><div class="metric-label">On Leave</div><div class="metric-val" style="color: #2563eb;">${leaveCount}</div></div>
              <div class="metric-item"><div class="metric-label">In Office</div><div class="metric-val" style="color: #4f46e5;">${inOfficeCount}</div></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Designation</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th class="center">Status</th>
                  <th class="center">Selfie Verified</th>
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
      alert('Error exporting Daily Registry PDF: ' + e.message);
    }
  };

  // Fetch all staff and today's attendance records in parallel with caching
  const loadAttendanceData = async (forceRefresh = false) => {
    // Only show full loading state if we have no staff data cached yet
    if (staffList.length === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      const todayStr = selectedRegistryDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const [rYear, rMonth] = todayStr.split('-').map(Number);
      const startOfMonthStr = `${rYear}-${String(rMonth).padStart(2, '0')}-01`;

      // Parallelize Supabase requests
      const cacheKey = `admin_attendance_month_${startOfMonthStr}`;
      const { staffData, profilesData, attData } = await dataCache.fetchWithCache(
        cacheKey,
        async () => {
          const [staffRes, profilesRes, attResData] = await Promise.all([
            supabase.from('staff').select('*, departments(name), roles(role_name)'),
            supabase.from('staff_profiles').select(STAFF_PROFILE_COLUMNS),
            fetchStaffAttendanceRecords({ startDate: startOfMonthStr })
          ]);

          return {
            staffData: staffRes.data || [],
            profilesData: profilesRes.data || [],
            attData: attResData || []
          };
        },
        { ttlMs: 45000, forceRefresh }
      );

      const staffByCleanName = new Map<string, any>();
      (staffData || []).forEach((s: any) => {
        if (s.full_name) {
          staffByCleanName.set(s.full_name.trim().toLowerCase(), s);
        }
      });

      // Helper to identify Company Owners
      const isOwnerProfile = (p: any) => {
        if (!p || !p.full_name) return true;
        const cleanName = String(p.full_name || '').trim().toLowerCase();
        const desig = String(p.designation || '').toLowerCase().trim();
        const rName = String(p.role_name || p.role || '').toLowerCase().trim();

        if (cleanName.includes('althaf') || cleanName.includes('shibili') || cleanName.includes('ashif')) return true;
        if (desig.includes('owner') || rName.includes('owner') || desig.includes('managing director') || rName.includes('managing director')) return true;

        return false;
      };

      // Filter active profiles matching Staff Management directory (excludes Company Owners)
      const rawActiveProfiles = (profilesData || []).filter((p: any) => {
        if (!p || !p.full_name) return false;
        if (p.status === 'INACTIVE' || p.status === 'RESIGNED') return false;
        if (isOwnerProfile(p)) return false;

        const desig = String(p.designation || '').toLowerCase().trim();
        const rName = String(p.role_name || p.role || '').toLowerCase().trim();

        const isAdminDir = (desig.includes('admin') || desig.includes('director') || rName.includes('admin') || rName.includes('director')) &&
          desig !== 'managing director';

        if (isAdminDir) return false;

        return true;
      });

      // Deduplicate active profiles to avoid duplicate rows for the same person
      const activeProfiles = deduplicateStaffProfiles(rawActiveProfiles);

      // Master staff list for reports
      const rawMasterProfiles = (profilesData || []).filter((p: any) => {
        if (!p || !p.full_name) return false;
        if (isOwnerProfile(p)) return false;

        const desig = String(p.designation || '').toLowerCase().trim();
        const rName = String(p.role_name || p.role || '').toLowerCase().trim();

        const isAdminDir = (desig.includes('admin') || desig.includes('director') || rName.includes('admin') || rName.includes('director')) &&
          desig !== 'managing director';

        if (isAdminDir) return false;

        return true;
      });

      const validMasterProfiles = deduplicateStaffProfiles(rawMasterProfiles);

      // Build alias map
      const aliasMap = new Map<string, string[]>();
      activeProfiles.forEach(p => {
        aliasMap.set(p.id, p.linked_ids);
      });

      // Enrich attendance records with alias consolidation, selfies, in/out times
      let attRecords: any[] = [];
      if (attData && attData.length > 0) {
        const enriched = await enrichAttendanceRecords(attData, aliasMap);
        attRecords = enriched.map((a: any) => ({
          ...a,
          status: (a.status || 'present').toUpperCase(),
          punch_in: a.punch_in || (a.created_at ? new Date(a.created_at).toLocaleTimeString('en-US', { hour12: false }) : '09:00:00')
        }));
      }

      setMasterStaffList(validMasterProfiles.map((p: any) => {
        const sMatch = staffByCleanName.get(p.full_name.trim().toLowerCase());
        return {
          id: p.id || sMatch?.id,
          linked_ids: p.linked_ids,
          full_name: p.full_name,
          designation: p.designation || 'Staff',
          department_name: sMatch?.departments?.name || 'Academy Counseling',
          status: p.status || 'ACTIVE'
        };
      }));

      // Map attendance records onto active staff profiles list
      const mappedList: StaffWithAttendance[] = activeProfiles.map((p: any) => {
        const sMatch = staffByCleanName.get(p.full_name.trim().toLowerCase());
        const staffId = p.id || sMatch?.id;
        const linked = p.linked_ids || [staffId];

        const todayRecord = (attRecords || []).find((a: any) =>
          (linked.includes(a.staff_id) || a.staff_id === staffId || a.staff_id === p.id) && a.attendance_date === todayStr
        );

        let resolvedTodayRecord = todayRecord;
        if (!resolvedTodayRecord && todayStr === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })) {
          const local = getStoredPunchLocal(staffId, todayStr, linked);
          if (local && (local.punch_in || local.selfie_url)) {
            resolvedTodayRecord = {
              id: `local-${todayStr}`,
              staff_id: staffId,
              attendance_date: todayStr,
              punch_in: local.punch_in || '-',
              punch_out: local.punch_out || '-',
              status: ((local.status || 'PRESENT') as any).toUpperCase(),
              selfie_url: local.selfie_url || null,
              working_hours: local.working_hours || '-'
            };
          }
        }

        return {
          id: staffId,
          linked_ids: linked,
          staff_code: sMatch?.staff_code || `EMP-${p.id.slice(0, 4).toUpperCase()}`,
          full_name: p.full_name,
          department_id: sMatch?.department_id,
          role_id: sMatch?.role_id,
          avatar_url: p.avatar_url || sMatch?.avatar_url,
          monthly_target_amount: Number(sMatch?.monthly_target_amount || 0),
          notice_period_days: sMatch?.notice_period_days || 30,
          status: (p.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          department_name: sMatch?.departments?.name || 'Academy Counseling',
          role_name: p.designation || 'Staff',
          designation: p.designation || 'Staff',
          shift_start_time: p.shift_start_time || '09:30:00',
          shift_end_time: p.shift_end_time || '18:00:00',
          weekly_off_day: p.weekly_off_day || 'Sunday',
          todayRecord: (resolvedTodayRecord || todayRecord) as Attendance | undefined
        };
      });

      setStaffList(mappedList);
    } catch (err: any) {
      console.error('Error loading attendance logs:', err);
      setError(err.message || 'Failed to load daily attendance registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData(true);
    fetchCompanyHolidays().then(setHolidays);

    const handleStaffChanged = () => {
      loadAttendanceData(true);
    };
    const handleAttendanceChanged = () => {
      loadAttendanceData(true);
    };
    const handleHolidaysChanged = () => {
      fetchCompanyHolidays().then(setHolidays);
      loadAttendanceData(true);
    };

    window.addEventListener('staff_profiles_changed', handleStaffChanged);
    window.addEventListener('attendance_data_changed', handleAttendanceChanged);
    window.addEventListener('company_holidays_changed', handleHolidaysChanged);

    return () => {
      window.removeEventListener('staff_profiles_changed', handleStaffChanged);
      window.removeEventListener('attendance_data_changed', handleAttendanceChanged);
      window.removeEventListener('company_holidays_changed', handleHolidaysChanged);
    };
  }, [selectedRegistryDate]);

  // Compute metrics for today (excluding owners)
  const todayStr = selectedRegistryDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const totalStaffCount = staffList.length;

  // Helper to determine accurate evaluated status of a staff member
  const getEvaluatedTodayStatus = (s: StaffWithAttendance): 'Present' | 'Late' | 'Half Day' | 'Leave' | 'Absent' | 'Holiday' => {
    const isOfficeHoliday = holidays.some(h => h.holiday_date === todayStr);
    const userWeeklyOff = s.weekly_off_day || 'Sunday';
    const dayName = new Date(`${todayStr}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    const isWeeklyOff = dayName.toLowerCase() === userWeeklyOff.toLowerCase();

    if (!s.todayRecord) {
      if (isOfficeHoliday || isWeeklyOff) return 'Holiday';
      return 'Absent';
    }
    const recStatus = (s.todayRecord.status || 'PRESENT').toUpperCase();
    const in24 = normalize24HourTime(s.todayRecord.punch_in);
    const out24 = normalize24HourTime(s.todayRecord.punch_out);
    const shiftStart = s.shift_start_time || '09:30:00';
    const shiftEnd = s.shift_end_time || '18:00:00';

    if (in24) {
      const evalStatus = evaluatePunchStatus(in24, shiftStart, out24, shiftEnd, recStatus);
      if (evalStatus === 'HALF_DAY') return 'Half Day';
      if (evalStatus === 'LATE') return 'Late';
      if (evalStatus === 'PRESENT') return 'Present';
      if (evalStatus === 'LEAVE') return 'Leave';
      return 'Present';
    }

    if (recStatus === 'LEAVE') return 'Leave';
    if (recStatus === 'ABSENT') {
      if (isOfficeHoliday || isWeeklyOff) return 'Holiday';
      return 'Absent';
    }
    if (isOfficeHoliday || isWeeklyOff) return 'Holiday';
    return 'Absent';
  };

  // Present: strictly present on time (excluding Late and Half Day)
  const presentCount = staffList.filter(s => getEvaluatedTodayStatus(s) === 'Present').length;

  // Late: marked as Late
  const lateCount = staffList.filter(s => getEvaluatedTodayStatus(s) === 'Late').length;

  // Half Day: marked as Half Day
  const halfDayCount = staffList.filter(s => getEvaluatedTodayStatus(s) === 'Half Day').length;

  // On Leave / Absent: staff who haven't punched in yet or are on leave/absent (excluding holidays)
  const leaveCount = staffList.filter(s => {
    const st = getEvaluatedTodayStatus(s);
    return st === 'Leave' || st === 'Absent';
  }).length;

  // Holiday: staff on declared office holiday or weekly off
  const todayHolidayCount = staffList.filter(s => getEvaluatedTodayStatus(s) === 'Holiday').length;

  // Missed Out: staff who missed punch-in or punch-out logs today
  const missedOutCount = staffList.filter(s => {
    if (!s.todayRecord) return false;
    const { punch_in, punch_out } = s.todayRecord;
    const hasIn = punch_in && punch_in !== '-';
    const hasOut = punch_out && punch_out !== '-';
    return (hasIn && !hasOut) || (!hasIn && hasOut);
  }).length;

  // In Office: total count of everyone inside the office today (Present + Late + Half Day combined who punched in)
  const inOfficeCount = staffList.filter(s => {
    if (!s.todayRecord) return false;
    const hasIn = s.todayRecord.punch_in && s.todayRecord.punch_in !== '-';
    const st = getEvaluatedTodayStatus(s);
    return !!hasIn && (st === 'Present' || st === 'Late' || st === 'Half Day');
  }).length;

  // Filter & search staff list
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.department_name && staff.department_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const currentStatus = getEvaluatedTodayStatus(staff);
    const matchesFilter = statusFilter === 'All' ? true : currentStatus === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-card text-foreground font-sans flex flex-col lg:flex-row relative w-full max-w-full overflow-x-hidden">


      {/* Left Sidebar Navigation (Desktop only) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-32 md:pb-12">

        {/* Header Profile Section */}
        <header className="bg-card border border-border sticky top-14 lg:top-0 z-30 px-4 md:px-8 py-3.5 border-b border-border">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar (Mobile only) */}
              <div className="relative group cursor-pointer md:hidden">
                <img
                  src={activeStaff.avatar_url}
                  alt={activeStaff.full_name}
                  className="relative w-10 h-10 rounded-full border-2 border-primary object-cover"
                />
              </div>

              <div>
                <h1 className="text-base md:text-xl font-bold text-foreground tracking-wide flex items-center gap-2">
                  <span className="md:hidden">Attendance Logs</span>
                  <span className="hidden md:inline-flex items-center gap-2">
                    Admin Attendance Dashboard
                    <Badge variant="success" className="text-[10px] py-0.5">Real-time DB</Badge>
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground font-medium hidden md:block">Monitor staff punch-in times, geographic location stamps, and daily status logs.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                className="!py-2 !px-3 font-bold text-xs"
                onClick={() => loadAttendanceData(true)}
                isLoading={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Panels */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">

          {loading && staffList.length === 0 ? (
            <div className="space-y-6 animate-fade-in">
              <MetricCardsSkeleton count={7} cols="grid-cols-2 md:grid-cols-4 lg:grid-cols-7" />
              <TableSkeleton rows={8} columns={6} />
            </div>
          ) : error && staffList.length === 0 ? (
            <div className="py-16 text-center bg-card border border-border rounded-lg p-8 border border-danger/20 max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-foreground mb-2">Failed to Sync Records</h3>
              <p className="text-sm text-muted-foreground mb-6">{error}</p>
              <Button variant="primary" onClick={() => loadAttendanceData(true)}>Retry Reload</Button>
            </div>
          ) : (
            <>
              {/* Summary Stats Grid (Total Staff, Present, Late, Half Day, On Leave / Absent, Missed Out, In Office, Holiday) */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {/* Total Staff */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-border min-h-[80px]">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Staff</span>
                  <p className="text-xl font-extrabold text-foreground mt-1">{totalStaffCount}</p>
                </Card>

                {/* Present */}
                <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-success/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-success uppercase tracking-wider">Present</span>
                  <p className="text-xl font-extrabold text-success mt-1">{presentCount}</p>
                </Card>

                {/* Late */}
                <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-warning/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-warning uppercase tracking-wider">Late</span>
                  <p className="text-xl font-extrabold text-warning mt-1">{lateCount}</p>
                </Card>

                {/* Half Day */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-primary/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Half Day</span>
                  <p className="text-xl font-extrabold text-primary mt-1">{halfDayCount}</p>
                </Card>

                {/* On Leave / Absent */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-border min-h-[80px]">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">On Leave / Absent</span>
                  <p className="text-xl font-extrabold text-primary mt-1">{leaveCount}</p>
                </Card>

                {/* Holiday */}
                <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-primary/20 min-h-[80px]">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Holiday</span>
                  <p className="text-xl font-extrabold text-primary mt-1">{todayHolidayCount}</p>
                </Card>

                {/* Missed Out */}
                <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-danger/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-danger uppercase tracking-wider">Missed Out</span>
                  <p className="text-xl font-extrabold text-danger mt-1">{missedOutCount}</p>
                </Card>

                {/* In Office */}
                <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-primary/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">In Office</span>
                  <p className="text-xl font-extrabold text-primary mt-1">{inOfficeCount}</p>
                </Card>
              </div>

              {/* Tab navigation */}
              <div className="flex gap-4 border-b border-border pb-1 mt-4">
                <button
                  onClick={() => setAdminTab('registry')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${adminTab === 'registry'
                    ? 'border-primary text-foreground font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Daily Registry
                </button>
                <button
                  onClick={() => {
                    setAdminTab('reports');
                    generateReport();
                  }}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${adminTab === 'reports'
                    ? 'border-primary text-foreground font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Custom Reports
                </button>
              </div>

              {/* TAB 1: DAILY REGISTRY */}
              {adminTab === 'registry' && (
                <section className="space-y-4 pt-2 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="text-base md:text-lg font-extrabold text-foreground tracking-wide flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      Daily Staff Registry
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsHolidayModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-soft hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        title="Manage Company Office Holidays"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Manage Holidays</span>
                      </button>
                      <button
                        onClick={handleExportDailyRegistryExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft hover:bg-success-soft text-success border border-success/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        title="Export Today's Registry to Excel / CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Excel</span>
                      </button>
                      <button
                        onClick={handleExportDailyRegistryPDF}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger border border-danger/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        title="Export Today's Registry to PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold bg-card border border-border py-1 px-3 rounded-lg shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date:</span>
                        <input
                          type="date"
                          value={selectedRegistryDate}
                          onChange={(e) => setSelectedRegistryDate(e.target.value)}
                          className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                        />
                        {selectedRegistryDate !== new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                          <button
                            onClick={() => setSelectedRegistryDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}
                            className="text-[10px] font-bold text-primary hover:underline ml-1 cursor-pointer"
                            title="Reset to today"
                          >
                            Today
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search & Filter pills */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee name, staff code, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-md bg-muted-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--ring)] transition-all duration-300"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-3.5 text-muted-foreground hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                      <div className="text-muted-foreground mr-1 p-2 bg-muted-2 rounded-md border border-border shrink-0">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                      {(['All', 'Present', 'Late', 'Half Day', 'Leave', 'Absent', 'Holiday'] as const).map(filter => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={`
 text-xs px-3.5 py-2.5 rounded-md font-bold border transition-all duration-300 shrink-0
 ${statusFilter === filter
                              ? 'bg-primary border-primary text-foreground shadow-md'
                              : 'bg-muted-2 border-border text-muted-foreground hover:text-foreground hover:bg-muted'}
 `}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table for Desktop & Cards for Mobile */}
                  <div className="space-y-3">
                    {filteredStaff.length > 0 ? (
                      <>
                        {/* Desktop Table View - Legacy CRM Format */}
                        <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-muted-2 text-xs font-bold text-primary tracking-wider">
                                <th className="py-3.5 px-4 text-center w-16">Selfie</th>
                                <th className="py-3.5 px-5">Staff Member</th>
                                <th className="py-3.5 px-4">Designation</th>
                                <th className="py-3.5 px-4 text-center">Punch In</th>
                                <th className="py-3.5 px-4 text-center">Punch Out</th>
                                <th className="py-3.5 px-4 text-center">Working Hours</th>
                                <th className="py-3.5 px-4 text-center">Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                              {filteredStaff.map((staff) => {
                                const isPunchIn = formatDisplayTime(staff.todayRecord?.punch_in);
                                const isPunchOut = formatDisplayTime(staff.todayRecord?.punch_out);
                                const workingHours = staff.todayRecord?.working_hours || '-';
                                const selfieUrl = staff.todayRecord?.selfie_url;

                                const evaluatedStatus = getEvaluatedTodayStatus(staff);
                                let displayStatus = 'ABSENT';
                                let badgeVariant: 'success' | 'warning' | 'info' | 'error' | 'purple' | 'indigo' = 'error';

                                if (evaluatedStatus === 'Present') {
                                  displayStatus = 'PRESENT';
                                  badgeVariant = 'success';
                                } else if (evaluatedStatus === 'Late') {
                                  displayStatus = 'LATE';
                                  badgeVariant = 'warning';
                                } else if (evaluatedStatus === 'Half Day') {
                                  displayStatus = 'HALF DAY';
                                  badgeVariant = 'purple';
                                } else if (evaluatedStatus === 'Leave') {
                                  displayStatus = 'ON LEAVE';
                                  badgeVariant = 'info';
                                } else if (evaluatedStatus === 'Holiday') {
                                  displayStatus = 'HOLIDAY';
                                  badgeVariant = 'indigo';
                                } else {
                                  displayStatus = 'ABSENT';
                                  badgeVariant = 'error';
                                }

                                return (
                                  <tr key={staff.id} className="hover:bg-muted-2/60 transition-colors duration-200">
                                    {/* 1. Selfie Thumbnail */}
                                    <td className="py-3.5 px-4 text-center">
                                      {selfieUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setEnlargedSelfie(selfieUrl)}
                                          className="inline-block relative group focus:outline-none cursor-pointer"
                                          title="Click to view full punch-in selfie photo"
                                        >
                                          <img
                                            src={selfieUrl}
                                            alt="Selfie"
                                            className="w-10 h-10 rounded-full border-2 border-emerald-500/60 object-cover hover:border-primary shadow-sm hover:scale-105 transition-all"
                                          />
                                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center shadow">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                          </span>
                                        </button>
                                      ) : staff.avatar_url ? (
                                        <img
                                          src={staff.avatar_url}
                                          alt=""
                                          className="w-10 h-10 rounded-full border border-border object-cover opacity-75 inline-block"
                                          title="Profile Avatar (No punch selfie logged)"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground uppercase mx-auto">
                                          {staff.full_name?.slice(0, 2) || 'ST'}
                                        </div>
                                      )}
                                    </td>

                                    {/* 2. Staff Member */}
                                    <td className="py-3.5 px-5">
                                      <div className="flex flex-col">
                                        <h4 className="font-bold text-foreground leading-tight text-sm">{staff.full_name}</h4>
                                        <span className="text-xs text-muted-foreground font-semibold mt-0.5">
                                          {staff.staff_code} &bull; {staff.department_name || staff.role_name}
                                        </span>
                                      </div>
                                    </td>

                                    {/* 3. Designation */}
                                    <td className="py-3.5 px-4 text-muted-foreground font-medium text-xs">
                                      {staff.designation || staff.role_name || 'Staff'}
                                    </td>

                                    {/* 4. Punch In */}
                                    <td className="py-3.5 px-4 text-center font-bold text-foreground font-mono text-xs">
                                      {isPunchIn && isPunchIn !== '-' ? (
                                        <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                          {isPunchIn}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>

                                    {/* 5. Punch Out */}
                                    <td className="py-3.5 px-4 text-center font-bold text-foreground font-mono text-xs">
                                      {isPunchOut && isPunchOut !== '-' ? (
                                        <span className="inline-flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                                          {isPunchOut}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>

                                    {/* 6. Working Hours */}
                                    <td className="py-3.5 px-4 text-center font-semibold text-xs">
                                      {workingHours && workingHours !== '-' ? (
                                        <span className={"px-2.5 py-1 rounded-md text-[11px] font-bold " + (workingHours.includes('In Office') ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-muted-2 text-foreground border border-border')}>
                                          {workingHours}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>

                                    {/* 7. Status */}
                                    <td className="py-3.5 px-4 text-center">
                                      <Badge variant={badgeVariant} className="px-2.5 py-1 text-[11px] font-black min-w-[80px] text-center shadow-sm">
                                        {displayStatus}
                                      </Badge>
                                    </td>

                                    {/* 8. Actions */}
                                    <td className="py-3.5 px-4 text-right">
                                      <Button
                                        variant="glass"
                                        size="sm"
                                        onClick={() => handleOpenDrillModal(staff)}
                                        className="!py-1.5 !px-3 text-xs font-bold hover:border-primary cursor-pointer"
                                      >
                                        View History
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="grid grid-cols-1 gap-3.5 md:hidden">
                          {filteredStaff.map((staff) => {
                            const isPunchIn = formatDisplayTime(staff.todayRecord?.punch_in);
                            const isPunchOut = formatDisplayTime(staff.todayRecord?.punch_out);
                            const workingHours = staff.todayRecord?.working_hours || '-';
                            const selfieUrl = staff.todayRecord?.selfie_url;

                            const evaluatedStatus = getEvaluatedTodayStatus(staff);
                            let displayStatus = 'ABSENT';
                            let badgeVariant: 'success' | 'warning' | 'info' | 'error' | 'purple' | 'indigo' = 'error';

                            if (evaluatedStatus === 'Present') {
                              displayStatus = 'PRESENT';
                              badgeVariant = 'success';
                            } else if (evaluatedStatus === 'Late') {
                              displayStatus = 'LATE';
                              badgeVariant = 'warning';
                            } else if (evaluatedStatus === 'Half Day') {
                              displayStatus = 'HALF DAY';
                              badgeVariant = 'purple';
                            } else if (evaluatedStatus === 'Leave') {
                              displayStatus = 'ON LEAVE';
                              badgeVariant = 'info';
                            } else if (evaluatedStatus === 'Holiday') {
                              displayStatus = 'HOLIDAY';
                              badgeVariant = 'indigo';
                            } else {
                              displayStatus = 'ABSENT';
                              badgeVariant = 'error';
                            }

                            return (
                              <Card key={staff.id} variant="glass" className="p-4 border border-border">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex items-center gap-3">
                                    {selfieUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => setEnlargedSelfie(selfieUrl)}
                                        className="relative focus:outline-none cursor-pointer"
                                        title="Click to view selfie"
                                      >
                                        <img
                                          src={selfieUrl}
                                          alt=""
                                          className="w-12 h-12 rounded-full border-2 border-emerald-500/60 object-cover shadow-sm"
                                        />
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card"></span>
                                      </button>
                                    ) : (
                                      <img
                                        src={staff.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&auto=format&fit=crop'}
                                        alt=""
                                        className="w-12 h-12 rounded-full border border-border object-cover"
                                      />
                                    )}
                                    <div>
                                      <h4 className="text-sm font-bold text-foreground">{staff.full_name}</h4>
                                      <span className="text-[10px] text-muted-foreground font-semibold">{staff.staff_code} &bull; {staff.role_name}</span>
                                      <p className="text-[10px] text-primary font-bold mt-0.5">{staff.designation || 'Staff'}</p>
                                    </div>
                                  </div>
                                  <Badge variant={badgeVariant} className="px-2.5 py-0.5 text-[10px] font-bold">
                                    {displayStatus}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border text-xs">
                                  <div>
                                    <span className="text-muted-foreground font-medium block text-[10px]">Punch In</span>
                                    <span className="text-foreground font-bold block mt-0.5 text-xs text-emerald-400">
                                      {isPunchIn && isPunchIn !== '-' ? isPunchIn : '—'}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-muted-foreground font-medium block text-[10px]">Punch Out</span>
                                    <span className="text-foreground font-bold block mt-0.5 text-xs text-primary">
                                      {isPunchOut && isPunchOut !== '-' ? isPunchOut : '—'}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-muted-foreground font-medium block text-[10px]">Working HR's</span>
                                    <span className="text-foreground font-bold block mt-0.5 text-xs">
                                      {workingHours && workingHours !== '-' ? workingHours : '—'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-border">
                                  <Button
                                    variant="glass"
                                    size="sm"
                                    onClick={() => handleOpenDrillModal(staff)}
                                    className="w-full text-xs font-bold py-1.5"
                                  >
                                    View Attendance History
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 bg-card border border-border rounded-lg border border-dashed border-border">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2.5" />
                        <p className="text-sm text-muted-foreground font-medium">No employees found matching criteria.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 2: CUSTOM REPORTS */}
              {adminTab === 'reports' && (
                <Card variant="glass" className="p-6 border-border space-y-6 animate-fade-in mt-2">
                  <div className="border-b border-border pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Custom Date Range Reports
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">Generate and export aggregated staff attendance stats for a custom period.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">From Date</label>
                      <input
                        type="date"
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground">To Date</label>
                      <input
                        type="date"
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="primary"
                        onClick={generateReport}
                        isLoading={isGeneratingReport}
                        className="font-bold text-xs px-4 py-2.5"
                      >
                        Generate Report
                      </Button>
                      <button
                        onClick={handleExportCustomReportExcel}
                        disabled={reportData.length === 0}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-md bg-success-soft hover:bg-success-soft text-success border border-success/30 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export Custom Report to Excel"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Excel</span>
                      </button>
                      <button
                        onClick={handleExportCustomReportPDF}
                        disabled={reportData.length === 0}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-md bg-danger-soft hover:bg-danger-soft text-danger border border-danger/30 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export Custom Report to PDF"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {reportData.length > 0 ? (
                    <div className="overflow-x-auto rounded-md border border-border bg-muted-2">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="py-3 px-4">Staff Member</th>
                            <th className="py-3 px-4">Designation</th>
                            <th className="py-3 px-4 text-center">Present</th>
                            <th className="py-3 px-4 text-center">Late</th>
                            <th className="py-3 px-4 text-center">Half Day</th>
                            <th className="py-3 px-4 text-center">Leave</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-muted-foreground font-semibold">
                          {reportData.map((row) => (
                            <tr key={row.id} className="hover:bg-muted-2">
                              <td className="py-3 px-4 text-foreground font-bold">{row.full_name}</td>
                              <td className="py-3 px-4 text-muted-foreground">{row.designation}</td>
                              <td className="py-3 px-4 text-center text-success">{row.present}</td>
                              <td className="py-3 px-4 text-center text-warning">{row.late}</td>
                              <td className="py-3 px-4 text-center text-primary">{row.halfDay}</td>
                              <td className="py-3 px-4 text-center text-primary">{row.leave}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground font-bold">Select date range and click Generate Report.</p>
                    </div>
                  )}
                </Card>
              )}

              {/* DRILLDOWN STAFF PORTAL MODAL VIEW */}
              {selectedStaffForDrill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/80 animate-fade-in">
                  <Card variant="glass" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border p-6 flex flex-col gap-6 relative">
                    <button
                      onClick={() => setSelectedStaffForDrill(null)}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-card/85 hover:bg-muted text-muted-foreground hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="border-b border-border pb-4 flex items-center gap-4">
                      <img
                        src={selectedStaffForDrill.avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full border border-border object-cover"
                      />
                      <div>
                        <h3 className="text-base font-extrabold text-foreground">{selectedStaffForDrill.full_name} Attendance Registry</h3>
                        <p className="text-xs text-muted-foreground font-bold">{selectedStaffForDrill.staff_code} &bull; {selectedStaffForDrill.role_name} ({selectedStaffForDrill.gender})</p>
                      </div>
                    </div>

                    {loadingDrill ? (
                      <div className="py-16 text-center">
                        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-indigo-500 animate-spin mx-auto mb-3"></div>
                        <p className="text-xs font-semibold text-muted-foreground">Syncing member logs...</p>
                      </div>
                    ) : (
                      (() => {
                        // Generate monthly logs for drill Month (Day 1 to Current Date)
                        const [year, monthIdx] = drillMonth.split('-').map(Number);
                        const daysInMonth = new Date(year, monthIdx, 0).getDate();

                        const [currY, currM, currD] = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).split('-').map(Number);

                        let maxDay = daysInMonth;
                        if (year === currY && monthIdx === currM) {
                          maxDay = currD;
                        } else if (year > currY || (year === currY && monthIdx > currM)) {
                          maxDay = 0;
                        }

                        const monthlyLogs: any[] = [];
                        let presentCount = 0;
                        let lateCount = 0;
                        let halfDayCount = 0;
                        let leaveCount = 0;
                        let holidayCount = 0;
                        const staffWeeklyOff = selectedStaffForDrill?.weekly_off_day || 'Sunday';

                        for (let d = 1; d <= maxDay; d++) {
                          const dateStr = `${year}-${String(monthIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const matchedLog = drillLogs.find(a => a.attendance_date === dateStr);
                          const dateObj = new Date(year, monthIdx - 1, d);
                          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                          const isWeeklyOff = dayName.toLowerCase() === staffWeeklyOff.toLowerCase();
                          const matchHoliday = holidays.find(h => h.holiday_date === dateStr);

                          if (matchedLog) {
                            const isTodayLog = dateStr === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                            const effectiveStatus = evaluatePunchStatus(
                              matchedLog.punch_in,
                              selectedStaffForDrill?.shift_start_time,
                              matchedLog.punch_out,
                              selectedStaffForDrill?.shift_end_time,
                              matchedLog.status
                            );

                            if (effectiveStatus === 'PRESENT') presentCount++;
                            else if (effectiveStatus === 'LATE') lateCount++;
                            else if (effectiveStatus === 'HALF_DAY') halfDayCount++;
                            else if (effectiveStatus === 'LEAVE' || effectiveStatus === 'ABSENT') leaveCount++;

                            const workingHours = matchedLog.working_hours && matchedLog.working_hours !== '-' && !matchedLog.working_hours.includes('NaN')
                              ? matchedLog.working_hours
                              : calculateWorkingHours(matchedLog.punch_in, matchedLog.punch_out, isTodayLog);

                            monthlyLogs.push({
                              date: dateStr,
                              punch_in: matchedLog.punch_in || '-',
                              punch_out: matchedLog.punch_out || '-',
                              status: effectiveStatus,
                              selfie_url: matchedLog.selfie_url,
                              working_hours: workingHours
                            });
                          } else {
                            if (isWeeklyOff || matchHoliday) {
                              holidayCount++;
                              monthlyLogs.push({
                                date: dateStr,
                                punch_in: '-',
                                punch_out: '-',
                                status: 'HOLIDAY',
                                holiday_name: matchHoliday ? matchHoliday.holiday_name : `${staffWeeklyOff} Holiday`,
                                selfie_url: null,
                                working_hours: '-'
                              });
                            } else {
                              leaveCount++;
                              monthlyLogs.push({
                                date: dateStr,
                                punch_in: '-',
                                punch_out: '-',
                                status: 'ABSENT',
                                selfie_url: null,
                                working_hours: '-'
                              });
                            }
                          }
                        }

                        const totalWorkingDays = maxDay - holidayCount;
                        const attendancePercentage = totalWorkingDays > 0
                          ? Math.min(100, Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalWorkingDays) * 100))
                          : 0;

                        return (
                          <div className="space-y-6">
                            <div className="flex justify-between items-center bg-muted-2 p-4 rounded-md border border-border">
                              <span className="text-xs font-bold text-muted-foreground uppercase">Filter Registry Month</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="month"
                                  value={drillMonth}
                                  onChange={(e) => setDrillMonth(e.target.value)}
                                  className="px-3 py-1.5 rounded-md bg-card border border-border text-xs font-bold text-foreground focus:outline-none"
                                />
                                <button
                                  onClick={() => handleExportStaffAttendanceExcel(selectedStaffForDrill, drillMonth, monthlyLogs, presentCount, lateCount, halfDayCount, leaveCount, holidayCount, attendancePercentage)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft hover:bg-success-soft text-success border border-success/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                  title="Export Attendance Report to Excel / CSV"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Export Excel</span>
                                </button>
                                <button
                                  onClick={() => handleExportStaffAttendancePDF(selectedStaffForDrill, drillMonth, monthlyLogs, presentCount, lateCount, halfDayCount, leaveCount, holidayCount, attendancePercentage)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger border border-danger/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                  title="Export Attendance Report to PDF"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Export PDF</span>
                                </button>
                              </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                              <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-success/10">
                                <span className="text-[9px] font-bold text-success uppercase">Present</span>
                                <p className="text-lg font-extrabold text-success mt-1">{presentCount}</p>
                              </Card>
                              <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-primary/10">
                                <span className="text-[9px] font-bold text-warning uppercase">Late</span>
                                <p className="text-lg font-extrabold text-warning mt-1">{lateCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-primary/10">
                                <span className="text-[9px] font-bold text-primary uppercase">Half Day</span>
                                <p className="text-lg font-extrabold text-primary mt-1">{halfDayCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-border">
                                <span className="text-[9px] font-bold text-primary uppercase">Leave</span>
                                <p className="text-lg font-extrabold text-primary mt-1">{leaveCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-border">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Working Days</span>
                                <p className="text-lg font-extrabold text-foreground mt-1">{totalWorkingDays}</p>
                              </Card>
                              <Card variant="glass" glowColor={attendancePercentage >= 90 ? 'emerald' : 'none'} className="p-3 flex flex-col justify-between border-border">
                                <span className="text-[9px] font-bold text-primary uppercase">Att. %</span>
                                <p className="text-lg font-extrabold text-foreground mt-1">{attendancePercentage}%</p>
                              </Card>
                            </div>

                            {/* Logs table */}
                            <div className="overflow-x-auto rounded-md border border-border bg-muted-2 max-h-[40vh] overflow-y-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0">
                                    <th className="py-2.5 px-3">Selfie</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3"> In</th>
                                    <th className="py-2.5 px-3"> Out</th>
                                    <th className="py-2.5 px-3">Working HR's</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-muted-foreground font-semibold">
                                  {monthlyLogs.slice().reverse().map((log: any) => (
                                    <tr key={log.date} className="hover:bg-muted-2">
                                      <td className="py-2.5 px-3">
                                        {log.selfie_url ? (
                                          <button type="button" onClick={() => setEnlargedSelfie(log.selfie_url)} className="focus:outline-none cursor-pointer" title="Click to enlarge selfie">
                                            <img
                                              src={log.selfie_url}
                                              alt=""
                                              className="w-8 h-8 rounded-full border border-border object-cover hover:border-primary shadow-sm hover:scale-105 transition-all"
                                            />
                                          </button>
                                        ) : (
                                          <span className="text-foreground block text-center">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-muted-foreground">{log.date}</td>
                                      <td className="py-2.5 px-3 text-foreground font-bold">{log.punch_in || '-'}</td>
                                      <td className="py-2.5 px-3 text-muted-foreground">{log.punch_out || '-'}</td>
                                      <td className="py-2.5 px-3 text-muted-foreground">{log.working_hours}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <Badge
                                          variant={
                                            log.status === 'PRESENT' ? 'success' :
                                              log.status === 'LATE' ? 'warning' :
                                                log.status === 'HALF_DAY' ? 'purple' :
                                                  log.status === 'LEAVE' ? 'info' :
                                                    log.status === 'HOLIDAY' ? 'indigo' : 'error'
                                          }
                                          className="text-[9px] py-0.5 px-1.5"
                                        >
                                          {log.status === 'HALF_DAY' ? 'HALF DAY' : log.status === 'LEAVE' ? 'ON LEAVE' : log.status}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Lightbox Selfie Modal */}
      {enlargedSelfie && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setEnlargedSelfie(null)}
        >
          <div
            className="relative max-w-sm w-full rounded-2xl overflow-hidden border border-border bg-card shadow-2xl p-4 flex flex-col items-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center pb-2.5 border-b border-border mb-3">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Attendance Selfie Verification
              </span>
              <button
                onClick={() => setEnlargedSelfie(null)}
                className="p-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={enlargedSelfie}
              alt="Verified Selfie"
              className="w-full h-80 object-cover rounded-xl border border-border shadow-md"
            />
            <div className="mt-3 text-[11px] text-muted-foreground text-center font-medium">
              Verified Facial Attendance Photo &bull; Secured with Timestamp
            </div>
          </div>
        </div>
      )}

      {/* Admin Holiday Management Modal */}
      <HolidayManagementModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        holidays={holidays}
        onHolidaysUpdated={(updated) => setHolidays(updated)}
        adminName={activeStaff?.full_name}
      />

      {/* Mobile Sticky Bottom Tab Bar Navigation (Hidden on desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border border-border border-t border-border py-2.5 px-6 z-40 md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('sales')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[9px] font-medium">Sales Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
          >
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-medium">History</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-primary select-none">
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-bold">Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[9px] font-medium">Leads</span>
          </button>

          {isAdminMode && (
            <>
              <button
                onClick={() => setActiveTab('academy_batches')}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
              >
                <Award className="w-5 h-5" />
                <span className="text-[9px] font-medium">Academy</span>
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
              >
                <Star className="w-5 h-5" />
                <span className="text-[9px] font-medium">Staff</span>
              </button>

              <button
                onClick={() => setActiveTab('finance')}
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-secondary-foreground transition-colors duration-200 cursor-pointer"
              >
                <Briefcase className="w-5 h-5" />
                <span className="text-[9px] font-medium">Finance</span>
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default AdminAttendance;
