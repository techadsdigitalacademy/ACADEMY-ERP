import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { StaffHistoryTab } from '../components/dashboard-tabs/StaffHistoryTab';
import { DailyReportsTab } from '../components/dashboard-tabs/DailyReportsTab';
import { DailyWorkLoggingTab } from '../components/dashboard-tabs/DailyWorkLoggingTab';
import { ExpenseHistoryTab } from '../components/dashboard-tabs/ExpenseHistoryTab';
import { LeadsTab } from '../components/dashboard-tabs/LeadsTab';
import { SalesHistoryLog } from '../components/SalesHistoryLog';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AttendanceDashboard } from '../components/AttendanceDashboard';
import { SalesDashboardModals } from '../components/sales-dashboard/SalesDashboardModals';
import { SalesDashboardMetrics } from '../components/sales-dashboard/SalesDashboardMetrics';
import { AgencyNoticeBoardWidget } from '../components/AgencyNoticeBoardWidget';
import { NoticeBoardAdminModal } from '../components/NoticeBoardAdminModal';
import { supabase, supabaseAdmin } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import { dataCache } from '../services/dataCache';
import { resetStaffAuthPassword } from '../services/staffAuth';
import { 
  Plus, 
  X,
  Edit2,
  Star,
  Sun,
  Moon,
  RotateCcw,
  Menu
} from 'lucide-react';
import { LogRefundModal } from '../components/sales-dashboard/LogRefundModal';

