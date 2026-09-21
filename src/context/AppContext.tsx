import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Staff, Sale, Attendance, DailyReport } from '../types';
import { supabase, supabaseAdmin, SALES_COLUMNS, monthWindowStart } from '../services/supabase';
import { formatStaffEmail, ensureStaffAuthUser, normalizePassword } from '../services/staffAuth';
import { dataCache } from '../services/dataCache';
import { extensionForBlob } from '../utils/imageUtils';

interface AppContextType {
  activeStaff: Staff | null;
  sales: Sale[];
  attendance: Attendance[];
  dailyReports: DailyReport[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  addSale: (saleData: { 
    clientName: string; 
    servicePackage: string; 
    paymentType: 'Full' | 'Advance' | 'Clearance'; 
    packageAmount: number; 
    receivedAmount: number;
    paymentMethod?: string;
    paymentProofUrl?: string;
    workDescription?: string;
  }) => Promise<void>;
  addDailyReport: (reportData: {
    workType: string;
    description: string;
    reportDate?: string;
    postersCount?: number;
    reEditsCount?: number;
    logosCount?: number;
    othersCount?: number;
    adsPlacedCount?: number;
    workCategory?: string;
    clientName?: string;
    videosCount?: number;
    travelExpense?: number;
  }) => Promise<void>;
  punchIn: (selfieUrl?: string, lat?: number, lng?: number, status?: string) => Promise<void>;
  punchOut: (status?: string) => Promise<void>;
  todayAttendance: Attendance | null;
  isLoading: boolean;
  dbError: string | null;
  activeTab: 'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets';
  setActiveTab: (tab: 'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets') => void;
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateAvatar: (avatarBlob: Blob) => Promise<void>;
  fetchDashboardData: (staffId: string) => Promise<void>;
}

/**
 * URL path for each tab. The app renders from a single `activeTab` value, so
 * the router is just a two-way binding between that value and location.pathname:
 * every view gets a real, linkable URL and browser back/forward works.
 */
const TAB_PATHS: Record<string, string> = {
  sales: '/sales',
  history: '/sales-history',
  'staff-history': '/staff-history',
  expense_history: '/expense-history',
  reports: '/reports',
  attendance: '/attendance',
  assets: '/assets',
  leads: '/leads',
  staff: '/staff',
  finance: '/finance',
  withdrawals: '/withdrawals',
  academy_overview: '/academy',
  academy_batches: '/academy/batches',
  academy_students: '/academy/students',
  academy_attendance: '/academy/attendance',
  academy_finances: '/academy/finances',
  academy_staff: '/academy/staff',
};

const PATH_TABS: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab])
);

const DEFAULT_TAB = 'sales';

const tabForPath = (pathname: string): string => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PATH_TABS[clean] || DEFAULT_TAB;
};

/**
 * Cache keys each realtime-synced table feeds, so a write invalidates only the
 * entries that actually depend on it. Previously every event called
 * dataCache.clearAll(), which discarded unrelated cached queries and forced
 * every open dashboard to refetch everything.
 */
const CACHE_KEYS_BY_TABLE: Record<string, string[]> = {
  sales: ['profile_details_*', 'finance_ledger_*', 'admin_dashboard_summaries_*'],
  staff: ['grid_targets_*', 'profile_details_*', 'admin_attendance_month_*', 'admin_dashboard_summaries_*'],
  staff_profiles: ['admin_attendance_month_*', 'admin_dashboard_summaries_*'],
  attendance: ['attendance_drill_*', 'admin_attendance_month_*', 'admin_dashboard_summaries_*'],
  expenses: ['finance_ledger_*', 'profile_details_*'],
  owner_expenses: ['finance_ledger_*', 'profile_details_*'],
};

/**
 * Drop only the cache entries the named tables feed.
 *
 * Write paths must call this rather than dataCache.clearAll(): clearing
 * everything makes an unrelated dashboard refetch its whole dataset the next
 * time it renders, which is the single largest source of avoidable egress.
 */
export const invalidateTables = (...tables: string[]): void => {
  tables.forEach((table) => {
    (CACHE_KEYS_BY_TABLE[table] || []).forEach((key) => dataCache.invalidate(key));
  });
};

