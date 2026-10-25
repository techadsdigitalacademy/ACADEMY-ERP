import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Staff, Sale, Attendance, DailyReport } from '../types';
import { supabase, SALES_COLUMNS, monthWindowStart } from '../services/supabase';
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
        desigLower.includes('partner') ||
        desigLower.includes('admin') ||
        desigLower.includes('director') ||
        desigLower.includes('managing') ||
        roleLower.includes('owner') ||
        roleLower.includes('partner') ||
        roleLower.includes('admin') ||
        roleLower.includes('director');

      // Sales, attendance and daily reports are only ever read through the
      // month selector, which offers the last 12 months, so bound all three to
      // that window instead of pulling the full history on every fetch.
      const windowStartStr = monthWindowStart();

      // Safely fetch sales from Supabase
      try {
        let salesQuery = supabase
          .from('sales')
          .select(`${SALES_COLUMNS}, staff(full_name)`)
          .or(`created_at.gte.${windowStartStr},created_at.is.null`)
          .order('created_at', { ascending: false });

        if (!isAdminUser) {
          salesQuery = salesQuery.eq('staff_id', staffId);
        }

        const { data: salesData, error: salesErr } = await salesQuery;
        if (!salesErr && salesData) {
          setSales(salesData.reverse() as Sale[]);
        } else {
          setSales([]);
        }
      } catch (e) {
        setSales([]);
      }

      // Safely fetch attendance records from Supabase
      try {
        const { data: attData, error: attErr } = await supabase
          .from('staff_attendance')
          .select('*')
          .eq('staff_id', staffId)
          .gte('attendance_date', windowStartStr);

        if (!attErr && attData) {
          const normalized = attData.map((d: any) => ({
            ...d,
            status: (d.status || 'present').toUpperCase(),
            punch_in: d.punch_in || (d.created_at ? new Date(d.created_at).toLocaleTimeString('en-US', { hour12: false }) : '09:00:00')
          }));
          setAttendance(normalized as Attendance[]);
        } else {
          setAttendance([]);
        }
      } catch (e) {
        setAttendance([]);
      }

      // Safely fetch daily reports from Supabase
      try {
        let reportsQuery = supabase
          .from('daily_reports')
          .select('*, staff(full_name)')
          .gte('report_date', windowStartStr);

        if (!isAdminUser) {
          reportsQuery = reportsQuery.eq('staff_id', staffId);
        }

        const { data: reportsData, error: reportsErr } = await reportsQuery;
        if (!reportsErr && reportsData) {
          const mappedReports = reportsData.map((r: any) => ({
            ...r,
            staff_name: r.staff?.full_name || 'Staff'
          })).reverse();
          setDailyReports(mappedReports as DailyReport[]);
        } else {
          setDailyReports([]);
        }
      } catch (e) {
        setDailyReports([]);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      // Suppress noisy fatal banner if non-critical tables are absent
    }
  };

  // Run initial setup: check Supabase session & verified localStorage session
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      setDbError(null);
      try {
        let profile: any = null;

        // 1. First, check active Supabase Auth session
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user) {
            let { data: authProfile } = await supabase
              .from('staff_profiles')
              .select('*')
              .eq('auth_user_id', session.user.id)
              .maybeSingle();

            if (!authProfile && session.user.email) {
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
                authProfile = { ...matched, auth_user_id: session.user.id };
              }
            }

            if (authProfile) {
              profile = authProfile;
            }
          }
        } catch (authErr) {
          console.warn('Supabase auth session check note:', authErr);
        }

        // 2. If no active Auth session, check verified cached staff from localStorage
        if (!profile) {
          const cachedStaffStr = localStorage.getItem('tech_ads_active_staff');
          if (cachedStaffStr) {
            try {
              const cached = JSON.parse(cachedStaffStr);
              if (cached?.id) {
                const { data: verifiedProf } = await supabase
                  .from('staff_profiles')
                  .select('*')
                  .eq('id', cached.id)
                  .maybeSingle();

                if (verifiedProf && verifiedProf.status !== 'inactive' && verifiedProf.status !== 'terminated') {
                  profile = verifiedProf;
                }
              }
            } catch (parseErr) {
              console.warn('Error reading cached staff profile:', parseErr);
            }
          }
        }

        if (profile) {
          let staffRecord: any = null;
          try {
            const { data } = await supabase
              .from('staff')
              .select('*, departments(name), roles(role_name)')
              .eq('id', profile.id)
              .maybeSingle();
            if (data) staffRecord = data;
          } catch {
            // staff table might not exist in Academy schema
          }

          let deptName = 'Academy';
          let rName = profile.designation || 'Staff Member';

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
            staff_code: staffRecord ? staffRecord.staff_code : ('TA-STF-' + (profile.username?.substring(0, 4)?.toUpperCase() || 'STF')),
            full_name: profile.full_name || profile.username || 'Staff Member',
            avatar_url: profile.avatar_url || staffRecord?.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.full_name || profile.username)}`,
            monthly_target_amount: staffRecord ? Number(staffRecord.monthly_target_amount) : 500000,
            monthly_targets: staffRecord?.monthly_targets || null,
            notice_period_days: staffRecord ? staffRecord.notice_period_days : 60,
            status: (profile.status as any) || (staffRecord?.status as any) || 'ACTIVE',
            department_name: deptName,
            role_name: profile.designation || rName,
            designation: profile.designation,
            gender: profile.gender,
            shift_start_time: profile.shift_start_time,
            shift_end_time: profile.shift_end_time,
            weekly_off_day: profile.weekly_off_day
          };

          const desig = (profile.designation || '').toLowerCase();
          const rNameLower = rName.toLowerCase();
          const userLower = (profile.username || '').toLowerCase();

          const isAdmin = desig.includes('admin') || 
                          desig.includes('director') || 
                          desig.includes('coordinator') ||
                          desig.includes('owner') ||
                          desig.includes('partner') ||
                          rNameLower.includes('admin') ||
                          rNameLower.includes('director') ||
                          rNameLower.includes('partner') ||
                          rNameLower.includes('owner') ||
                          userLower === 'admin';

          setActiveStaff(activeUser);
          setIsAdminMode(isAdmin);
          localStorage.setItem('tech_ads_active_staff', JSON.stringify(activeUser));
          localStorage.setItem('tech_ads_is_admin', String(isAdmin));
          await fetchDashboardData(activeUser.id);
        } else {
          setActiveStaff(null);
          setIsAdminMode(false);
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
      
      const cleanUser = username.trim();
      const cleanPass = pass.trim();
      if (!cleanUser || !cleanPass) return false;

      const userHandle = cleanUser.includes('@') ? cleanUser.split('@')[0].trim() : cleanUser;

      // 1. Direct authentication against staff_profiles table
      let profile: any = null;
      let authenticated = false;

      // Query staff_profiles for matching username, full_name, or handle (case-insensitive)
      const { data: matchedProfiles, error: profileErr } = await supabase
        .from('staff_profiles')
        .select('*')
        .or(`username.ilike.${cleanUser},full_name.ilike.${cleanUser},username.ilike.${userHandle},full_name.ilike.${userHandle}`);

      if (!profileErr && matchedProfiles && matchedProfiles.length > 0) {
        // Prioritize exact/case-insensitive username match, then handle, then full_name
        profile = matchedProfiles.find(
          (p) => (p.username && p.username.trim().toLowerCase() === cleanUser.toLowerCase()) ||
                 (p.username && p.username.trim().toLowerCase() === userHandle.toLowerCase())
        ) || matchedProfiles.find(
          (p) => p.full_name && p.full_name.trim().toLowerCase() === cleanUser.toLowerCase()
        ) || matchedProfiles[0];
      }

      // If profile found, verify password against stored password in staff_profiles
      if (profile) {
        const storedPass = (profile.password || '').trim();
        if (
          storedPass === cleanPass ||
          storedPass === normalizePassword(cleanPass) ||
          (storedPass && normalizePassword(storedPass) === normalizePassword(cleanPass)) ||
          (storedPass && storedPass.toLowerCase() === cleanPass.toLowerCase())
        ) {
          authenticated = true;
        }
      }

      // 2. Secondary verification via Supabase Auth (e.g. for Admin or if password was updated in Auth)
      if (!authenticated) {
        try {
          const authEmail = cleanUser.includes('@') ? cleanUser : formatStaffEmail(profile?.username || profile?.full_name || cleanUser);
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: authEmail,
            password: cleanPass
          });

          if (!authErr && authData?.user) {
            authenticated = true;
            if (!profile) {
              const { data: profByAuth } = await supabase
                .from('staff_profiles')
                .select('*')
                .eq('auth_user_id', authData.user.id)
                .maybeSingle();

              if (profByAuth) {
                profile = profByAuth;
              } else {
                const { data: profByHandle } = await supabase
                  .from('staff_profiles')
                  .select('*')
                  .or(`username.ilike.${userHandle},full_name.ilike.${userHandle}`)
                  .maybeSingle();
                if (profByHandle) profile = profByHandle;
              }
            }
          }
        } catch (authAttemptErr) {
          console.warn('Supabase auth sign-in attempt notice:', authAttemptErr);
        }
      }

      // If credentials do not match either staff_profiles or Supabase Auth, reject login
      if (!authenticated || !profile) {
        console.warn('Authentication failed for user:', cleanUser);
        return false;
      }

      // 3. Silent/background sync to Supabase Auth so auth session token is established
      try {
        const staffEmail = formatStaffEmail(profile.username || profile.full_name || userHandle);
        const { data: silentAuth, error: silentErr } = await supabase.auth.signInWithPassword({
          email: staffEmail,
          password: cleanPass
        });

        if (silentErr) {
          const syncedAuthId = await ensureStaffAuthUser({
            username: profile.username || profile.full_name,
            fullName: profile.full_name,
            password: cleanPass
          });

          if (syncedAuthId) {
            if (profile.auth_user_id !== syncedAuthId) {
              await supabase
                .from('staff_profiles')
                .update({ auth_user_id: syncedAuthId })
                .eq('id', profile.id);
              profile.auth_user_id = syncedAuthId;
            }
            await supabase.auth.signInWithPassword({
              email: staffEmail,
              password: cleanPass
            });
          }
        } else if (silentAuth?.user?.id && profile.auth_user_id !== silentAuth.user.id) {
          await supabase
            .from('staff_profiles')
            .update({ auth_user_id: silentAuth.user.id })
            .eq('id', profile.id);
          profile.auth_user_id = silentAuth.user.id;
        }
      } catch (syncErr) {
        console.warn('Background Supabase Auth sync notice:', syncErr);
      }

      // 4. Safely query matching staff record in general `staff` table if present
      let staffRecord: any = null;
      try {
        const { data } = await supabase
          .from('staff')
          .select('*, departments(name), roles(role_name)')
          .eq('id', profile.id)
          .maybeSingle();
        if (data) staffRecord = data;
      } catch {
        // Table might not exist in Academy-only schemas
      }

      let deptName = 'Academy';
      let rName = profile.designation || 'Staff Member';

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
        staff_code: staffRecord ? staffRecord.staff_code : ('TA-STF-' + (profile.username?.substring(0, 4)?.toUpperCase() || 'STF')),
        full_name: profile.full_name || profile.username || 'Staff Member',
        avatar_url: profile.avatar_url || staffRecord?.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.full_name || profile.username)}`,
        monthly_target_amount: staffRecord ? Number(staffRecord.monthly_target_amount) : 500000,
        monthly_targets: staffRecord?.monthly_targets || null,
        notice_period_days: staffRecord ? staffRecord.notice_period_days : 60,
        status: (profile.status as any) || (staffRecord?.status as any) || 'ACTIVE',
        department_name: deptName,
        role_name: profile.designation || rName,
        designation: profile.designation,
        gender: profile.gender,
        shift_start_time: profile.shift_start_time,
        shift_end_time: profile.shift_end_time,
        weekly_off_day: profile.weekly_off_day
      };

      const desig = (profile.designation || '').toLowerCase();
      const rNameLower = rName.toLowerCase();
      const userLower = (profile.username || '').toLowerCase();

      const isAdmin = desig.includes('admin') || 
                      desig.includes('director') || 
                      desig.includes('coordinator') ||
                      desig.includes('owner') ||
                      desig.includes('partner') ||
                      rNameLower.includes('admin') ||
                      rNameLower.includes('director') ||
                      rNameLower.includes('partner') ||
                      rNameLower.includes('owner') ||
                      userLower === 'admin';

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

    const dbStatus = (status || 'present').toLowerCase();
    let savedRecord: any = null;

    try {
      const { data, error } = await supabase
        .from('staff_attendance')
        .insert({
          staff_id: activeStaff.id,
          attendance_date: todayStr,
          status: dbStatus
        })
        .select()
        .single();

      if (!error && data) {
        savedRecord = data;
      } else {
        // Fallback to proxy
        const res = await fetch('/supabase-admin/rest/v1/staff_attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([{
            staff_id: activeStaff.id,
            attendance_date: todayStr,
            status: dbStatus
          }])
        });
        if (res.ok) {
          const proxyData = await res.json();
          savedRecord = proxyData[0];
        }
      }
    } catch (err) {
      console.warn('Punch-in DB error:', err);
    }

    const localRecord: Attendance = {
      id: savedRecord?.id || `att-${Date.now()}`,
      staff_id: activeStaff.id,
      attendance_date: todayStr,
      punch_in: timeStr,
      selfie_url: selfieUrl || activeStaff.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
      lat: lat !== null && lat !== undefined ? lat : undefined,
      lng: lng !== null && lng !== undefined ? lng : undefined,
      status: (status || 'PRESENT').toUpperCase() as any
    };

    setAttendance((prev) => [localRecord, ...prev]);
    invalidateTables('attendance');
    invalidateTables('staff_attendance');
    window.dispatchEvent(new CustomEvent('attendance_data_changed'));
  };

  const punchOut = async (status?: string) => {
    if (!activeStaff || !todayAttendance) return;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    const dbStatus = status ? status.toLowerCase() : 'present';

    try {
      const { error } = await supabase
        .from('staff_attendance')
        .update({ status: dbStatus })
        .eq('id', todayAttendance.id);

      if (error) {
        await fetch(`/supabase-admin/rest/v1/staff_attendance?id=eq.${todayAttendance.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: dbStatus })
        });
      }
    } catch (err) {
      console.warn('Punch out DB update error:', err);
    }

    setAttendance((prev) =>
      prev.map((item) =>
        item.id === todayAttendance.id
          ? {
              ...item,
              punch_out: timeStr,
              status: status ? (status.toUpperCase() as any) : item.status
            }
          : item
      )
    );

    invalidateTables('attendance');
    invalidateTables('staff_attendance');
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