export const SalesDashboard: React.FC = () => {
  const { 
    activeStaff, 
    sales, 
    dailyReports,
    selectedMonth,
    setSelectedMonth,
    todayAttendance, 
    addSale, 
    addDailyReport,
    punchIn, 
    punchOut,
    activeTab,
    
    isAdminMode,
    theme,
    toggleTheme,
    fetchDashboardData
  } = useApp();

  const formatTimeStr = (timeStr?: string) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hrs = parseInt(parts[0], 10);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const displayHrs = hrs % 12 || 12;
    return `${String(displayHrs).padStart(2, '0')}:${mins} ${ampm}`;
  };

  // Owner expenses state
  const [ownerExpenses, setOwnerExpenses] = useState<any[]>([]);
  
  // Log Sale & Log Refund Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null);
  
  // Daily Report form states
  const [dailyWorkType, setDailyWorkType] = useState('');
  const [dailyWorkDesc, setDailyWorkDesc] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Creative/Marketing count states
  const [postersCount, setPostersCount] = useState('');
  const [reEditsCount, setReEditsCount] = useState('');
  const [logosCount, setLogosCount] = useState('');
  const [othersCount, setOthersCount] = useState('');
  const [adsPlacedCount, setAdsPlacedCount] = useState('');

  // Videographer logging states
  const [videoWorkCategory, setVideoWorkCategory] = useState('Tech Ads Agency');
  const [videoClientName, setVideoClientName] = useState('Tech Ads');
  const [videoCount, setVideoCount] = useState('');
  const [videoTravelExpense, setVideoTravelExpense] = useState('');
  const [videoFilter, setVideoFilter] = useState<'All' | 'Tech Ads Agency' | 'Tech Ads Academy' | 'External Client'>('All');

  const [isAdminView, setIsAdminView] = useState(false);
  const [isClosingReportOpen, setIsClosingReportOpen] = useState(false);
  const [todayAttendanceStats, setTodayAttendanceStats] = useState({ present: 0, late: 0, halfDay: 0, leave: 0, inOffice: 0 });
  const [academyRevenue, setAcademyRevenue] = useState(0);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<{ name: string; amount: number; avatar?: string }[]>([]);

  // Daily Report editing states
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [editReportPosters, setEditReportPosters] = useState('');
  const [editReportReEdits, setEditReportReEdits] = useState('');
  const [editReportLogos, setEditReportLogos] = useState('');
  const [editReportOthers, setEditReportOthers] = useState('');
  const [editReportAdsPlaced, setEditReportAdsPlaced] = useState('');
  const [editReportDesc, setEditReportDesc] = useState('');
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);

  // Videographer edit states
  const [editVideoWorkCategory, setEditVideoWorkCategory] = useState('');
  const [editVideoClientName, setEditVideoClientName] = useState('');
  const [editVideoCount, setEditVideoCount] = useState('');
  const [editVideoTravelExpense, setEditVideoTravelExpense] = useState('');

  //  modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedResetStaff, setSelectedResetStaff] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // For Staff History tab drill down in Admin Mode
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);



  // Lead Management States
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadLocation, setNewLeadLocation] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadPackage, setNewLeadPackage] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);




  // Punch-in GPS state simulation

  // Strict Geofencing & Camera states

  // Camera stream states
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [enlargedSelfie, setEnlargedSelfie] = useState<string | null>(null);
  const [isNoticeBoardModalOpen, setIsNoticeBoardModalOpen] = useState(false);

  // Set default view on load
  useEffect(() => {
    const isOwnerUser = activeStaff?.designation?.toLowerCase().includes('owner') || false;
    setIsAdminView(isAdminMode && !isOwnerUser);
  }, [isAdminMode, activeStaff?.designation]);




  // Fetch summaries for Admin View (Optimized parallel fetching with caching)
  useEffect(() => {
    if (isAdminView && (activeTab === 'sales' || activeTab === 'staff-history')) {
      const loadAdminDashboardData = async () => {
        try {
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const cacheKey = `admin_dashboard_summaries_${todayStr}`;

          const {
            attendanceData,
            paymentsData,
            profilesData,
            targetsData,
            salesData,
            reportsData,
            monthAttData,
            staffData
          } = await dataCache.fetchWithCache(
            cacheKey,
            async () => {
              const [
                attendanceRes,
                paymentsRes,
                profilesRes,
                targetsRes,
                salesRes,
                reportsRes,
                monthAttRes,
                staffRes
              ] = await Promise.all([
                supabase.from('attendance').select('staff_id, status, punch_in').eq('attendance_date', todayStr),
                supabase.from('academy_student_payments').select('amount'),
                supabase.from('staff_profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('staff').select('id, monthly_target_amount, monthly_targets, full_name, avatar_url'),
                supabase.from('sales').select('*'),
                supabase.from('daily_reports').select('*'),
                supabase.from('attendance').select('staff_id, status, attendance_date'),
                supabase.from('staff').select('*, departments(name), roles(role_name)')
              ]);

              return {
                attendanceData: attendanceRes.data || [],
                paymentsData: paymentsRes.data || [],
                profilesData: profilesRes.data || [],
                targetsData: targetsRes.data || [],
                salesData: salesRes.data || [],
                reportsData: reportsRes.data || [],
                monthAttData: monthAttRes.data || [],
                staffData: staffRes.data || []
              };
            },
            { ttlMs: 45000 }
          );

          // Helper to identify Company Owners (matching AdminAttendance.tsx)
          const isOwnerProfile = (p: any) => {
            if (!p || !p.full_name) return true;
            const cleanName = String(p.full_name || '').trim().toLowerCase();
            const desig = String(p.designation || '').toLowerCase().trim();
            const rName = String(p.role_name || p.role || '').toLowerCase().trim();

            if (cleanName.includes('althaf') || cleanName.includes('shibili') || cleanName.includes('ashif')) return true;
            if (desig.includes('owner') || rName.includes('owner') || desig.includes('managing director') || rName.includes('managing director')) return true;

            return false;
          };

          // Filter active profiles matching Staff Management directory (excludes Company Owners, tutors, counselors, admins)
          const activeProfiles = (profilesData || []).filter((p: any) => {
            if (!p || !p.full_name) return false;
            if (p.status === 'INACTIVE' || p.status === 'RESIGNED') return false;
            if (isOwnerProfile(p)) return false;

            const desig = String(p.designation || '').toLowerCase().trim();
            const rName = String(p.role_name || p.role || '').toLowerCase().trim();

            const isTutor = desig.includes('tutor') || rName.includes('tutor');
            const isCounselor = desig.includes('counselor') || rName.includes('counselor');
            const isAdminDir = desig.includes('admin') || desig.includes('director') || rName.includes('admin') || rName.includes('director');

            if (isAdminDir) return false;
            if (isTutor || isCounselor) return false;

            return true;
          });

          const staffByCleanName = new Map<string, any>();
          (staffData || []).forEach((s: any) => {
            if (s.full_name) {
              staffByCleanName.set(s.full_name.trim().toLowerCase(), s);
            }
          });

          const todayAttLogs = attendanceData || [];

          const staffList = activeProfiles.map((p: any) => {
            const sMatch = staffByCleanName.get(p.full_name.trim().toLowerCase());
            const staffId = sMatch?.id || p.id;
            const todayRecord = todayAttLogs.find((a: any) => 
              (a.staff_id === staffId || a.staff_id === p.id)
            );
            return {
              id: staffId,
              full_name: p.full_name,
              todayRecord
            };
          });

          // Present: strictly present on time (excluding Late and Half Day)
          const present = staffList.filter(s => {
            if (!s.todayRecord) return false;
            const status = s.todayRecord.status;
            const punchIn = s.todayRecord.punch_in;
            return status === 'PRESENT' && (!punchIn || punchIn <= '09:30:00');
          }).length;

          // Late: marked as Late or present with punch_in > 09:30:00
          const late = staffList.filter(s => {
            if (!s.todayRecord) return false;
            const status = s.todayRecord.status;
            const punchIn = s.todayRecord.punch_in;
            return status === 'LATE' || (status === 'PRESENT' && punchIn && punchIn > '09:30:00');
          }).length;

          // Half Day: marked as Half Day
          const halfDay = staffList.filter(s => {
            if (!s.todayRecord) return false;
            return s.todayRecord.status === 'HALF_DAY';
          }).length;

          // On Leave / Absent: staff who haven't punched in yet or are on leave/absent
          const leave = staffList.filter(s => {
            if (!s.todayRecord) return true;
            const status = s.todayRecord.status;
            return status === 'LEAVE' || status === 'ABSENT';
          }).length;

          // In Office: total count of everyone inside the office today (Present + Late + Half Day combined who punched in)
          const inOffice = staffList.filter(s => {
            if (!s.todayRecord) return false;
            const { punch_in, status } = s.todayRecord;
            return !!punch_in && (status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY');
          }).length;

          setTodayAttendanceStats({ present, late, halfDay, leave, inOffice });

          // 2. Process Academy Revenue
          const sumRev = (paymentsData || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
          setAcademyRevenue(sumRev);

          // 3. Process Staff Profiles & Performance Stats
          const profiles = profilesData || [];
          const targets = targetsData || [];
          const dbSales = salesData || [];
          const allReports = reportsData || [];
          const monthAttendanceFiltered = (monthAttData || []).filter((a: any) => a.attendance_date?.startsWith(selectedMonth));

          const targetMap: { [key: string]: number } = {};
          const avatarMap: { [key: string]: string } = {};
          targets.forEach(t => {
            if (t.full_name) {
              targetMap[t.full_name] = resolveStaffMonthTarget(t, selectedMonth);
              if (t.avatar_url) avatarMap[t.full_name] = t.avatar_url;
            }
          });

          let localSalesData: any[] = [];
          try {
            const localStr = localStorage.getItem('company_sales_local_store') || localStorage.getItem('sales');
            if (localStr) localSalesData = JSON.parse(localStr);
          } catch (e) {}

          const combinedAllSales = [...dbSales, ...(Array.isArray(localSalesData) ? localSalesData : [])];

          const isSaleInMonth = (s: any, monthKey: string) => {
            if (!s) return false;
            if (s.created_at && String(s.created_at).startsWith(monthKey)) return true;
            if (s.date && String(s.date).startsWith(monthKey)) return true;
            if (s.sale_date && String(s.sale_date).startsWith(monthKey)) return true;
            if (s.sale_month) {
              if (String(s.sale_month).startsWith(monthKey)) return true;
              const [year, month] = monthKey.split('-');
              const d = new Date(Number(year), Number(month) - 1, 1);
              const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
              if (String(s.sale_month).toLowerCase() === monthName.toLowerCase()) return true;
            }
            return false;
          };

          const monthSalesFiltered = combinedAllSales.filter(s => isSaleInMonth(s, selectedMonth));
          const monthReportsFiltered = (allReports || []).filter(r => r.report_date?.startsWith(selectedMonth));

          const merged = profiles.map(p => {
            const target = targetMap[p.full_name] || 0;
            const avatar_url = avatarMap[p.full_name] || undefined;
            
            const staffSales = monthSalesFiltered.filter(s => 
              (s.staff_id && p.id && String(s.staff_id) === String(p.id)) ||
              (s.user_id && p.id && String(s.user_id) === String(p.id)) ||
              (s.staff_name && p.full_name && String(s.staff_name).trim().toLowerCase() === String(p.full_name).trim().toLowerCase()) ||
              (s.full_name && p.full_name && String(s.full_name).trim().toLowerCase() === String(p.full_name).trim().toLowerCase())
            );

            const achieved = staffSales.reduce((sum, s) => {
              const amt = Number(s.received_amount) || 0;
              if (s.payment_type === 'Refund') return sum - amt;
              return sum + amt;
            }, 0);
            const salesWorks = staffSales.filter(s => (s.payment_type === 'Advance' || s.payment_type === 'Full') && s.payment_type !== 'Refund').length;

            const staffReports = monthReportsFiltered.filter(r => r.staff_id === p.id);
            let creativeWorks = 0;
            if (p.designation === 'Graphic Designer') {
              creativeWorks = staffReports.reduce((sum, r) => sum + (r.posters_count || 0) + (r.re_edits_count || 0) + (r.logos_count || 0) + (r.others_count || 0), 0);
            } else if (p.designation === 'Digital Marketer') {
              creativeWorks = staffReports.reduce((sum, r) => sum + (r.ads_placed_count || 0), 0);
            } else if (p.designation === 'Videographer') {
              creativeWorks = staffReports.reduce((sum, r) => sum + (r.videos_count || 0), 0);
            } else {
              creativeWorks = staffReports.length;
            }

            const staffAtt = monthAttendanceFiltered.filter(a => a.staff_id === p.id);
            const pCount = staffAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
            const lCount = staffAtt.filter(a => a.status === 'LATE').length;

            return {
              ...p,
              avatar_url,
              monthly_target_amount: target,
              achievedAmount: achieved,
              salesWorksCount: salesWorks,
              creativeWorksCount: creativeWorks,
              attendancePCount: pCount,
              attendanceLCount: lCount,
              attendanceTotalCount: staffAtt.length,
            };
          });

          setStaffProfiles(merged);
        } catch (err) {
          console.error("Error loading admin dashboard data:", err);
        }
      };

      loadAdminDashboardData();
    }
  }, [isAdminView, activeTab, selectedMonth]);

        // Academy revenue computed



  const fetchDailyLeaderboard = async () => {
    try {
      const clientToUse = supabaseAdmin || supabase;

      // 1. Parallel fetch sales, staff, and profiles for instant calculation
      const [salesRes, staffRes, profilesRes] = await Promise.all([
        clientToUse.from('sales').select('*').order('created_at', { ascending: false }).limit(300),
        clientToUse.from('staff').select('id, full_name, avatar_url, designation'),
        clientToUse.from('staff_profiles').select('id, full_name')
      ]);

      const dbSales = salesRes.data || [];
      const staffRows = staffRes.data || [];
      const profiles = profilesRes.data || [];

      const staffMap: { [id: string]: any } = {};
      staffRows.forEach(s => {
        if (s.id) staffMap[s.id] = s;
        if (s.full_name) staffMap[s.full_name] = s;
      });
      profiles.forEach(p => {
        if (p.id) staffMap[p.id] = p;
        if (p.full_name) staffMap[p.full_name] = p;
      });

      let localSales: any[] = [];
      try {
        const stored = localStorage.getItem('company_sales_local_store');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) localSales = parsed;
        }
      } catch (e) {}

      const allMergedSales = [...dbSales, ...(sales || []), ...localSales];
      const deduppedMap = new Map<string, any>();

      allMergedSales.forEach(s => {
        if (s) {
          const key = s.id 
            ? String(s.id) 
            : `${String(s.client_name || s.clientName || '').trim().toLowerCase()}-${Number(s.received_amount || s.amount || 0)}-${String(s.created_at || s.date || '').substring(0, 10)}`;
          if (!deduppedMap.has(key)) {
            deduppedMap.set(key, s);
          }
        }
      });
      const combinedSales = Array.from(deduppedMap.values());

      const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const parseToYYYYMMDD = (item: any): string => {
        if (!item) return '';
        if (item.created_at) {
          try {
            const d = new Date(item.created_at);
            if (!isNaN(d.getTime())) {
              return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            }
          } catch (e) {}
        }
        const val = item.timestamp || item.date || item.sale_date;
        if (val) {
          const str = String(val).trim();
          try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            }
          } catch (e) {}
          const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
          if (match) return match[1];
        }
        return '';
      };

      const todaySales = combinedSales.filter(sale => {
        const itemDate = parseToYYYYMMDD(sale);
        return itemDate === todayIST;
      });

      const collections: { [staffKey: string]: { name: string; amount: number; avatar?: string } } = {};

      todaySales.forEach((sale: any) => {
        const staffObj = sale.staff || staffMap[sale.staff_id] || (sale.staff_name ? staffMap[sale.staff_name] : null);
        const rawName = sale.staff_name || staffObj?.full_name || staffObj?.name || sale.full_name || (sale.staff_id ? staffMap[sale.staff_id]?.full_name : null) || 'Sales Executive';

        const nameUpper = String(rawName).trim().toUpperCase();
        const designationLower = String(staffObj?.designation || '').toLowerCase();

        const isExcludedUserOrRole = 
          nameUpper.includes('SHIBILI') || 
          nameUpper.includes('ASHIF') ||
          designationLower.includes('owner') ||
          designationLower.includes('admin') ||
          designationLower.includes('director') ||
          designationLower.includes('partner');

        if (isExcludedUserOrRole) return;

        const staffKey = sale.staff_id || rawName;
        const recAmount = Number(sale.received_amount !== undefined ? sale.received_amount : (sale.amount || 0));

        if (recAmount <= 0) return;

        if (!collections[staffKey]) {
          collections[staffKey] = {
            name: rawName,
            amount: 0,
            avatar: staffObj?.avatar_url
          };
        }
        collections[staffKey].amount += recAmount;
      });

      const sortedLeaderboard = Object.values(collections)
        ?.filter(item => item.amount > 0)
        ?.sort((a, b) => b.amount - a.amount);

      setDailyLeaderboard(sortedLeaderboard);
    } catch (err) {
      console.error('Error fetching daily leaderboard:', err);
    }
  };

  useEffect(() => {
    fetchDailyLeaderboard();

    const salesChannel = supabase
      .channel('public:sales:leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchDailyLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [selectedMonth]);



  // Fetch Leads Helper
  const fetchLeads = async () => {
    try {
      const designation = activeStaff?.designation;
      if (designation === 'Digital Marketer' || isAdminMode) {
        const { data, error } = await supabase
          .from('leads')
          .select('*, staff(full_name)')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setLeadsList(data);
        }
      } else if (designation === 'Sales Executive' && activeStaff) {
        const { data, error } = await supabase
          .from('leads')
          .select('*, staff(full_name)')
          .eq('assigned_to', activeStaff.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setLeadsList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchSalesStaff = async () => {
    try {
      const { data: profiles } = await supabase
        .from('staff_profiles')
        .select('id, full_name, designation')
        .eq('designation', 'Sales Executive');

      if (profiles) {
        setSalesStaff(profiles);
      }
    } catch (err) {
      console.error('Error fetching sales staff:', err);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) {
      alert('Name and Phone Number are required!');
      return;
    }
    setIsSubmittingLead(true);
    try {
      const { error } = await supabase.from('leads').insert({
        lead_name: newLeadName.trim(),
        location: newLeadLocation.trim(),
        whatsapp_number: newLeadPhone.trim(),
        project_name: newLeadPackage.trim(),
        status: 'New'
      });
      if (error) throw error;
      alert('Lead added successfully!');
      setNewLeadName('');
      setNewLeadLocation('');
      setNewLeadPhone('');
      setNewLeadPackage('');
      fetchLeads();
    } catch (err: any) {
      alert('Failed to add lead: ' + err.message);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r?\n/);
      const leadsToInsert = [];
      
      // Skip the header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 3) {
          leadsToInsert.push({
            lead_name: parts[0]?.trim() || 'Unnamed Lead',
            location: parts[1]?.trim() || '',
            whatsapp_number: parts[2]?.trim() || '',
            project_name: parts[3]?.trim() || '',
            status: 'New'
          });
        }
      }
      
      if (leadsToInsert.length > 0) {
        try {
          const { error } = await supabase.from('leads').insert(leadsToInsert);
          if (error) throw error;
          alert(`Successfully uploaded ${leadsToInsert.length} leads!`);
          fetchLeads();
        } catch (err: any) {
          alert('Upload failed: ' + err.message);
        }
      } else {
        alert('No valid leads found in CSV. Please format as: Name, Location, Phone, Package');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (activeTab === 'leads' && activeStaff) {
      fetchLeads();
      if (activeStaff.designation === 'Digital Marketer' || isAdminMode) {
        fetchSalesStaff();
      }
    }
  }, [activeTab, activeStaff, isAdminMode]);

  if (!activeStaff) return null;
  const isOwner = activeStaff?.designation?.toLowerCase().includes('owner') || false;
    


  useEffect(() => {
    if (isOwner) {
      const fetchOwnerExpenses = async () => {
        try {
          // Fetch from both tables and combine
          const [expensesRes, ownerExpensesRes] = await Promise.all([
            supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
            supabase.from('owner_expenses').select('*').order('expense_date', { ascending: false })
          ]);

          let combinedData = [
            ...(expensesRes.data || []),
            ...(ownerExpensesRes.data || [])
          ];

          // Fetch historical refund sales
          let refundSalesData: any[] = [];
          try {
            const { data: rData } = await supabase
              .from('sales')
              .select('*')
              .eq('payment_type', 'Refund');
            if (rData) refundSalesData = rData;
          } catch (e) {}

          const convertedRefunds = refundSalesData.map((s: any, idx: number) => {
            const sDate = (s.created_at || s.date || s.sale_date || s.sale_month || '').substring(0, 10);
            return {
              id: `converted-refund-${s.id || idx}`,
              sale_id: s.id,
              category: 'Sales Refund',
              description: `Sales Refund - ${s.client_name || 'Client'}${s.notes || s.work_description ? ' (' + (s.notes || s.work_description) + ')' : ''}`,
              amount: Number(s.received_amount) || 0,
              expense_date: sDate,
              created_at: s.created_at || new Date().toISOString(),
              staff_id: s.staff_id,
              staff_name: s.staff_name || s.full_name || 'Sales Staff',
              logged_by_name: s.staff_name || s.full_name || 'Sales Staff'
            };
          });

          const combined = [...combinedData, ...convertedRefunds];
          const uniqueMap = new Map<string, any>();
          
          combined.forEach((item, idx) => {
            if (item) {
              const itemIdStr = String(item.id || '');
              const itemCat = String(item.category || '');
              const itemDateStr = String(item.expense_date || item.date || item.created_at || '').substring(0, 10);
              const itemAmt = Number(item.amount || item.received_amount || 0);

              const isRefundCat = itemCat === 'Sales Refund' || itemCat === 'Return Sales' || itemIdStr.startsWith('converted-refund-');
              let key = item.id ? String(item.id) : `${item.expense_date}-${item.amount}-${item.category}-${idx}`;
              
              if (isRefundCat) {
                const sRef = item.sale_id || (itemIdStr.startsWith('converted-refund-') ? itemIdStr.replace('converted-refund-', '') : '');
                const sStaff = (item.staff_name || item.logged_by_name || item.staff_id || '').toUpperCase();
                key = sRef ? `refund-ref-${sRef}` : `refund-sig-${itemDateStr}-${itemAmt}-${sStaff}`;
              }
              
              if (!uniqueMap.has(key)) uniqueMap.set(key, item);
            }
          });

          setOwnerExpenses(Array.from(uniqueMap.values()).sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()));
        } catch (err) {
          console.warn('Error fetching owner expenses:', err);
        }
      };

      fetchOwnerExpenses();

      const channel = supabase.channel('company-expenses-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          fetchOwnerExpenses();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_expenses' }, () => {
          fetchOwnerExpenses();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
          fetchOwnerExpenses();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOwner, selectedMonth]);





  const handleViewSlip = (sale: any) => {
    const targetUrl = sale.payment_proof_url || sale.slip_url || sale.payment_proof || sale.proof_url;
    if (targetUrl) {
      setSelectedSlipUrl(targetUrl);
    } else {
      alert('No payment proof slip was uploaded for this transaction.');
    }
  };




  // Staff profile history select

  




  const handleUpdateDailyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setIsUpdatingReport(true);
    try {
      const designation = isAdminView ? staffProfiles.find((s: any) => s.id === editingReport.staff_id)?.designation : activeStaff?.designation;
      let updatePayload: any = {
        description: editReportDesc.trim()
      };

      if (designation === 'Graphic Designer') {
        const pCount = Number(editReportPosters) || 0;
        const rCount = Number(editReportReEdits) || 0;
        const lCount = Number(editReportLogos) || 0;
        const oCount = Number(editReportOthers) || 0;
        updatePayload = {
          ...updatePayload,
          posters_count: pCount,
          re_edits_count: rCount,
          logos_count: lCount,
          others_count: oCount,
          description: editReportDesc.trim() || `Posters: ${pCount}, Re-edits: ${rCount}, Logos: ${lCount}, Others: ${oCount}`
        };
      } else if (designation === 'Digital Marketer') {
        const apCount = Number(editReportAdsPlaced) || 0;
        updatePayload = {
          ...updatePayload,
          ads_placed_count: apCount,
          description: editReportDesc.trim() || `Ads Placed: ${apCount}`
        };
      } else if (designation === 'Videographer') {
        const vCount = Number(editVideoCount) || 0;
        const tExp = Number(editVideoTravelExpense) || 0;
        updatePayload = {
          ...updatePayload,
          work_category: editVideoWorkCategory,
          client_name: editVideoClientName,
          videos_count: vCount,
          travel_expense: tExp,
          description: editReportDesc.trim() || `${editVideoWorkCategory}: ${vCount} videos, Travel: ${formatCurrency(tExp)}`
        };
      }

      const { error } = await supabase
        .from('daily_reports')
        .update(updatePayload)
        .eq('id', editingReport.id);

      if (error) throw error;

      alert('Daily report updated successfully!');
      setEditingReport(null);
      
      if (activeStaff) {
        await fetchDashboardData(activeStaff.id);
      }
    } catch (err: any) {
      alert('Failed to update report log: ' + err.message);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResetStaff || !newResetPassword.trim()) return;

    setIsResettingPassword(true);
    try {
      const res = await resetStaffAuthPassword(selectedResetStaff, newResetPassword);
      if (!res.success) {
        alert(res.message || 'Failed to reset password.');
        return;
      }

      alert(res.message);
      setNewResetPassword('');
      setSelectedResetStaff('');
      setIsSettingsOpen(false);
      dataCache.clearAll();
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // CSV Closing Reports generators extracted to ClosingReportModal

  // Helper to check designation type
  const isCreativeRole = activeStaff && (
    activeStaff.designation === 'Graphic Designer' ||
    activeStaff.designation === 'Digital Marketer' ||
    activeStaff.designation === 'Content Creator' ||
    activeStaff.designation === 'Videographer'
  );

  // Filter sales for the selected month
  const monthSales = useMemo(() => {
    return sales?.filter(s => {
      if (!s.created_at) {
        const [year, month] = selectedMonth.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        const name = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        return s.sale_month === name;
      }
      return s.created_at.startsWith(selectedMonth);
    });
  }, [sales, selectedMonth]);

  // Filter owner's personal sales for their personal Sales History view
  const ownerPersonalSales = useMemo(() => {
    if (!activeStaff) return [];
    return (sales || []).filter((s: any) => 
      s.staff_id === activeStaff.id || 
      (s.staff_name && activeStaff.full_name && String(s.staff_name).toLowerCase() === activeStaff.full_name.toLowerCase()) ||
      (s.full_name && activeStaff.full_name && String(s.full_name).toLowerCase() === activeStaff.full_name.toLowerCase())
    );
  }, [sales, activeStaff]);

  {/* Main Content Area */}
  const monthReports = useMemo(() => {
    return dailyReports?.filter(r => r.report_date && r.report_date.startsWith(selectedMonth));
  }, [dailyReports, selectedMonth]);

  // Owner personal monthly sales calculations for their terminal cards
  const ownerMonthSales = useMemo(() => {
    return ownerPersonalSales.filter((s: any) => {
      if (!s) return false;
      const rawDate = s.created_at || s.date || s.sale_date || s.timestamp;
      if (rawDate) {
        const dStr = String(rawDate).trim();
        if (dStr.startsWith(selectedMonth)) return true;
        try {
          const dObj = new Date(rawDate);
          if (!isNaN(dObj.getTime())) {
            const y = dObj.getFullYear();
            const m = String(dObj.getMonth() + 1).padStart(2, '0');
            if (`${y}-${m}` === selectedMonth) return true;
          }
        } catch (e) {}
      }
      if (s.sale_month && selectedMonth) {
        try {
          const [year, month] = selectedMonth.split('-');
          const date = new Date(Number(year), Number(month) - 1, 1);
          const name = date.toLocaleString('default', { month: 'long', year: 'numeric' });
          if (String(s.sale_month).toLowerCase() === name.toLowerCase()) return true;
        } catch (e) {}
      }
      return false;
    });
  }, [ownerPersonalSales, selectedMonth]);

  const ownerTotalPackage = useMemo(() => {
    return ownerMonthSales?.filter((s: any) => s.payment_type !== 'Clearance' && s.payment_type !== 'Refund').reduce((sum: number, s: any) => sum + (Number(s.package_amount) || 0), 0);
  }, [ownerMonthSales]);

  const ownerTotalRefund = useMemo(() => {
    return ownerMonthSales?.filter((s: any) => s.payment_type === 'Refund').reduce((sum: number, s: any) => sum + (Number(s.received_amount) || 0), 0);
  }, [ownerMonthSales]);

  const ownerGrossReceived = useMemo(() => {
    return ownerMonthSales?.filter((s: any) => s.payment_type !== 'Refund').reduce((sum: number, s: any) => sum + (Number(s.received_amount) || 0), 0);
  }, [ownerMonthSales]);

  const ownerTotalReceived = useMemo(() => {
    return ownerGrossReceived - ownerTotalRefund;
  }, [ownerGrossReceived, ownerTotalRefund]);

  const ownerTotalBalance = useMemo(() => {
    return ownerMonthSales?.filter((s: any) => s.payment_type !== 'Clearance' && s.payment_type !== 'Refund').reduce((sum: number, s: any) => sum + Math.max(0, (Number(s.package_amount) || 0) - (Number(s.received_amount) || 0)), 0);
  }, [ownerMonthSales]);

  // Financial math for cards (filtered by month)
  const totalPackage = monthSales?.filter(s => s.payment_type !== 'Clearance' && s.payment_type !== 'Refund').reduce((sum, s) => sum + (s.package_amount || 0), 0);
  const totalRefund = monthSales?.filter(s => s.payment_type === 'Refund').reduce((sum, s) => sum + (s.received_amount || 0), 0);
  const grossReceived = monthSales?.filter(s => s.payment_type !== 'Refund').reduce((sum, s) => sum + (s.received_amount || 0), 0);
  const totalReceived = grossReceived - totalRefund;
  const totalBalance = monthSales?.filter(s => s.payment_type !== 'Clearance' && s.payment_type !== 'Refund').reduce((sum, s) => sum + Math.max(0, (s.package_amount || 0) - (s.received_amount || 0)), 0);

  const resolveStaffMonthTarget = (staffObj: any, monthKey: string) => {
    if (!staffObj) return 0;

    let targetsObj: any = null;
    if (staffObj.monthly_targets) {
      try {
        targetsObj = typeof staffObj.monthly_targets === 'string'
          ? JSON.parse(staffObj.monthly_targets)
          : staffObj.monthly_targets;
      } catch (e) {
        targetsObj = null;
      }
    }

    if (targetsObj && typeof targetsObj === 'object') {
      if (targetsObj[monthKey] !== undefined && targetsObj[monthKey] !== null) {
        return Number(targetsObj[monthKey]) || 0;
      }
      return 0;
    }

    return Number(staffObj.monthly_target_amount) || 0;
  };

  // Sync activeStaff monthly targets from Supabase on month change
  useEffect(() => {
    if (!activeStaff?.id) return;
    const syncActiveStaffTargets = async () => {
      try {
        const { data } = await supabase
          .from('staff')
          .select('monthly_targets, monthly_target_amount')
          .eq('id', activeStaff.id)
          .maybeSingle();

        if (data) {
          if (data.monthly_targets) activeStaff.monthly_targets = data.monthly_targets;
          if (data.monthly_target_amount) activeStaff.monthly_target_amount = Number(data.monthly_target_amount);
        }
      } catch (err) {
        console.warn('Sync activeStaff targets info:', err);
      }
    };
    syncActiveStaffTargets();
  }, [activeStaff?.id, selectedMonth]);

  // Targets (month-specific resolution)
  const targetAmount = useMemo(() => {
    return resolveStaffMonthTarget(activeStaff, selectedMonth);
  }, [activeStaff, activeStaff?.monthly_targets, selectedMonth]);

  const targetPercent = targetAmount > 0 ? Math.min(100, Math.round((totalReceived / targetAmount) * 100)) : 0;
  const ownerTargetPercent = targetAmount > 0 ? Math.min(100, Math.round((ownerTotalReceived / targetAmount) * 100)) : 0;




  // Filter selected profile's daily reports for the selected month



  // Generate chronological serials and map Work SL
  const computedMonthSales = useMemo(() => {
    const sorted = [...monthSales]?.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    let runningSl = 0;
    const mapped = sorted?.map(sale => {
      let workSl = '-';
      if (sale.payment_type === 'Advance' || sale.payment_type === 'Full') {
        runningSl += 1;
        workSl = String(runningSl);
      }
      return {
        ...sale,
        work_sl: workSl
      };
    });
    return mapped.reverse();
  }, [monthSales]);

  // Filter Sales list (For staff view)
  const filteredSales = useMemo(() => {
    return computedMonthSales || [];
  }, [computedMonthSales]);

  // Daily reports totals calculator helper
  const getDailyReportTotals = (reportsList: any[]) => {
    let totalPosters = 0;
    let totalReEdits = 0;
    let totalLogos = 0;
    let totalOthers = 0;
    let totalAdsPlaced = 0;
    let totalAgencyVideos = 0;
    let totalAcademyVideos = 0;
    let totalExternalVideos = 0;
    let totalTravelExpenses = 0;
    reportsList.forEach(r => {
      totalPosters += r.posters_count || 0;
      totalReEdits += r.re_edits_count || 0;
      totalLogos += r.logos_count || 0;
      totalOthers += r.others_count || 0;
      totalAdsPlaced += r.ads_placed_count || 0;
      
      const cat = r.work_category;
      const vCount = r.videos_count || 0;
      if (cat === 'Tech Ads Agency') {
        totalAgencyVideos += vCount;
      } else if (cat === 'Tech Ads Academy') {
        totalAcademyVideos += vCount;
      } else if (cat === 'External Client') {
        totalExternalVideos += vCount;
      }
      totalTravelExpenses += Number(r.travel_expense) || 0;
    });
    return { 
      totalPosters, 
      totalReEdits, 
      totalLogos, 
      totalOthers, 
      totalAdsPlaced,
      totalAgencyVideos,
      totalAcademyVideos,
      totalExternalVideos,
      totalTravelExpenses
    };
  };

  // Unique Serial mappings
  const sortedRawSales = [...sales]?.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const slMap: { [id: string]: string } = {};
  sortedRawSales.forEach((s, idx) => {
    slMap[s.id] = `SL-${String(idx + 1).padStart(3, '0')}`;
  });



  // Generate month options for dropdown
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month}`, label });
      date.setMonth(date.getMonth() - 1);
    }
    return options;
  };

  // Render Role-specific Daily Reports Table and Metric Cards
  const renderDailyReportsTable = (reportsList: any[], showActions: boolean = false) => {
    const designation = activeStaff?.designation;
    let totals = getDailyReportTotals(reportsList);
    
    if (designation === 'Videographer') {
      const filteredReports = videoFilter === 'All'
        ? reportsList
        : reportsList?.filter(r => r.work_category === videoFilter);
      totals = getDailyReportTotals(filteredReports);
      return (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-slate-455 uppercase block">Total Agency Videos</span>
              <p className="text-sm font-extrabold text-white mt-1">{totals.totalAgencyVideos}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-indigo-500 uppercase block">Total Academy Videos</span>
              <p className="text-sm font-extrabold text-indigo-400 mt-1">{totals.totalAcademyVideos}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-emerald-500 uppercase block">Total External Videos</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{totals.totalExternalVideos}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-purple-500 uppercase block">Total Travel Expenses</span>
              <p className="text-sm font-extrabold text-purple-400 mt-1">{formatCurrency(totals.totalTravelExpenses)}</p>
            </Card>
          </div>

          {/* Quick filter button group */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            {(['All', 'Tech Ads Agency', 'Tech Ads Academy', 'External Client'] as const)?.map(filterVal => {
              const labelMap = {
                All: 'All Videos',
                'Tech Ads Agency': 'Agency Videos',
                'Tech Ads Academy': 'Academy Videos',
                'External Client': 'External Videos'
              };
              return (
                <button
                  key={filterVal}
                  onClick={() => setVideoFilter(filterVal)}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    videoFilter === filterVal 
                      ? 'bg-indigo-600 text-white border border-indigo-500/20 shadow-md shadow-indigo-650/20' 
                      : 'bg-slate-900/60 text-slate-400 border border-white/5 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {labelMap[filterVal]}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4 text-center">Videos Count</th>
                  <th className="py-3 px-4 text-right">Travel Expense</th>
                  <th className="py-3 px-4 text-left">Description</th>
                  {showActions && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {filteredReports?.map(r => (
                  <tr key={r.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4 text-slate-500">{r.report_date}</td>
                    <td className="py-3 px-4 font-bold text-indigo-400">{r.work_category || '-'}</td>
                    <td className="py-3 px-4 text-white font-bold">{r.client_name || '-'}</td>
                    <td className="py-3 px-4 text-center text-white">{r.videos_count || 0}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(Number(r.travel_expense) || 0)}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                    {showActions && (
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => {
                            setEditingReport(r);
                            setEditVideoWorkCategory(r.work_category || 'Tech Ads Agency');
                            setEditVideoClientName(r.client_name || 'Tech Ads');
                            setEditVideoCount(String(r.videos_count || 0));
                            setEditVideoTravelExpense(String(r.travel_expense || 0));
                            setEditReportDesc(r.description || '');
                          }}
                          className="!py-1 !px-2 text-[10px] border-white/5 text-indigo-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={showActions ? 7 : 6} className="text-center py-8 text-slate-655 font-semibold">No video logs recorded.</td>
                  </tr>
                )}
              </tbody>
              {filteredReports.length > 0 && (
                <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                  <tr>
                    <td className="py-3.5 px-4 text-slate-400 text-left uppercase text-[9px]">Totals:</td>
                    <td></td>
                    <td></td>
                    <td className="py-3.5 px-4 text-center">{totals.totalAgencyVideos + totals.totalAcademyVideos + totals.totalExternalVideos}</td>
                    <td className="py-3.5 px-4 text-right text-purple-400">{formatCurrency(totals.totalTravelExpenses)}</td>
                    <td></td>
                    {showActions && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Edit form overlay inline */}
          {editingReport && editingReport.work_type === 'Video Work' && (
            <Card variant="glass" className="p-4 border-indigo-500/20 bg-slate-950/40 mt-3 max-w-md space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Override Video Log</h4>
              <form onSubmit={handleUpdateDailyReport} className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Work Category</label>
                  <select
                    value={editVideoWorkCategory}
                    onChange={(e) => {
                      setEditVideoWorkCategory(e.target.value);
                      if (e.target.value !== 'External Client') {
                        setEditVideoClientName('Tech Ads');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Tech Ads Agency">Tech Ads Agency</option>
                    <option value="Tech Ads Academy">Tech Ads Academy</option>
                    <option value="External Client">External Client</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Client/Company Name</label>
                  <input 
                    type="text" 
                    required
                    disabled={editVideoWorkCategory !== 'External Client'}
                    value={editVideoClientName}
                    onChange={(e) => setEditVideoClientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Number of Videos</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={editVideoCount}
                    onChange={(e) => setEditVideoCount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Travel Expense (₹)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={editVideoTravelExpense}
                    onChange={(e) => setEditVideoTravelExpense(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Work Description</label>
                  <textarea 
                    rows={2}
                    value={editReportDesc}
                    onChange={(e) => setEditReportDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2 items-end pt-2 col-span-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingReport(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isUpdatingReport}>Save</Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      );
    }

    if (designation === 'Graphic Designer') {
      return (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-slate-455 uppercase block">Total Posters</span>
              <p className="text-sm font-extrabold text-white mt-1">{totals.totalPosters}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-indigo-500 uppercase block">Total Re-edits</span>
              <p className="text-sm font-extrabold text-indigo-400 mt-1">{totals.totalReEdits}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-emerald-500 uppercase block">Total Logos</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{totals.totalLogos}</p>
            </Card>
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-purple-500 uppercase block">Total Others</span>
              <p className="text-sm font-extrabold text-purple-400 mt-1">{totals.totalOthers}</p>
            </Card>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Posters</th>
                  <th className="py-3 px-4 text-center">Re-edits</th>
                  <th className="py-3 px-4 text-center">Logos</th>
                  <th className="py-3 px-4 text-center">Others</th>
                  <th className="py-3 px-4 text-left">Notes</th>
                  {showActions && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {reportsList?.map(r => (
                  <tr key={r.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4 text-slate-500">{r.report_date}</td>
                    <td className="py-3 px-4 text-center text-white font-bold">{r.posters_count || 0}</td>
                    <td className="py-3 px-4 text-center text-indigo-400">{r.re_edits_count || 0}</td>
                    <td className="py-3 px-4 text-center text-emerald-400">{r.logos_count || 0}</td>
                    <td className="py-3 px-4 text-center text-purple-400">{r.others_count || 0}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                    {showActions && (
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => {
                            setEditingReport(r);
                            setEditReportPosters(String(r.posters_count || 0));
                            setEditReportReEdits(String(r.re_edits_count || 0));
                            setEditReportLogos(String(r.logos_count || 0));
                            setEditReportOthers(String(r.others_count || 0));
                            setEditReportDesc(r.description || '');
                          }}
                          className="!py-1 !px-2 text-[10px] border-white/5 text-indigo-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {reportsList.length === 0 && (
                  <tr>
                    <td colSpan={showActions ? 7 : 6} className="text-center py-8 text-slate-655 font-semibold">No design logs recorded.</td>
                  </tr>
                )}
              </tbody>
              {reportsList.length > 0 && (
                <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                  <tr>
                    <td className="py-3.5 px-4 text-slate-400 text-left uppercase text-[9px]">Totals:</td>
                    <td className="py-3.5 px-4 text-center">{totals.totalPosters}</td>
                    <td className="py-3.5 px-4 text-center text-indigo-400">{totals.totalReEdits}</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">{totals.totalLogos}</td>
                    <td className="py-3.5 px-4 text-center text-purple-400">{totals.totalOthers}</td>
                    <td></td>
                    {showActions && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Edit form overlay inline */}
          {editingReport && editingReport.work_type === 'Graphic Design' && (
            <Card variant="glass" className="p-4 border-indigo-500/20 bg-slate-950/40 mt-3 max-w-md space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Override Design Log</h4>
              <form onSubmit={handleUpdateDailyReport} className="grid grid-cols-4 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Posters</label>
                  <input 
                    type="number" 
                    required
                    value={editReportPosters}
                    onChange={(e) => setEditReportPosters(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Re-edits</label>
                  <input 
                    type="number" 
                    required
                    value={editReportReEdits}
                    onChange={(e) => setEditReportReEdits(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Logos</label>
                  <input 
                    type="number" 
                    required
                    value={editReportLogos}
                    onChange={(e) => setEditReportLogos(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Others</label>
                  <input 
                    type="number" 
                    required
                    value={editReportOthers}
                    onChange={(e) => setEditReportOthers(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1 col-span-4">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Description / Notes</label>
                  <textarea 
                    rows={2}
                    value={editReportDesc}
                    onChange={(e) => setEditReportDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2 items-end pt-2 col-span-4">
                  <Button variant="secondary" size="sm" onClick={() => setEditingReport(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isUpdatingReport}>Save</Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      );
    }

    if (designation === 'Digital Marketer') {
      return (
        <div className="space-y-4">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            <Card variant="glass" className="p-3.5 border-white/5">
              <span className="text-[9px] font-bold text-emerald-500 uppercase block">Total Ads Placed</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">{totals.totalAdsPlaced}</p>
            </Card>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Ads Placed</th>
                  <th className="py-3 px-4 text-left">Notes</th>
                  {showActions && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {reportsList?.map(r => (
                  <tr key={r.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4 text-slate-500">{r.report_date}</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.ads_placed_count || 0}</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                    {showActions && (
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => {
                            setEditingReport(r);
                            setEditReportAdsPlaced(String(r.ads_placed_count || 0));
                            setEditReportDesc(r.description || '');
                          }}
                          className="!py-1 !px-2 text-[10px] border-white/5 text-indigo-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {reportsList.length === 0 && (
                  <tr>
                    <td colSpan={showActions ? 4 : 3} className="text-center py-8 text-slate-655 font-semibold">No ad placement logs recorded.</td>
                  </tr>
                )}
              </tbody>
              {reportsList.length > 0 && (
                <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                  <tr>
                    <td className="py-3.5 px-4 text-slate-400 text-left uppercase text-[9px]">Totals:</td>
                    <td className="py-3.5 px-4 text-center text-emerald-400">{totals.totalAdsPlaced}</td>
                    <td></td>
                    {showActions && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Edit form overlay inline */}
          {editingReport && editingReport.work_type === 'Digital Marketing' && (
            <Card variant="glass" className="p-4 border-indigo-500/20 bg-slate-950/40 mt-3 max-w-xs space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Override Marketing Log</h4>
              <form onSubmit={handleUpdateDailyReport} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Ads Placed</label>
                  <input 
                    type="number" 
                    required
                    value={editReportAdsPlaced}
                    onChange={(e) => setEditReportAdsPlaced(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Description / Notes</label>
                  <textarea 
                    rows={2}
                    value={editReportDesc}
                    onChange={(e) => setEditReportDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="flex gap-2 items-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingReport(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isUpdatingReport}>Save</Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      );
    }

    // Fallback for general logs
    return (
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Task Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
            {reportsList?.map((report: any) => (
              <tr key={report.id} className="hover:bg-slate-900/10">
                <td className="py-3 px-4 text-slate-500">{report.report_date}</td>
                <td className="py-3 px-4 font-bold text-indigo-400">{report.work_type}</td>
                <td className="py-3 px-4 text-slate-400 max-w-sm truncate" title={report.description}>{report.description}</td>
              </tr>
            ))}
            {reportsList.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-slate-600 font-semibold">No daily logs recorded for this month.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col lg:flex-row relative w-full overflow-x-hidden">
      
      {/* Dynamic background lighting */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-500/10 dark:bg-indigo-900/15 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-purple-500/5 dark:bg-purple-900/10 blur-[130px] pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-32 md:pb-12">
        
        {/* Header */}
        <header className="glass-panel sticky top-14 lg:top-0 z-30 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle_mobile_sidebar'))}
                  className="lg:hidden p-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0"
                  title="Open Navigation Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-xs sm:text-sm md:text-lg font-bold text-slate-900 dark:text-white tracking-wide truncate">
                  {isAdminView ? 'Admin Control Dashboard' :  'Consultant Sales Terminal'}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 rounded-xl bg-slate-900 border border-white/10 text-[11px] sm:text-xs font-bold text-slate-350 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {getMonthOptions()?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={toggleTheme}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-white/10 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              {isAdminView && (
                <Button 
                  variant="glass" 
                  size="sm" 
                  className="!py-1.5 !px-2.5 sm:!py-2 sm:!px-3 border border-indigo-500/20 hover:bg-slate-800 text-[11px] sm:text-xs font-bold text-indigo-400 flex items-center gap-1 shrink-0" 
                  onClick={() => setIsClosingReportOpen(true)}
                >
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Closing Reports</span>
                </Button>
              )}

              {(!isAdminView || isOwner) && activeStaff?.designation !== 'Graphic Designer' && activeStaff?.designation !== 'Digital Marketer' && activeStaff?.designation !== 'Videographer' && (
                <button
                  onClick={() => setIsRefundModalOpen(true)}
                  className="!py-1.5 !px-2.5 sm:!py-2 sm:!px-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-[11px] sm:text-xs shadow-md shadow-rose-500/20 rounded-xl flex items-center gap-1 shrink-0 transition-all border border-rose-400/20 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Refund</span>
                </button>
              )}

              {!isAdminView && !isOwner && activeStaff?.designation !== 'Graphic Designer' && activeStaff?.designation !== 'Digital Marketer' && activeStaff?.designation !== 'Videographer' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="!py-1.5 !px-2.5 sm:!py-2 sm:!px-3 shadow-md rounded-xl text-[11px] sm:text-xs font-bold shrink-0 animate-pulse" 
                  onClick={() => setIsModalOpen(true)}
                  icon={<Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                >
                  Log Sale
                </Button>
              )}

              {isOwner && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="!py-1.5 !px-2.5 sm:!py-2 sm:!px-3 shadow-md rounded-xl text-[11px] sm:text-xs font-bold shrink-0 animate-pulse" 
                  onClick={() => setIsModalOpen(true)}
                  icon={<Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                >
                  Log Transaction
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 md:px-8 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <SalesDashboardMetrics 
                isAdminView={isAdminView}
                activeStaff={activeStaff}
                isOwner={isOwner}
                dailyLeaderboard={dailyLeaderboard}
                todayAttendanceStats={todayAttendanceStats}
                academyRevenue={academyRevenue}
                totalReceived={isOwner && !isAdminView ? ownerTotalReceived : totalReceived}
                totalPackage={isOwner && !isAdminView ? ownerTotalPackage : totalPackage}
                totalBalance={isOwner && !isAdminView ? ownerTotalBalance : totalBalance}
                totalRefund={isOwner && !isAdminView ? ownerTotalRefund : totalRefund}
                targetAmount={targetAmount}
                targetPercent={isOwner && !isAdminView ? ownerTargetPercent : targetPercent}
                todayAttendance={todayAttendance}
                monthReports={monthReports}
                selectedMonth={selectedMonth}
                formatTimeStr={formatTimeStr}
                onOpenPunchModal={(type) => {
                  setPunchType(type);
                  setIsPunchModalOpen(true);
                }}
                getDailyReportTotals={getDailyReportTotals}
              />

              {/* Agency Notice Board Widget placed ONLY at the bottom of Sales Hub main tab */}
              <div className="pt-4 border-t border-white/5">
                <AgencyNoticeBoardWidget 
                  isAdmin={isAdminView || isAdminMode}
                  onOpenAdminNoticeModal={() => setIsNoticeBoardModalOpen(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'staff-history' && isAdminView && (
            <div className="space-y-6 pt-2">
              <StaffHistoryTab staffProfiles={staffProfiles} selectedMonth={selectedMonth} />
            </div>
          )}

          {activeTab === 'attendance' && activeStaff && (
            <div className="space-y-6 pt-2">
              <AttendanceDashboard 
                staffId={activeStaff.id}
                fullName={activeStaff.full_name}
                designation={activeStaff.designation || 'Staff'}
                gender={activeStaff.gender || 'Male'}
                avatarUrl={activeStaff.avatar_url || null}
                isAdmin={false}
              />
            </div>
          )}

          {activeTab === 'history' && (
            isOwner ? (
              <div className="space-y-6 pt-2">
                <SalesHistoryLog 
                  sales={ownerMonthSales} 
                  targetAmount={targetAmount} 
                  isAdmin={false} 
                  hideTargetProgress={false}
                  onViewSlip={handleViewSlip} 
                />
              </div>
            ) : (
              <DailyWorkLoggingTab
                isCreativeRole={isCreativeRole}
                activeStaff={activeStaff}
                selectedMonth={selectedMonth}
                monthReports={monthReports}
                filteredSales={filteredSales}
                targetAmount={targetAmount}
                dailyWorkType={dailyWorkType}
                setDailyWorkType={setDailyWorkType}
                dailyWorkDesc={dailyWorkDesc}
                setDailyWorkDesc={setDailyWorkDesc}
                isSubmittingReport={isSubmittingReport}
                setIsSubmittingReport={setIsSubmittingReport}
                postersCount={postersCount}
                setPostersCount={setPostersCount}
                reEditsCount={reEditsCount}
                setReEditsCount={setReEditsCount}
                logosCount={logosCount}
                setLogosCount={setLogosCount}
                othersCount={othersCount}
                setOthersCount={setOthersCount}
                adsPlacedCount={adsPlacedCount}
                setAdsPlacedCount={setAdsPlacedCount}
                videoWorkCategory={videoWorkCategory}
                setVideoWorkCategory={setVideoWorkCategory}
                videoClientName={videoClientName}
                setVideoClientName={setVideoClientName}
                videoCount={videoCount}
                setVideoCount={setVideoCount}
                videoTravelExpense={videoTravelExpense}
                setVideoTravelExpense={setVideoTravelExpense}
                addDailyReport={addDailyReport}
                renderDailyReportsTable={renderDailyReportsTable}
                handleViewSlip={handleViewSlip}
              />
            )
          )}

          {activeTab === 'expense_history' && (
            <ExpenseHistoryTab
              activeTab={activeTab}
              isOwner={isOwner}
              computedMonthSales={computedMonthSales}
              ownerExpenses={ownerExpenses}
              selectedMonth={selectedMonth}
            />
          )}

          {activeTab === 'leads' && activeStaff && (
            <LeadsTab
              activeStaff={activeStaff}
              leadsList={leadsList}
              salesStaff={salesStaff}
              newLeadName={newLeadName}
              setNewLeadName={setNewLeadName}
              newLeadLocation={newLeadLocation}
              setNewLeadLocation={setNewLeadLocation}
              newLeadPhone={newLeadPhone}
              setNewLeadPhone={setNewLeadPhone}
              newLeadPackage={newLeadPackage}
              setNewLeadPackage={setNewLeadPackage}
              isSubmittingLead={isSubmittingLead}
              handleAddLead={handleAddLead}
              handleCsvUpload={handleCsvUpload}
              fetchLeads={fetchLeads}
            />
          )}

          {activeTab === 'reports' && (
            <DailyReportsTab monthReports={monthReports} />
          )}

        </main>
      </div>

      {/* DASHBOARD MODALS CONTAINER */}
      <SalesDashboardModals
        isClosingReportOpen={isClosingReportOpen}
        onCloseClosingReport={() => setIsClosingReportOpen(false)}
        isModalOpen={isModalOpen}
        onCloseLogSaleModal={() => setIsModalOpen(false)}
        isOwner={isOwner}
        activeStaff={activeStaff}
        addSale={addSale}
        onExpenseLogged={() => fetchDashboardData(activeStaff.id)}
        isPunchModalOpen={isPunchModalOpen}
        onClosePunchModal={() => setIsPunchModalOpen(false)}
        punchType={punchType}
        punchIn={punchIn}
        punchOut={punchOut}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        isAdminMode={isAdminMode}
        staffProfiles={staffProfiles}
        selectedResetStaff={selectedResetStaff}
        setSelectedResetStaff={setSelectedResetStaff}
        newResetPassword={newResetPassword}
        setNewResetPassword={setNewResetPassword}
        isResettingPassword={isResettingPassword}
        handleResetPassword={handleResetPassword}
        enlargedSelfie={enlargedSelfie}
        onCloseSelfieLightbox={() => setEnlargedSelfie(null)}
      />

      {/* IN-SCREEN SLIP VIEWER MODAL */}
      {selectedSlipUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedSlipUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSlipUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={selectedSlipUrl} 
              alt="Payment Proof Slip" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      )}
      {/* REFUND MODAL */}
      <LogRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        activeStaff={activeStaff}
        onRefundLogged={() => fetchDashboardData(selectedMonth)}
      />

      {/* NOTICE BOARD ADMIN MODAL */}
      {isNoticeBoardModalOpen && (
        <NoticeBoardAdminModal
          staffId={activeStaff?.id}
          onClose={() => setIsNoticeBoardModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SalesDashboard;