type RealtimePayload = { eventType: string; new: any; old: any };

/**
 * Apply a realtime row change to a list already held in state.
 *
 * The payload carries the full row, so reacting to an event costs no egress at
 * all. UPDATE merges over the existing entry instead of replacing it so fields
 * the initial fetch joined in (e.g. `sales.staff(full_name)`) survive; an
 * INSERT arrives without those joins, which is why nothing renders straight off
 * these arrays -- see the note on `sales` in the provider.
 */
const mergeRealtimeRow = <T extends { id?: any }>(
  setRows: React.Dispatch<React.SetStateAction<T[]>>,
  payload: RealtimePayload
): void => {
  setRows((prev) => {
    if (payload.eventType === 'DELETE') {
      const removedId = payload.old?.id;
      return removedId ? prev.filter((row) => row.id !== removedId) : prev;
    }

    const incoming = payload.new as T;
    if (!incoming?.id) return prev;

    const index = prev.findIndex((row) => row.id === incoming.id);
    if (index === -1) return [incoming, ...prev];

    const next = [...prev];
    next[index] = { ...next[index], ...incoming };
    return next;
  });
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStaff, setActiveStaff] = useState<Staff | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets'>(
    () => tabForPath(window.location.pathname) as 'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets'
  );

  // Changing tab pushes a history entry so each view is linkable and Back works.
  const setActiveTab = (tab: 'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets') => {
    setActiveTabState(tab);
    const path = TAB_PATHS[tab] || TAB_PATHS[DEFAULT_TAB];
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  };
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('tech_ads_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    try {
      localStorage.setItem('tech_ads_theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fetch sales and attendance for a specific staff member
  const fetchDashboardData = async (staffId: string) => {
    try {
      // Check if user has Admin/Director role
      const { data: staffProfileCheck } = await supabase
        .from('staff')
        .select('*, roles(role_name)')
        .eq('id', staffId)
        .maybeSingle();

      if (staffProfileCheck) {
        setActiveStaff(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            monthly_target_amount: Number(staffProfileCheck.monthly_target_amount) || 0
          };
          localStorage.setItem('tech_ads_active_staff', JSON.stringify(updated));
          return updated;
        });
      }

      const roleName = staffProfileCheck?.roles
        ? (Array.isArray(staffProfileCheck.roles) ? staffProfileCheck.roles[0]?.role_name : staffProfileCheck.roles.role_name)
        : '';

      const nameUpper = String(activeStaff?.full_name || staffProfileCheck?.full_name || '').toUpperCase();
      const desigLower = String(staffProfileCheck?.designation || activeStaff?.designation || '').toLowerCase();
      const roleLower = String(roleName || '').toLowerCase();

      const isAdminUser = 
        nameUpper.includes('SHIBILI') ||
        nameUpper.includes('ASHIF') ||
        desigLower.includes('owner') ||
        desigLower.includes('admin') ||
        desigLower.includes('director') ||
        desigLower.includes('managing') ||
        roleLower.includes('owner') ||
        roleLower.includes('admin') ||
        roleLower.includes('director');

      // Sales, attendance and daily reports are only ever read through the
      // month selector, which offers the last 12 months, so bound all three to
      // that window instead of pulling the full history on every fetch.
      const windowStartStr = monthWindowStart();

      // Fetch sales from Supabase. Rows predating `created_at` are kept so the
      // legacy `sale_month` name matching in the dashboards still resolves them.
      let salesQuery = supabase
        .from('sales')
        .select(`${SALES_COLUMNS}, staff(full_name)`)
        .or(`created_at.gte.${windowStartStr},created_at.is.null`)
        .order('created_at', { ascending: false });

      if (!isAdminUser) {
        salesQuery = salesQuery.eq('staff_id', staffId);
      }

      const { data: salesData, error: salesErr } = await salesQuery;
      if (salesErr) throw salesErr;

      // Fetch attendance records from Supabase
      const { data: attData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', staffId)
        .gte('attendance_date', windowStartStr);

      if (attErr) throw attErr;

      // Fetch daily reports from Supabase
      let reportsQuery = supabase
        .from('daily_reports')
        .select('*, staff(full_name)')
        .gte('report_date', windowStartStr);

      if (!isAdminUser) {
        reportsQuery = reportsQuery.eq('staff_id', staffId);
      }

      const { data: reportsData, error: reportsErr } = await reportsQuery;
      if (reportsErr) throw reportsErr;

      const mappedReports = (reportsData || []).map((r: any) => ({
        ...r,
        staff_name: r.staff?.full_name || 'Staff'
      })).reverse();

      const sortedSales = (salesData || []).reverse();
      setSales(sortedSales as Sale[]);
      setAttendance(attData as Attendance[]);
      setDailyReports(mappedReports as DailyReport[]);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setDbError(err.message || 'Failed to fetch dashboard data.');
    }
  };

  // Run initial setup: check localStorage session
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setDbError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          let { data: profile } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          // Self-healing: if not found by auth_user_id, attempt match by email/username
          if (!profile && session.user.email) {
            const rawName = session.user.email.replace('@agency.com', '').trim();
            const { data: matched } = await supabase
              .from('staff_profiles')
              .select('*')
              .or(`username.ilike.${rawName},full_name.ilike.${rawName}`)
              .maybeSingle();

            if (matched) {
              await supabase
                .from('staff_profiles')
                .update({ auth_user_id: session.user.id })
                .eq('id', matched.id);
              profile = { ...matched, auth_user_id: session.user.id };
            }
          }

          if (profile) {
            let { data: staffRecord } = await supabase
              .from('staff')
              .select('*, departments(name), roles(role_name)')
              .eq('id', profile.id)
              .maybeSingle();

            let deptName = 'Sales & Growth';
            let rName = 'Senior Sales Consultant';

            if (staffRecord) {
              if (staffRecord.departments) {
                deptName = Array.isArray(staffRecord.departments) 
                  ? staffRecord.departments[0]?.name 
                  : staffRecord.departments.name;
              }
              if (staffRecord.roles) {
                rName = Array.isArray(staffRecord.roles) 
                  ? staffRecord.roles[0]?.role_name 
                  : staffRecord.roles.role_name;
              }
            }

            const activeUser: Staff = {
              id: staffRecord ? staffRecord.id : profile.id,
              staff_code: staffRecord ? staffRecord.staff_code : 'TA-STF-99',
              full_name: profile.full_name,
              avatar_url: profile.avatar_url || staffRecord?.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.full_name)}`,
              monthly_target_amount: staffRecord ? Number(staffRecord.monthly_target_amount) : 500000,
              monthly_targets: staffRecord?.monthly_targets || null,
              notice_period_days: staffRecord ? staffRecord.notice_period_days : 60,
              status: (staffRecord?.status as any) || 'ACTIVE',
              department_name: deptName,
              role_name: profile.designation || rName,
              designation: profile.designation,
              gender: profile.gender,
              shift_start_time: profile.shift_start_time,
              shift_end_time: profile.shift_end_time,
              weekly_off_day: profile.weekly_off_day
            };

            const isAdmin = profile.designation.toLowerCase().includes('admin') || 
                            profile.designation.toLowerCase().includes('director') || 
                            profile.designation.toLowerCase().includes('coordinator') ||
                            profile.designation.toLowerCase().includes('owner') ||
                            rName.toLowerCase().includes('admin') ||
                            rName.toLowerCase().includes('director');

            setActiveStaff(activeUser);
            setIsAdminMode(isAdmin);
            localStorage.setItem('tech_ads_active_staff', JSON.stringify(activeUser));
            localStorage.setItem('tech_ads_is_admin', String(isAdmin));
            await fetchDashboardData(activeUser.id);
          } else {
            setActiveStaff(null);
            localStorage.removeItem('tech_ads_active_staff');
            localStorage.removeItem('tech_ads_is_admin');
          }
        } else {
          setActiveStaff(null);
          localStorage.removeItem('tech_ads_active_staff');
          localStorage.removeItem('tech_ads_is_admin');
        }
      } catch (err: any) {
        console.error('Database connection / session error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  // Browser back/forward -> tab state
  useEffect(() => {
    const onPop = () => setActiveTabState(tabForPath(window.location.pathname) as 'sales' | 'attendance' | 'leads' | 'staff-history' | 'academy_overview' | 'academy_batches' | 'academy_students' | 'academy_attendance' | 'academy_finances' | 'academy_staff' | 'history' | 'staff' | 'finance' | 'reports' | 'withdrawals' | 'expense_history' | 'assets');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Give the initial view a canonical URL (e.g. "/" -> "/sales").
  useEffect(() => {
    const path = TAB_PATHS[activeTab] || TAB_PATHS[DEFAULT_TAB];
    if (window.location.pathname !== path) {
      window.history.replaceState({ tab: activeTab }, '', path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update today's attendance state whenever attendance array updates
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayRecord = attendance.find((a) => a.attendance_date === todayStr);
    setTodayAttendance(todayRecord || null);
  }, [attendance]);

  // Real-time synchronization across clients & tabs.
  //
  // This is the only realtime channel in the app. Views react by listening for
  // the window events dispatched below rather than opening their own
  // subscription to the same table, and they must not pass forceRefresh when
  // they do: invalidateTables() has already dropped the affected cache keys, so the
  // refetch misses cache anyway while a forced one also defeats the TTL and the
  // in-flight request dedup when several events arrive together.
  useEffect(() => {
    // A realtime event delivers the changed row, so it is applied to local
    // state directly. Calling fetchDashboardData() here instead meant one sale
    // logged by one rep made every open dashboard re-download twelve months of
    // sales, attendance and reports -- for admins, across all staff.

    // Non-admins only ever held their own rows, so keep that scope when merging
    // rather than letting another staff member's row into this client's state.
    const isOwnRow = (row: any) =>
      isAdminMode || !row?.staff_id || row.staff_id === activeStaff?.id;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          invalidateTables('sales');
          if (isOwnRow(payload.new ?? payload.old)) {
            mergeRealtimeRow<Sale>(setSales, payload as RealtimePayload);
          }
          window.dispatchEvent(new CustomEvent('sales_data_changed'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        (payload) => {
          invalidateTables('staff');
          // Only the signed-in user's own target is mirrored onto activeStaff,
          // so a change to anyone else's row needs no work beyond the event.
          const row: any = payload.new;
          if (row?.id && row.id === activeStaff?.id) {
            setActiveStaff((prev) => {
              if (!prev) return null;
              const updated = { ...prev, monthly_target_amount: Number(row.monthly_target_amount) || 0 };
              localStorage.setItem('tech_ads_active_staff', JSON.stringify(updated));
              return updated;
            });
          }
          window.dispatchEvent(new CustomEvent('staff_profiles_changed', { detail: { action: 'db_sync' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_profiles' },
        () => {
          invalidateTables('staff_profiles');
          window.dispatchEvent(new CustomEvent('staff_profiles_changed', { detail: { action: 'db_sync' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          invalidateTables('attendance');
          // This array is what todayAttendance derives from, so it is the one
          // piece of context state a view actually renders.
          if (isOwnRow(payload.new ?? payload.old)) {
            mergeRealtimeRow<Attendance>(setAttendance, payload as RealtimePayload);
          }
          window.dispatchEvent(new CustomEvent('attendance_data_changed'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          invalidateTables('expenses');
          window.dispatchEvent(new CustomEvent('company_expenses_changed'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'owner_expenses' },
        () => {
          invalidateTables('owner_expenses');
          window.dispatchEvent(new CustomEvent('company_expenses_changed'));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStaff?.id, isAdminMode]);

  const login = async (username: string, pass: string) => {
    console.log('Incoming Login Attempt:', { username });
    try {
      setDbError(null);
      
      const email = formatStaffEmail(username);
      const cleanPass = pass.trim();
      let authUser: any = null;

      // 1. Authenticate with Supabase Auth using standardized email
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPass
      });

      if (!authErr && authData?.user) {
        authUser = authData.user;
      } else {
        // Fallback: If login fails, check if user exists in staff_profiles with matching password
        // and automatically heal/provision their Supabase Auth credentials
        if (supabaseAdmin) {
          const { data: fallbackProf } = await supabaseAdmin
            .from('staff_profiles')
            .select('*')
            .or(`username.ilike.${username.trim()},full_name.ilike.${username.trim()}`)
            .maybeSingle();

          if (fallbackProf && (fallbackProf.password === cleanPass || fallbackProf.password === normalizePassword(cleanPass))) {
            const syncedAuthId = await ensureStaffAuthUser({
              username: fallbackProf.username || fallbackProf.full_name,
              fullName: fallbackProf.full_name,
              password: cleanPass
            });

            if (syncedAuthId) {
              await supabaseAdmin
                .from('staff_profiles')
                .update({ auth_user_id: syncedAuthId })
                .eq('id', fallbackProf.id);

              const { data: retryAuth, error: retryErr } = await supabase.auth.signInWithPassword({
                email,
                password: cleanPass
              });

              if (!retryErr && retryAuth?.user) {
                authUser = retryAuth.user;
              }
            }
          }
        }
      }

      if (!authUser) {
        if (authErr) throw authErr;
        return false;
      }

      // 2. Query staff_profiles table using auth_user_id
      let { data: profile, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (!profile) {
        // Self-healing fallback: find by username/full_name and map auth_user_id
        const { data: fallbackProfile } = await supabase
          .from('staff_profiles')
          .select('*')
          .or(`username.ilike.${username.trim()},full_name.ilike.${username.trim()}`)
          .maybeSingle();

        if (fallbackProfile) {
          await supabase
            .from('staff_profiles')
            .update({ auth_user_id: authUser.id })
            .eq('id', fallbackProfile.id);
          profile = { ...fallbackProfile, auth_user_id: authUser.id };
        }
      }

      if (error) throw error;
      if (!profile) return false;

      console.log('Supabase profile query result:', { profile, error });

      if (error) throw error;
      if (!profile) return false;

      // Find matching staff record in general 'staff' table
      let { data: staffRecord } = await supabase
        .from('staff')
        .select('*, departments(name), roles(role_name)')
        .eq('id', profile.id)
        .maybeSingle();

      if (!staffRecord) {
        // Automatically insert a matching staff row to satisfy foreign keys!
        const { data: newStaffRow, error: insertStaffErr } = await supabase
          .from('staff')
          .insert({
            id: profile.id, // Keep IDs identical!
            staff_code: 'TA-STF-' + Math.floor(10 + Math.random() * 90),
            full_name: profile.full_name,
            department_id: '9c6d4234-7513-4b65-9c65-60bdde04220b', // Default department
            role_id: '3a7667c8-2ea5-41f6-bd3d-6ba129582b00', // Default role
            status: 'ACTIVE'
          })
          .select('*, departments(name), roles(role_name)')
          .maybeSingle();

        if (!insertStaffErr && newStaffRow) {
          staffRecord = newStaffRow;
        } else {
          const { data: retryRow } = await supabase
            .from('staff')
            .select('*, departments(name), roles(role_name)')
            .eq('full_name', profile.full_name)
            .maybeSingle();
          if (retryRow) staffRecord = retryRow;
        }
      }

      let deptName = 'Sales & Growth';
      let rName = 'Senior Sales Consultant';

      if (staffRecord) {
        if (staffRecord.departments) {
          deptName = Array.isArray(staffRecord.departments) 
            ? staffRecord.departments[0]?.name 
            : staffRecord.departments.name;
        }
        if (staffRecord.roles) {
          rName = Array.isArray(staffRecord.roles) 
            ? staffRecord.roles[0]?.role_name 
            : staffRecord.roles.role_name;
        }
      }

      const activeUser: Staff = {
        id: staffRecord ? staffRecord.id : profile.id,
        staff_code: staffRecord ? staffRecord.staff_code : 'TA-STF-99',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url || staffRecord?.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.full_name)}`,
        monthly_target_amount: staffRecord ? Number(staffRecord.monthly_target_amount) : 500000,
        monthly_targets: staffRecord?.monthly_targets || null,
        notice_period_days: staffRecord ? staffRecord.notice_period_days : 60,
        status: (staffRecord?.status as any) || 'ACTIVE',
        department_name: deptName,
        role_name: profile.designation || rName,
        designation: profile.designation,
        gender: profile.gender,
        shift_start_time: profile.shift_start_time,
        shift_end_time: profile.shift_end_time,
        weekly_off_day: profile.weekly_off_day
      };

      const isAdmin = profile.designation.toLowerCase().includes('admin') || 
                      profile.designation.toLowerCase().includes('director') || 
                      profile.designation.toLowerCase().includes('coordinator') ||
                      profile.designation.toLowerCase().includes('owner') ||
                      rName.toLowerCase().includes('admin') ||
                      rName.toLowerCase().includes('director') ||
                      rName.toLowerCase().includes('owner');

      setActiveStaff(activeUser);
      setIsAdminMode(isAdmin);

      localStorage.setItem('tech_ads_active_staff', JSON.stringify(activeUser));
      localStorage.setItem('tech_ads_is_admin', String(isAdmin));

      await fetchDashboardData(activeUser.id);
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      setDbError(err.message || 'Verification error.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase auth signout error:", e);
    }
    setActiveStaff(null);
    localStorage.removeItem('tech_ads_active_staff');
    localStorage.removeItem('tech_ads_is_admin');
  };

  const updateAvatar = async (avatarBlob: Blob) => {
    if (!activeStaff) return;
    try {
      // 1. Upload to Storage and keep only the public URL in the database.
      // The encoder picks WebP or JPEG at runtime, so name and type follow the
      // blob rather than being hardcoded.
      const filePath = `${activeStaff.id}/${Date.now()}.${extensionForBlob(avatarBlob)}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarBlob, { contentType: avatarBlob.type, cacheControl: '31536000', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = publicUrlData.publicUrl;

      // 2. Update in staff table
      const { error: staffErr } = await supabase
        .from('staff')
        .update({ avatar_url: avatarUrl })
        .eq('full_name', activeStaff.full_name);

      if (staffErr) throw staffErr;

      // 3. Update state
      const updatedUser = { ...activeStaff, avatar_url: avatarUrl };
      setActiveStaff(updatedUser);
      localStorage.setItem('tech_ads_active_staff', JSON.stringify(updatedUser));
    } catch (err: any) {
      console.error('Avatar update failed:', err);
      alert('Avatar update failed: ' + err.message);
    }
  };

  const addSale = async (saleData: {
    clientName: string;
    servicePackage: string;
    paymentType: 'Full' | 'Advance' | 'Clearance';
    packageAmount: number;
    receivedAmount: number;
    paymentMethod?: string;
    paymentProofUrl?: string;
    workDescription?: string;
    utrNumber?: string;
    date?: string;
    saleDate?: string;
  }) => {
    if (!activeStaff) return;
    const balance = saleData.packageAmount - saleData.receivedAmount;

    const currentISTDate = saleData.date || saleData.saleDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const timeIST = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
    const istTimestamp = `${currentISTDate}T${timeIST}+05:30`;

    const [year, monthVal] = currentISTDate.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonthStr = `${months[monthVal - 1]} ${year}`;

    // Append UTR / Txn Ref tag to work_description to guarantee permanence in Postgres DB
    let combinedDescription = saleData.workDescription || null;
    if (saleData.utrNumber && saleData.utrNumber.trim()) {
      const refVal = saleData.utrNumber.trim();
      const utrTag = `Txn Ref: ${refVal}`;
      combinedDescription = combinedDescription ? `${combinedDescription} (${utrTag})` : utrTag;
    }

    const payload: any = {
      staff_id: activeStaff.id,
      client_name: saleData.clientName,
      service_package: saleData.servicePackage,
      payment_type: saleData.paymentType,
      package_amount: saleData.packageAmount,
      received_amount: saleData.receivedAmount,
      balance_amount: balance >= 0 ? balance : 0,
      sale_month: currentMonthStr,
      payment_method: saleData.paymentMethod || null,
      payment_proof_url: saleData.paymentProofUrl || null,
      work_description: combinedDescription,
      utr_number: saleData.utrNumber || null,
      utr: saleData.utrNumber || null,
      transaction_id: saleData.utrNumber || null,
      payment_ref: saleData.utrNumber || null,
      created_at: istTimestamp,
      date: currentISTDate,
      sale_date: currentISTDate
    };

    const { error } = await supabase
      .from('sales')
      .insert(payload);

    if (error) {
      delete payload.date;
      delete payload.sale_date;
      delete payload.utr;
      delete payload.transaction_id;
      delete payload.payment_ref;
      const { error: fallbackErr } = await supabase.from('sales').insert(payload);
      if (fallbackErr) {
        delete payload.utr_number;
        payload.created_at = `${currentISTDate} ${timeIST}`;
        const { error: finalErr } = await supabase.from('sales').insert(payload);
        if (finalErr) {
          console.error('Error inserting sale:', finalErr);
          throw finalErr;
        }
      }
    }

    invalidateTables('sales');
    window.dispatchEvent(new CustomEvent('sales_data_changed'));
  };

  const addDailyReport = async (reportData: {
    workType: string;
    description: string;
    reportDate?: string;
    postersCount?: number;
    reEditsCount?: number;
    logosCount?: number;
    othersCount?: number;
    adsPlacedCount?: number;
    workCategory?: string;
    clientName?: string;
    videosCount?: number;
    travelExpense?: number;
  }) => {
    if (!activeStaff) return;
    const rDate = reportData.reportDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { error } = await supabase
      .from('daily_reports')
      .insert({
        staff_id: activeStaff.id,
        work_type: reportData.workType,
        description: reportData.description,
        report_date: rDate,
        posters_count: reportData.postersCount || 0,
        re_edits_count: reportData.reEditsCount || 0,
        logos_count: reportData.logosCount || 0,
        others_count: reportData.othersCount || 0,
        ads_placed_count: reportData.adsPlacedCount || 0,
        work_category: reportData.workCategory || null,
        client_name: reportData.clientName || null,
        videos_count: reportData.videosCount || 0,
        travel_expense: reportData.travelExpense || 0
      });

    if (error) {
      console.error('Error inserting daily report:', error);
      throw error;
    }

    invalidateTables('sales');
    window.dispatchEvent(new CustomEvent('sales_data_changed'));
  };

  const punchIn = async (selfieUrl?: string, lat?: number, lng?: number, status?: string) => {
    if (!activeStaff) return;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    if (todayAttendance) return;

    const { data: newAtt, error } = await supabase
      .from('attendance')
      .insert({
        staff_id: activeStaff.id,
        attendance_date: todayStr,
        punch_in: timeStr,
        selfie_url: selfieUrl || activeStaff.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
        // Record the real fix only. Substituting the office coordinate here
        // would file a GPS-less punch as if it happened at the office.
        lat: lat ?? null,
        lng: lng ?? null,
        status: status || 'PRESENT'
      })
      .select()
      .single();

    if (error) {
      console.error('Error punching in:', error);
      throw error;
    }

    if (newAtt) {
      setAttendance((prev) => [newAtt as Attendance, ...prev]);
    }
    invalidateTables('attendance');
    window.dispatchEvent(new CustomEvent('attendance_data_changed'));
  };

  const punchOut = async (status?: string) => {
    if (!activeStaff || !todayAttendance) return;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    const updatePayload: any = {
      punch_out: timeStr
    };
    if (status) {
      updatePayload.status = status;
    }

    const { data: updatedAtt, error } = await supabase
      .from('attendance')
      .update(updatePayload)
      .eq('id', todayAttendance.id)
      .select()
      .single();

    if (error) {
      console.error('Error punching out:', error);
      throw error;
    }

    if (updatedAtt) {
      setAttendance((prev) =>
        prev.map((item) => (item.id === updatedAtt.id ? (updatedAtt as Attendance) : item))
      );
    }
    invalidateTables('attendance');
    window.dispatchEvent(new CustomEvent('attendance_data_changed'));
  };

  return (
    <AppContext.Provider
      value={{
        activeStaff,
        sales,
        attendance,
        dailyReports,
        selectedMonth,
        setSelectedMonth,
        theme,
        toggleTheme,
        addSale,
        addDailyReport,
        punchIn,
        punchOut,
        todayAttendance,
        isLoading,
        dbError,
        activeTab,
        setActiveTab,
        isAdminMode,
        setIsAdminMode,
        login,
        logout,
        updateAvatar,
        fetchDashboardData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
