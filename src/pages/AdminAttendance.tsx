import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import type { Staff, Attendance } from '../types';
import { 
  AlertCircle, 
  Search, 
  Filter, 
  MapPin, 
   
  Award,
  
  X,
  TrendingUp,
  Briefcase,
  
  
  
  
  UserCheck,
  Calendar,
  ExternalLink,
  
  Download,
  FileText,
  Star,
} from 'lucide-react';

interface StaffWithAttendance extends Staff {
  todayRecord?: Attendance;
}

export const AdminAttendance: React.FC = () => {
  const { activeStaff, setActiveTab, isAdminMode,  } = useApp();

  if (!activeStaff) return null;

  useEffect(() => {
    if (!isAdminMode) {
      setActiveTab('sales');
    }
  }, [isAdminMode]);

  // Component local states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffWithAttendance[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late' | 'Half Day' | 'Leave' | 'Absent'>('All');
  const [adminTab, setAdminTab] = useState<'registry' | 'reports'>('registry');

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

  const fetchDrillLogs = async (staffId: string) => {
    setLoadingDrill(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', staffId)
        .order('attendance_date', { ascending: false });
      if (error) throw error;
      setDrillLogs(data || []);
    } catch (err: any) {
      console.error("Error loading drill logs:", err);
    } finally {
      setLoadingDrill(false);
    }
  };

  const handleOpenDrillModal = (staff: any) => {
    setSelectedStaffForDrill(staff);
    setDrillMonth(new Date().toISOString().slice(0, 7));
    fetchDrillLogs(staff.id);
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const { data: rangeAttData, error: rangeAttErr } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', reportFromDate)
        .lte('attendance_date', reportToDate);

      if (rangeAttErr) throw rangeAttErr;

      const logs = rangeAttData || [];
      const aggregated = staffList.map(staff => {
        const staffLogs = logs.filter(l => l.staff_id === staff.id);
        
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

  const downloadReportCSV = () => {
    if (reportData.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    // Add header row at the very top indicating selected date range
    csvContent += `Report Period: ${reportFromDate} to ${reportToDate}\n`;
    csvContent += "Staff Name,Designation,Present,Late,Half Day,Leave\n";
    
    reportData.forEach(row => {
      csvContent += `"${row.full_name}","${row.designation}",${row.present},${row.late},${row.halfDay},${row.leave}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${reportFromDate}_to_${reportToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch all staff and today's attendance records
  const loadAttendanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      // 1. Fetch all staff members from Supabase
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .select('*, departments(name), roles(role_name)');

      if (staffErr) throw staffErr;

      // Fetch profiles to get dynamic designations
      const { data: profilesData } = await supabase
        .from('staff_profiles')
        .select('full_name, designation');

      // 2. Fetch current month's attendance records from Supabase
      const startOfMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .gte('attendance_date', startOfMonthStr);

      if (attErr) throw attErr;

      setAttendanceList(attData || []);

      // 3. Map attendance records onto staff list
      const mappedList: StaffWithAttendance[] = (staffData || []).map((staff: any) => {
        let deptName = 'Sales & Growth';
        let rName = 'Senior Sales Consultant';
        let designationVal = 'Senior Sales Consultant';

        if (staff.departments) {
          deptName = Array.isArray(staff.departments) 
            ? staff.departments[0]?.name 
            : staff.departments.name;
        }
        if (staff.roles) {
          rName = Array.isArray(staff.roles) 
            ? staff.roles[0]?.role_name 
            : staff.roles.role_name;
        }

        const matchedProfile = (profilesData || []).find(
          (p: any) => p.full_name && p.full_name.toLowerCase() === staff.full_name.toLowerCase()
        );
        if (matchedProfile && matchedProfile.designation) {
          designationVal = matchedProfile.designation;
        } else {
          designationVal = rName;
        }

        const todayRecord = (attData || []).find((a: any) => a.staff_id === staff.id && a.attendance_date === todayStr);

        return {
          id: staff.id,
          staff_code: staff.staff_code,
          full_name: staff.full_name,
          department_id: staff.department_id,
          role_id: staff.role_id,
          avatar_url: staff.avatar_url,
          monthly_target_amount: Number(staff.monthly_target_amount),
          notice_period_days: staff.notice_period_days,
          status: staff.status as 'ACTIVE' | 'INACTIVE',
          department_name: deptName,
          role_name: rName,
          designation: designationVal,
          todayRecord: todayRecord as Attendance | undefined
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
    loadAttendanceData();
  }, []);

  // Compute metrics
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const totalStaffCount = staffList.length;
  
  const todayAttLogs = attendanceList.filter(a => a.attendance_date === todayStr);

  const presentCount = todayAttLogs.filter(a => a.status === 'PRESENT').length;
  const lateCount = todayAttLogs.filter(a => a.status === 'LATE').length;
  const halfDayCount = todayAttLogs.filter(a => a.status === 'HALF_DAY').length;
  const leaveCount = todayAttLogs.filter(a => a.status === 'LEAVE').length;
  
  const isSunday = new Date().getDay() === 0;
  const holidayCountVal = isSunday ? totalStaffCount : 0;

  const inOfficeCount = todayAttLogs.filter(a => a.punch_in && !a.punch_out).length;
  const missedPunchOutCount = attendanceList.filter(a => a.attendance_date < todayStr && a.punch_in && !a.punch_out).length;

  // Filter & search staff list
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch = 
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      staff.staff_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.department_name && staff.department_name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Determine current status of staff member
    let currentStatus: 'Present' | 'Late' | 'Half Day' | 'Leave' | 'Absent' = 'Absent';
    if (staff.todayRecord) {
      const status = staff.todayRecord.status;
      const punchIn = staff.todayRecord.punch_in;
      
      if (status === 'PRESENT') {
        if (punchIn && punchIn > '09:30:00') {
          currentStatus = 'Late';
        } else {
          currentStatus = 'Present';
        }
      } else if (status === 'LATE') {
        currentStatus = 'Late';
      } else if (status === 'HALF_DAY') {
        currentStatus = 'Half Day';
      } else if (status === 'LEAVE') {
        currentStatus = 'Leave';
      }
    }

    const matchesFilter = statusFilter === 'All' ? true : currentStatus === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col lg:flex-row relative w-full overflow-x-clip">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-30%] w-[90vw] h-[90vw] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>

      {/* Left Sidebar Navigation (Desktop only) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-24 md:pb-8">
        
        {/* Header Profile Section */}
        <header className="glass-panel sticky top-14 lg:top-0 z-30 px-4 md:px-8 py-3.5 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar (Mobile only) */}
              <div className="relative group cursor-pointer md:hidden">
                <img 
                  src={activeStaff.avatar_url} 
                  alt={activeStaff.full_name} 
                  className="relative w-10 h-10 rounded-full border-2 border-indigo-400 object-cover"
                />
              </div>
              
              <div>
                <h1 className="text-base md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                  <span className="md:hidden">Attendance Logs</span>
                  <span className="hidden md:inline-flex items-center gap-2">
                    Admin Attendance Dashboard
                    <Badge variant="success" className="text-[10px] py-0.5">Real-time DB</Badge>
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium hidden md:block">Monitor staff punch-in times, geographic location stamps, and daily status logs.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="glass" 
                size="sm" 
                className="!py-2 !px-3 font-bold text-xs" 
                onClick={loadAttendanceData}
                isLoading={loading}
              >
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Panels */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">
          
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-semibold text-slate-400">Loading daily attendance registry...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center glass-card rounded-3xl p-8 border border-rose-500/20 max-w-md mx-auto">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-2">Failed to Sync Records</h3>
              <p className="text-sm text-slate-400 mb-6">{error}</p>
              <Button variant="primary" onClick={loadAttendanceData}>Retry Reload</Button>
            </div>
          ) : (
            <>
              {/* Summary Stats Grid (Total, Present, Late, Half Day, Leave, Holiday, Missed Punch Out, In Office) */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {/* Total Staff */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-slate-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
                  <p className="text-xl font-extrabold text-white mt-1">{totalStaffCount}</p>
                </Card>

                {/* Present */}
                <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-emerald-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Present</span>
                  <p className="text-xl font-extrabold text-emerald-400 mt-1">{presentCount}</p>
                </Card>

                {/* Late */}
                <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-purple-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Late</span>
                  <p className="text-xl font-extrabold text-amber-400 mt-1">{lateCount}</p>
                </Card>

                {/* Half Day */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-indigo-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Half Day</span>
                  <p className="text-xl font-extrabold text-indigo-400 mt-1">{halfDayCount}</p>
                </Card>

                {/* Leave */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-blue-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">On Leave</span>
                  <p className="text-xl font-extrabold text-blue-400 mt-1">{leaveCount}</p>
                </Card>

                {/* Holiday */}
                <Card variant="glass" className="p-3 flex flex-col justify-between border-slate-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Holiday</span>
                  <p className="text-xl font-extrabold text-slate-450 mt-1">{holidayCountVal}</p>
                </Card>

                {/* Missed Punch Out */}
                <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-rose-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-rose-450 uppercase tracking-wider">Missed Out</span>
                  <p className="text-xl font-extrabold text-rose-450 mt-1">{missedPunchOutCount}</p>
                </Card>

                {/* In Office */}
                <Card variant="glass" glowColor="indigo" className="p-3 flex flex-col justify-between border-indigo-500/10 min-h-[80px]">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">In Office</span>
                  <p className="text-xl font-extrabold text-indigo-400 mt-1">{inOfficeCount}</p>
                </Card>
              </div>

              {/* Tab navigation */}
              <div className="flex gap-4 border-b border-white/5 pb-1 mt-4">
                <button
                  onClick={() => setAdminTab('registry')}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                    adminTab === 'registry'
                      ? 'border-indigo-500 text-white font-extrabold'
                      : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
                >
                  Daily Registry
                </button>
                <button
                  onClick={() => {
                    setAdminTab('reports');
                    generateReport();
                  }}
                  className={`pb-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
                    adminTab === 'reports'
                      ? 'border-indigo-500 text-white font-extrabold'
                      : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
                >
                  Custom Reports
                </button>
              </div>

              {/* TAB 1: DAILY REGISTRY */}
              {adminTab === 'registry' && (
                <section className="space-y-4 pt-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-400" />
                      Daily Staff Registry
                    </h2>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Today: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Search & Filter pills */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search employee name, staff code, or department..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-3.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                      <div className="text-slate-500 mr-1 p-2 bg-slate-900/50 rounded-xl border border-slate-800 shrink-0">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                      {(['All', 'Present', 'Late', 'Half Day', 'Leave', 'Absent'] as const).map(filter => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={`
                            text-xs px-3.5 py-2.5 rounded-xl font-bold border transition-all duration-300 shrink-0
                            ${statusFilter === filter 
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-400 text-white shadow-md' 
                              : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}
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
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-hidden rounded-2xl border border-white/5 glass-panel">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-slate-900/40 text-xs font-bold text-indigo-400 tracking-wider">
                                <th className="py-4 px-6">Staff Member</th>
                                <th className="py-4 px-6">Designation</th>
                                <th className="py-4 px-6">Punch In</th>
                                <th className="py-4 px-6">Punch Out</th>
                                <th className="py-4 px-6 text-right">Actions / Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                              {filteredStaff.map((staff) => {
                                // Determine display fields
                                const isPunchIn = staff.todayRecord?.punch_in;
                                const isPunchOut = staff.todayRecord?.punch_out;
                                
                                let displayStatus = 'ABSENT';
                                let badgeVariant: 'success' | 'warning' | 'info' | 'error' | 'purple' = 'error';

                                if (staff.todayRecord) {
                                  const status = staff.todayRecord.status;
                                  if (status === 'PRESENT') {
                                    if (isPunchIn && isPunchIn > '09:30:00') {
                                      displayStatus = 'LATE';
                                      badgeVariant = 'warning';
                                    } else {
                                      displayStatus = 'PRESENT';
                                      badgeVariant = 'success';
                                    }
                                  } else if (status === 'LATE') {
                                    displayStatus = 'LATE';
                                    badgeVariant = 'warning';
                                  } else if (status === 'HALF_DAY') {
                                    displayStatus = 'HALF DAY';
                                    badgeVariant = 'purple';
                                  } else if (status === 'LEAVE') {
                                    displayStatus = 'ON LEAVE';
                                    badgeVariant = 'info';
                                  }
                                }

                                return (
                                  <tr key={staff.id} className="hover:bg-slate-900/20 transition-colors duration-200">
                                    <td className="py-4 px-6 flex items-center gap-3.5">
                                      <img 
                                        src={staff.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&auto=format&fit=crop'} 
                                        alt="" 
                                        className="w-10 h-10 rounded-full border border-slate-800 object-cover"
                                      />
                                      <div>
                                        <h4 className="font-bold text-slate-200 leading-tight">{staff.full_name}</h4>
                                        <span className="text-xs text-slate-500 font-semibold">{staff.staff_code} &bull; {staff.role_name}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6 text-slate-400 font-medium">{staff.designation || staff.role_name || 'Senior Sales Consultant'}</td>
                                    <td className="py-4 px-6 font-semibold text-slate-200">
                                      {isPunchIn ? (
                                        <span className="flex items-center gap-1.5">
                                          <Star className="w-3.5 h-3.5 text-emerald-400" />
                                          {isPunchIn}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">—</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 font-semibold text-slate-200">
                                      {isPunchOut ? (
                                        <span className="flex items-center gap-1.5">
                                          <Star className="w-3.5 h-3.5 text-indigo-400" />
                                          {isPunchOut}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">—</span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                      <div className="flex justify-end items-center gap-3">
                                        <Button 
                                          variant="glass" 
                                          size="sm" 
                                          onClick={() => handleOpenDrillModal(staff)}
                                          className="!py-1 !px-2.5 text-[10px] font-bold"
                                        >
                                          View
                                        </Button>
                                        <Badge variant={badgeVariant} className="px-2.5 py-0.5 text-[11px] font-bold min-w-[75px] text-center">
                                          {displayStatus}
                                        </Badge>
                                      </div>
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
                            const isPunchIn = staff.todayRecord?.punch_in;
                            const isPunchOut = staff.todayRecord?.punch_out;
                            
                            let displayStatus = 'ABSENT';
                            let badgeVariant: 'success' | 'warning' | 'info' | 'error' | 'purple' = 'error';

                            if (staff.todayRecord) {
                              const status = staff.todayRecord.status;
                              if (status === 'PRESENT') {
                                if (isPunchIn && isPunchIn > '09:30:00') {
                                  displayStatus = 'LATE';
                                  badgeVariant = 'warning';
                                } else {
                                  displayStatus = 'PRESENT';
                                  badgeVariant = 'success';
                                }
                              } else if (status === 'LATE') {
                                displayStatus = 'LATE';
                                badgeVariant = 'warning';
                              } else if (status === 'HALF_DAY') {
                                displayStatus = 'HALF DAY';
                                badgeVariant = 'purple';
                              } else if (status === 'LEAVE') {
                                displayStatus = 'ON LEAVE';
                                badgeVariant = 'info';
                              }
                            }

                            return (
                              <Card key={staff.id} variant="glass" className="p-4 border border-white/5">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={staff.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=128&auto=format&fit=crop'} 
                                      alt="" 
                                      className="w-11 h-11 rounded-full border border-slate-800 object-cover"
                                    />
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-200">{staff.full_name}</h4>
                                      <span className="text-[10px] text-slate-400 font-semibold">{staff.staff_code} &bull; {staff.role_name}</span>
                                      <p className="text-[10px] text-indigo-400/80 font-bold mt-0.5">{staff.designation || staff.role_name || 'Senior Sales Consultant'}</p>
                                    </div>
                                  </div>
                                  <Badge variant={badgeVariant} className="px-2 py-0 text-[10px]">
                                    {displayStatus}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5 text-xs">
                                  <div>
                                    <span className="text-slate-500 font-medium block">Punch In:</span>
                                    {isPunchIn ? (
                                      <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                                        <Star className="w-3.5 h-3.5 text-emerald-400" />
                                        {isPunchIn}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 block mt-0.5">—</span>
                                    )}
                                  </div>

                                  <div>
                                    <span className="text-slate-500 font-medium block">Punch Out:</span>
                                    {isPunchOut ? (
                                      <span className="text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                                        <Star className="w-3.5 h-3.5 text-indigo-400" />
                                        {isPunchOut}
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 block mt-0.5">—</span>
                                    )}
                                  </div>
                                </div>

                                {staff.todayRecord?.lat && staff.todayRecord?.lng && (
                                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>Verified GPS: {staff.todayRecord.lat.toFixed(4)}, {staff.todayRecord.lng.toFixed(4)}</span>
                                    </div>
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${staff.todayRecord.lat},${staff.todayRecord.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-indigo-400 font-bold flex items-center gap-0.5 hover:underline"
                                    >
                                      <span>View Map</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                )}

                                <div className="mt-3 pt-2.5 border-t border-white/5">
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
                      <div className="text-center py-12 glass-card rounded-2xl border border-dashed border-white/5">
                        <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2.5" />
                        <p className="text-sm text-slate-400 font-medium">No employees found matching criteria.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 2: CUSTOM REPORTS */}
              {adminTab === 'reports' && (
                <Card variant="glass" className="p-6 border-white/5 space-y-6 animate-fade-in mt-2">
                  <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        Custom Date Range Reports
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">Generate and export aggregated staff attendance stats for a custom period.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">From Date</label>
                      <input 
                        type="date" 
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">To Date</label>
                      <input 
                        type="date" 
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="primary"
                        onClick={generateReport}
                        isLoading={isGeneratingReport}
                        className="flex-1 sm:flex-none font-bold text-xs px-5 py-3"
                      >
                        Generate Report
                      </Button>
                      <Button
                        variant="glass"
                        onClick={downloadReportCSV}
                        disabled={reportData.length === 0}
                        className="flex-1 sm:flex-none font-bold text-xs px-5 py-3 flex items-center gap-1.5 border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>

                  {reportData.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Staff Member</th>
                            <th className="py-3 px-4">Designation</th>
                            <th className="py-3 px-4 text-center">Present</th>
                            <th className="py-3 px-4 text-center">Late</th>
                            <th className="py-3 px-4 text-center">Half Day</th>
                            <th className="py-3 px-4 text-center">Leave</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-355 font-semibold">
                          {reportData.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-900/10">
                              <td className="py-3 px-4 text-white font-bold">{row.full_name}</td>
                              <td className="py-3 px-4 text-slate-400">{row.designation}</td>
                              <td className="py-3 px-4 text-center text-emerald-400">{row.present}</td>
                              <td className="py-3 px-4 text-center text-amber-400">{row.late}</td>
                              <td className="py-3 px-4 text-center text-indigo-400">{row.halfDay}</td>
                              <td className="py-3 px-4 text-center text-blue-400">{row.leave}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-550 font-bold">Select date range and click Generate Report.</p>
                    </div>
                  )}
                </Card>
              )}

              {/* DRILLDOWN STAFF PORTAL MODAL VIEW */}
              {selectedStaffForDrill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                  <Card variant="glass" className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10 p-6 flex flex-col gap-6 relative">
                    <button 
                      onClick={() => setSelectedStaffForDrill(null)}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    <div className="border-b border-white/5 pb-4 flex items-center gap-4">
                      <img 
                        src={selectedStaffForDrill.avatar_url} 
                        alt="" 
                        className="w-12 h-12 rounded-full border border-slate-700 object-cover"
                      />
                      <div>
                        <h3 className="text-base font-extrabold text-white">{selectedStaffForDrill.full_name} Attendance Registry</h3>
                        <p className="text-xs text-slate-400 font-bold">{selectedStaffForDrill.staff_code} &bull; {selectedStaffForDrill.role_name} ({selectedStaffForDrill.gender})</p>
                      </div>
                    </div>

                    {loadingDrill ? (
                      <div className="py-16 text-center">
                        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3"></div>
                        <p className="text-xs font-semibold text-slate-400">Syncing member logs...</p>
                      </div>
                    ) : (
                      (() => {
                        // Generate monthly logs for drill Month
                        const [year, monthIdx] = drillMonth.split('-').map(Number);
                        const daysInMonth = new Date(year, monthIdx, 0).getDate();
                        
                        const monthlyLogs: any[] = [];
                        let presentCount = 0;
                        let lateCount = 0;
                        let halfDayCount = 0;
                        let leaveCount = 0;
                        let holidayCount = 0;

                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${year}-${String(monthIdx).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const matchedLog = drillLogs.find(a => a.attendance_date === dateStr);
                          const dayOfWeek = new Date(year, monthIdx - 1, d).getDay(); // 0 is Sunday
                          
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
                              date: dateStr,
                              punch_in: matchedLog.punch_in,
                              punch_out: matchedLog.punch_out,
                              status: matchedLog.status,
                              selfie_url: matchedLog.selfie_url,
                              working_hours: workingHours
                            });
                          } else {
                            if (dayOfWeek === 0) {
                              holidayCount++;
                              monthlyLogs.push({
                                date: dateStr,
                                punch_in: '-',
                                punch_out: '-',
                                status: 'HOLIDAY',
                                selfie_url: null,
                                working_hours: '-'
                              });
                            }
                          }
                        }

                        const totalWorkingDays = daysInMonth - holidayCount;
                        const attendancePercentage = totalWorkingDays > 0 
                          ? Math.min(100, Math.round(((presentCount + lateCount + halfDayCount * 0.5) / totalWorkingDays) * 100))
                          : 0;

                        return (
                          <div className="space-y-6">
                              <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-slate-350 uppercase">Filter Registry Month</span>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="month" 
                                    value={drillMonth}
                                    onChange={(e) => setDrillMonth(e.target.value)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none"
                                  />
                                  <button 
                                    onClick={() => handleExportStaffAttendanceExcel(selectedStaff, drillMonth, monthlyLogs, presentCount, lateCount, halfDayCount, leaveCount, holidayCount, attendancePercentage)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                    title="Export Attendance Report to Excel / CSV"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Export Excel</span>
                                  </button>
                                  <button 
                                    onClick={() => handleExportStaffAttendancePDF(selectedStaff, drillMonth, monthlyLogs, presentCount, lateCount, halfDayCount, leaveCount, holidayCount, attendancePercentage)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                    title="Export Attendance Report to PDF"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Export PDF</span>
                                  </button>
                                </div>
                              </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                              <Card variant="glass" glowColor="emerald" className="p-3 flex flex-col justify-between border-emerald-500/10">
                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Present</span>
                                <p className="text-lg font-extrabold text-emerald-400 mt-1">{presentCount}</p>
                              </Card>
                              <Card variant="glass" glowColor="purple" className="p-3 flex flex-col justify-between border-purple-500/10">
                                <span className="text-[9px] font-bold text-amber-400 uppercase">Late</span>
                                <p className="text-lg font-extrabold text-amber-400 mt-1">{lateCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-indigo-500/10">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase">Half Day</span>
                                <p className="text-lg font-extrabold text-indigo-400 mt-1">{halfDayCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-blue-500/10">
                                <span className="text-[9px] font-bold text-blue-400 uppercase">Leave</span>
                                <p className="text-lg font-extrabold text-blue-400 mt-1">{leaveCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-white/5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Holiday</span>
                                <p className="text-lg font-extrabold text-slate-450 mt-1">{holidayCount}</p>
                              </Card>
                              <Card variant="glass" className="p-3 flex flex-col justify-between border-white/5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Working Days</span>
                                <p className="text-lg font-extrabold text-white mt-1">{totalWorkingDays}</p>
                              </Card>
                              <Card variant="glass" glowColor={attendancePercentage >= 90 ? 'emerald' : 'none'} className="p-3 flex flex-col justify-between border-white/5">
                                <span className="text-[9px] font-bold text-indigo-400 uppercase">Att. %</span>
                                <p className="text-lg font-extrabold text-white mt-1">{attendancePercentage}%</p>
                              </Card>
                            </div>

                            {/* Logs table */}
                            <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20 max-h-[40vh] overflow-y-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                                    <th className="py-2.5 px-3">Selfie</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3"> In</th>
                                    <th className="py-2.5 px-3"> Out</th>
                                    <th className="py-2.5 px-3">Working HR's</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-350 font-semibold">
                                  {monthlyLogs.map((log: any) => (
                                    <tr key={log.date} className="hover:bg-slate-900/10">
                                      <td className="py-2.5 px-3">
                                        {log.selfie_url ? (
                                          <a href={log.selfie_url} target="_blank" rel="noopener noreferrer">
                                            <img 
                                              src={log.selfie_url} 
                                              alt="" 
                                              className="w-8 h-8 rounded-full border border-slate-700 object-cover cursor-pointer hover:border-indigo-400"
                                            />
                                          </a>
                                        ) : (
                                          <span className="text-slate-700 block text-center">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400">{log.date}</td>
                                      <td className="py-2.5 px-3 text-white font-bold">{log.punch_in || '-'}</td>
                                      <td className="py-2.5 px-3 text-slate-400">{log.punch_out || '-'}</td>
                                      <td className="py-2.5 px-3 text-slate-400">{log.working_hours}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <Badge 
                                          variant={
                                            log.status === 'PRESENT' ? 'success' : 
                                            log.status === 'LATE' ? 'warning' : 
                                            log.status === 'HALF_DAY' ? 'purple' : 
                                            log.status === 'HOLIDAY' ? 'indigo' : 'error'
                                          } 
                                          className="text-[9px] py-0.5 px-1.5"
                                        >
                                          {log.status === 'HALF_DAY' ? 'HALF DAY' : log.status}
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

      {/* Mobile Sticky Bottom Tab Bar Navigation (Hidden on desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 backdrop-blur-md py-2.5 px-6 z-40 md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('sales')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[9px] font-medium">Sales Hub</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-medium">History</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 text-indigo-400 select-none">
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-bold">Attendance</span>
          </button>

          <button 
            onClick={() => setActiveTab('leads')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[9px] font-medium">Leads</span>
          </button>

          {isAdminMode && (
            <>
              <button 
                onClick={() => setActiveTab('academy_batches')}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
              >
                <Award className="w-5 h-5" />
                <span className="text-[9px] font-medium">Academy</span>
              </button>

              <button 
                onClick={() => setActiveTab('staff')}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
              >
                <Star className="w-5 h-5" />
                <span className="text-[9px] font-medium">Staff</span>
              </button>

              <button 
                onClick={() => setActiveTab('finance')}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
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
