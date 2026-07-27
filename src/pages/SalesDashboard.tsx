import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { AttendanceDashboard } from '../components/AttendanceDashboard';
import { supabase, supabaseAdmin } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import { 
  Plus, 
  Search, 
  Award,
  X,
  Briefcase,
  Edit2,
  Camera,
  Download,
  MessageSquare,
  Upload,
  Star,
  } from 'lucide-react';

import type { Sale } from '../types';

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerHistoryTab, setOwnerHistoryTab] = useState<'Income' | 'Expense'>('Income');
  const [ownerExpenses, setOwnerExpenses] = useState<any[]>([]);
   // Refetch if a new expense is logged

  const [activeFilter, setActiveFilter] = useState<'All' | 'Full' | 'Advance' | 'Clearance'>('All');
  
  // Log Sale Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
    const [ownerTransactionType, setOwnerTransactionType] = useState<'Income' | 'Expense'>('Income');
  const [ownerExpCategory, setOwnerExpCategory] = useState('Salary');
  const [ownerExpAmount, setOwnerExpAmount] = useState('');
  const [ownerExpDescription, setOwnerExpDescription] = useState('');
  const [ownerExpDate, setOwnerExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingOwnerExp, setIsSubmittingOwnerExp] = useState(false);

  const [clientName, setClientName] = useState('');
  const [servicePackage, setServicePackage] = useState('');
  const [paymentType, setPaymentType] = useState<'Full' | 'Advance' | 'Clearance'>('Advance');
  const [packageAmount, setPackageAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isLoggingSale, setIsLoggingSale] = useState(false);

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

  // Admin Views & Report States
  const [isAdminView, setIsAdminView] = useState(false);
  const [isClosingReportOpen, setIsClosingReportOpen] = useState(false);
  const [todaySummary, setTodaySummary] = useState<{
    agencySalesAmount: number;
    agencySalesCount: number;
    academyFeesAmount: number;
    academyFeesCount: number;
    loading: boolean;
  }>({
    agencySalesAmount: 0,
    agencySalesCount: 0,
    academyFeesAmount: 0,
    academyFeesCount: 0,
    loading: false
  });
  const [todayAttendanceStats, setTodayAttendanceStats] = useState({ present: 0, late: 0, halfDay: 0, leave: 0 });
  const [academyRevenue, setAcademyRevenue] = useState(0);
  const [ ] = useState(false);
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
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [profileSales, setProfileSales] = useState<Sale[]>([]);
  
  const [profileLeads, setProfileLeads] = useState<any[]>([]);


  
  const [profileDetailTab, setProfileDetailTab] = useState<'sales' | 'attendance' | 'leads'>('sales');



  // Lead Management States
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadLocation, setNewLeadLocation] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadPackage, setNewLeadPackage] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);



  // Override sales log states in drilldown
  const [editingProfileSale, setEditingProfileSale] = useState<Sale | null>(null);
  const [editProfileClientName, setEditProfileClientName] = useState('');
  const [editProfilePackageAmt, setEditProfilePackageAmt] = useState('');
  const [editProfileRecAmt, setEditProfileRecAmt] = useState('');
  const [editProfileServicePkg, setEditProfileServicePkg] = useState('');
  const [editProfilePaymentType, setEditProfilePaymentType] = useState<'Full' | 'Advance' | 'Clearance'>('Advance');
  const [editProfilePaymentMethod, setEditProfilePaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [editProfileSaleDate, setEditProfileSaleDate] = useState('');
  const [isUpdatingProfileSale, setIsUpdatingProfileSale] = useState(false);

  // Punch-in GPS state simulation
  const [isPunching, setIsPunching] = useState(false);

  // Strict Geofencing & Camera states
  const OFFICE_COORDS = { lat: 10.9345771, lng: 76.0016118 };
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Camera stream states
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [enlargedSelfie, setEnlargedSelfie] = useState<string | null>(null);

  // Set default view on load
  useEffect(() => {
    const isOwnerUser = activeStaff?.designation?.toLowerCase().includes('owner') || false;
    setIsAdminView(isAdminMode && !isOwnerUser);
  }, [isAdminMode, activeStaff]);

  // Haversine formula
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; 
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  // Location Watching
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Camera setup
  useEffect(() => {
    const startCamera = async () => {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        setCameraError(err.message || "Could not access device camera. Please check permissions.");
      }
    };

    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraOpen]);

  // Fetch summaries for Admin View
  useEffect(() => {
    if (isAdminView) {
      const fetchTodayAttendanceSummary = async () => {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('attendance')
            .select('status')
            .eq('attendance_date', todayStr);
          
          let present = 0;
          let late = 0;
          let halfDay = 0;
          let leave = 0;

          data?.forEach(a => {
            if (a.status === 'PRESENT') present++;
            if (a.status === 'LATE') late++;
            if (a.status === 'HALF_DAY') halfDay++;
            if (a.status === 'LEAVE') leave++;
          });

          setTodayAttendanceStats({ present, late, halfDay, leave });
        } catch (err) {
          console.error("Error fetching today stats:", err);
        }
      };

      const fetchAcademyRevenue = async () => {
        try {
          const { data, error } = await supabase
            .from('academy_student_payments')
            .select('amount');
          if (error) throw error;
          const sum = data?.reduce((acc, p) => acc + p.amount, 0) || 0;
          setAcademyRevenue(sum);
        } catch (err) {
          console.error("Error fetching Academy payments:", err);
        }
      };

      const fetchStaffProfiles = async () => {
        try {
          const { data: profiles, error: err1 } = await supabase
            .from('staff_profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (err1) throw err1;

          const { data: targets, error: err2 } = await supabase
            .from('staff')
            .select('id, monthly_target_amount, full_name, avatar_url');
          
          const targetMap: { [key: string]: number } = {};
          const avatarMap: { [key: string]: string } = {};
          if (!err2 && targets) {
            targets.forEach(t => {
              if (t.full_name) {
                targetMap[t.full_name] = Number(t.monthly_target_amount) || 0;
                if (t.avatar_url) avatarMap[t.full_name] = t.avatar_url;
              }
            });
          }

          // Fetch sales for selectedMonth to compute Achieved & Total Works
          const { data: allSales } = await supabase
            .from('sales')
            .select('staff_id, payment_type, received_amount, created_at');

          // Filter sales for the selectedMonth
          const monthSalesFiltered = (allSales || [])?.filter(s => s.created_at?.startsWith(selectedMonth));

          // Fetch daily reports for selectedMonth to compute total works for creative/support
          const { data: allReports } = await supabase
            .from('daily_reports')
            .select('*');
          
          const monthReportsFiltered = (allReports || [])?.filter(r => r.report_date?.startsWith(selectedMonth));

          // Fetch attendance for selectedMonth to compute P/L
          const { data: allAttendance } = await supabase
            .from('attendance')
            .select('staff_id, status, attendance_date');

          const monthAttendanceFiltered = (allAttendance || [])?.filter(a => a.attendance_date?.startsWith(selectedMonth));

          const merged = (profiles || [])?.map(p => {
            const target = targetMap[p.full_name] || 0;
            const avatar_url = avatarMap[p.full_name] || undefined;
            
            // Calculate sales achievements
            const staffSales = monthSalesFiltered?.filter(s => s.staff_id === p.id);
            const achieved = staffSales.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);
            const salesWorks = staffSales?.filter(s => s.payment_type === 'Advance' || s.payment_type === 'Full').length;

            // Calculate creative works
            const staffReports = monthReportsFiltered?.filter(r => r.staff_id === p.id);
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

            // Calculate attendance P/L
            const staffAtt = monthAttendanceFiltered?.filter(a => a.staff_id === p.id);
            const pCount = staffAtt?.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'HALF_DAY').length;
            const lCount = staffAtt?.filter(a => a.status === 'LATE').length;

            return {
              ...p,
              avatar_url,
              monthly_target_amount: target,
              achievedAmount: achieved,
              salesWorksCount: salesWorks,
              creativeWorksCount: creativeWorks,
              attendancePCount: pCount,
              attendanceLCount: lCount,
            };
          });

          setStaffProfiles(merged);
        } catch (err) {
          console.error("Error fetching staff profiles:", err);
        }
      };

      fetchTodayAttendanceSummary();
      fetchAcademyRevenue();
      fetchStaffProfiles();
    }
  }, [isAdminView, activeTab, selectedMonth]);

  useEffect(() => {
    if (!isClosingReportOpen) return;

    const fetchTodayClosingData = async () => {
      setTodaySummary(prev => ({ ...prev, loading: true }));
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch today's agency sales
        const { data: salesData, error: salesErr } = await supabase
          .from('sales')
          .select('received_amount')
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59.999`);

        let agencySalesAmount = 0;
        let agencySalesCount = 0;

        if (!salesErr && salesData) {
          agencySalesCount = salesData.length;
          agencySalesAmount = salesData.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
        }

        // 2. Fetch today's academy payments
        const { data: feesData, error: feesErr } = await supabase
          .from('academy_installments')
          .select('amount_paid')
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59.999`);

        let academyFeesAmount = 0;
        let academyFeesCount = 0;

        if (!feesErr && feesData) {
          academyFeesCount = feesData.length;
          academyFeesAmount = feesData.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
        }

        setTodaySummary({
          agencySalesAmount,
          agencySalesCount,
          academyFeesAmount,
          academyFeesCount,
          loading: false
        });
      } catch (err) {
        console.error('Failed to fetch today closing data:', err);
        setTodaySummary(prev => ({ ...prev, loading: false }));
      }
    };

    fetchTodayClosingData();
  }, [isClosingReportOpen]);

  const fetchDailyLeaderboard = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const clientToUse = supabaseAdmin || supabase;

      // 1. Fetch today's sales across the entire company using admin client to bypass RLS
      const { data: todaySales, error: salesErr } = await clientToUse
        .from('sales')
        .select('received_amount, staff_id, staff(full_name, avatar_url, designation)')
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59.999`);

      if (salesErr) throw salesErr;

      // 2. Fetch staff profiles to resolve names from staff_profiles
      const { data: profiles, error: profsErr } = await clientToUse
        .from('staff_profiles')
        .select('full_name');

      if (profsErr) throw profsErr;

      // Create a map for name resolution from staff_profiles (case-insensitive key)
      const profileNamesMap = new Map<string, string>();
      (profiles || []).forEach(p => {
        if (p.full_name) {
          profileNamesMap.set(p.full_name.toLowerCase().trim(), p.full_name);
        }
      });

      // Group and sum daily sales by staff_id
      const collections: { [staffId: string]: { name: string; amount: number; avatar?: string } } = {};
      
      (todaySales || []).forEach((sale: any) => {
        const staffId = sale.staff_id;
        if (!staffId) return;

        // Skip Company Owners in Leaderboard
        if (sale.staff?.designation === 'Company Owner') return;

        const rawName = sale.staff?.full_name || 'Staff Member';
        const avatar = sale.staff?.avatar_url;
        
        // Resolve name from staff_profiles by matching the full name
        const resolvedName = profileNamesMap.get(rawName.toLowerCase().trim()) || rawName;

        if (!collections[staffId]) {
          collections[staffId] = {
            name: resolvedName,
            amount: 0,
            avatar
          };
        }
        collections[staffId].amount += Number(sale.received_amount || 0);
      });

      // Sort in descending order of total amount
      const sortedLeaderboard = Object.entries(collections)
        ?.map(([_, obj]) => ({
          name: obj.name,
          amount: obj.amount,
          avatar: obj.avatar
        }))
        ?.sort((a, b) => b.amount - a.amount);

      setDailyLeaderboard(sortedLeaderboard);
    } catch (err) {
      console.error('Error fetching daily leaderboard:', err);
    }
  };

  useEffect(() => {
    fetchDailyLeaderboard();
  }, [sales]);

  const renderLeaderboardMarquee = () => {
    if (dailyLeaderboard.length === 0) {
      return (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
          Leaderboard: No daily sales logged today.
        </div>
      );
    }

    const renderRankIcon = (rank: number) => {
      if (rank === 1) return <span className="text-sm">🥇</span>;
      if (rank === 2) return <span className="text-sm">🥈</span>;
      if (rank === 3) return <span className="text-sm">🥉</span>;
      return (
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-850 border border-white/10 text-[9px] font-extrabold text-slate-350">
          {rank}
        </span>
      );
    };

    return (
      <div className="bg-gradient-to-r from-indigo-950/30 via-slate-900/50 to-purple-950/30 border border-white/5 rounded-2xl p-3 flex items-center gap-4 overflow-hidden relative">
        <div className="flex items-center gap-2 shrink-0 bg-slate-950/60 border border-white/5 px-3 py-1.5 rounded-xl z-10 shadow-md">
          <Award className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-extrabold text-slate-350 uppercase tracking-widest">Daily Leaderboard</span>
        </div>
        
        {/* Scrolling wrapper */}
        <div className="relative w-full overflow-hidden whitespace-nowrap select-none">
          <div className="animate-ticker inline-flex gap-8 pl-4">
            {dailyLeaderboard?.map((item, index) => {
              const rank = index + 1;
              return (
                <div key={`${item.name}-${index}`} className="inline-flex items-center gap-2.5 text-xs font-semibold">
                  {renderRankIcon(rank)}
                  <span className="text-slate-200">{item.name}</span>
                  <span className="font-extrabold text-emerald-400">{formatCurrency(item.amount)}</span>
                  {index < dailyLeaderboard.length - 1 && (
                    <span className="text-slate-700 font-bold px-2">|</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CSS for Marquee animation */}
        <style>{`
          @keyframes ticker {
            0% { transform: translate3d(100vw, 0, 0); }
            100% { transform: translate3d(-100%, 0, 0); }
          }
          .animate-ticker {
            animation: ticker 25s linear infinite;
          }
          .animate-ticker:hover {
            animation-play-state: paused;
          }
        `}</style>
      </div>
    );
  };

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
    if (isOwner && activeStaff?.id) {
      const fetchOwnerExpenses = async () => {
        const { data } = await supabase
          .from('expenses')
          .select('*')
          .eq('staff_id', activeStaff.id)
          .order('expense_date', { ascending: false });
        if (data) setOwnerExpenses(data);
      };
      fetchOwnerExpenses();
    }
  }, [isOwner, activeStaff, ownerTransactionType]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };


  const handlePunch = async (type: 'IN' | 'OUT') => {
    setIsPunching(true);
    try {
      // 1. Capture snapshot directly from video stream
      let selfieBase64 = '';
      if (canvasRef.current && videoRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, 640, 480);
          selfieBase64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
        }
      }
      
      if (!selfieBase64) {
        throw new Error("Could not capture webcam snapshot. Please ensure camera access is allowed.");
      }

      // 2. Upload selfie to Supabase Storage
      const base64Response = await fetch(selfieBase64);
      const blob = await base64Response.blob();
      const fileName = `${activeStaff.id}/${Date.now()}.jpg`;
      
      const { error: uploadErr } = await supabase.storage
        .from('attendance')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance')
        .getPublicUrl(fileName);

      // 3. Perform Time Calculations
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour * 60 + currentMinute; // minutes since midnight

      if (type === 'IN') {
        let status: 'PRESENT' | 'LATE' | 'HALF_DAY' = 'PRESENT';
        
        // Resolve dynamic shift start time
        let shiftStartMin = 570; // fallback to 9:30 AM (9 * 60 + 30)
        if (activeStaff?.shift_start_time) {
          const parts = activeStaff.shift_start_time.split(':');
          if (parts.length >= 2) {
            shiftStartMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }
        
        const lateBoundaryMin = shiftStartMin + 105; // 1hr 45 mins after shift start
        
        if (currentTimeVal > shiftStartMin && currentTimeVal < lateBoundaryMin) {
          status = 'LATE';
        } else if (currentTimeVal >= lateBoundaryMin) {
          status = 'HALF_DAY';
        }

        await punchIn(publicUrl, userCoords?.lat || OFFICE_COORDS.lat, userCoords?.lng || OFFICE_COORDS.lng, status);
        alert(`Successfully punched in! Status: ${status}`);
      } else {
        // Punch Out
        let status: 'PRESENT' | 'LATE' | 'HALF_DAY' = 'PRESENT';

        // Resolve dynamic shift end time
        let shiftEndMin = 1110; // fallback to 6:30 PM (18 * 60 + 30)
        if (activeStaff?.shift_end_time) {
          const parts = activeStaff.shift_end_time.split(':');
          if (parts.length >= 2) {
            shiftEndMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }

        const departureLimitMin = shiftEndMin - 300; // 5 hours before shift end
        
        if (currentTimeVal < departureLimitMin) {
          status = 'HALF_DAY'; // Departure before limit = Status HALF DAY (regardless of check-in status)
        } else {
          // Check-out is after limit, status depends on morning check-in status
          const morningStatus = todayAttendance?.status || 'PRESENT';
          if (morningStatus === 'LATE') {
            status = 'LATE';
          } else if (morningStatus === 'HALF_DAY') {
            status = 'HALF_DAY';
          } else {
            status = 'PRESENT';
          }
        }

        await punchOut(status);
        alert(`Successfully punched out! Status: ${status}`);
      }

      stopCamera();
      setIsCameraOpen(false);
      setIsPunchModalOpen(false);
    } catch (err: any) {
      alert("Punch action failed: " + err.message);
    } finally {
      setIsPunching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('payment_slips')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('payment_slips')
        .getPublicUrl(fileName);

      setPaymentProofUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleViewSlip = (sale: any) => {
    if (sale.payment_proof_url) {
      window.open(sale.payment_proof_url, '_blank');
    } else {
      alert('No payment proof slip was uploaded for this sale.');
    }
  };

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const isClearance = paymentType === 'Clearance';
    if (!clientName || !servicePackage || (!isClearance && !packageAmount) || !receivedAmount) return;

    setIsLoggingSale(true);
    try {
      await addSale({
        clientName,
        servicePackage,
        paymentType,
        packageAmount: isClearance ? 0 : Number(packageAmount),
        receivedAmount: Number(receivedAmount),
        paymentMethod,
        paymentProofUrl,
        workDescription
      });

      setClientName('');
      setServicePackage('');
      setPaymentType('Advance');
      setPackageAmount('');
      setReceivedAmount('');
      setPaymentMethod('UPI');
      setPaymentProofUrl('');
      setWorkDescription('');
      setIsModalOpen(false); 

    } catch (err: any) {
      alert('Sale registry failed: ' + err.message);
    } finally {
      setIsLoggingSale(false);
    }
  };

  const handleOwnerSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerExpAmount) return;
    setIsSubmittingOwnerExp(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        category: ownerExpCategory,
        description: ownerExpDescription.trim(),
        amount: Number(ownerExpAmount),
        expense_date: ownerExpDate,
        staff_id: activeStaff.id
      });
      if (error) throw error;
      alert('Expense logged successfully!');
      
      setOwnerExpAmount('');
      setOwnerExpDescription('');
    } catch (err: any) {
      alert('Failed to log expense: ' + err.message);
    } finally {
      setIsSubmittingOwnerExp(false);
    }
  };


  // Staff profile history select
  const fetchProfileDetails = async (profile: any) => {
    try {
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('id')
        .eq('full_name', profile.full_name)
        .maybeSingle();

      const targetStaffId = staffRecord ? staffRecord.id : profile.id;
      setSelectedStaffId(targetStaffId);

      // Fetch sales
      const { data: saleData } = await supabase
        .from('sales')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('created_at', { ascending: false });
      
      setProfileSales(saleData || []);

      // Fetch daily reports
      await supabase
        .from('daily_reports')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('report_date', { ascending: false });

      // Fetch leads
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', targetStaffId)
        .order('created_at', { ascending: false });

      setProfileLeads(leadData || []);
    } catch (err) {
      console.error('Error fetching detailed logs:', err);
    }
  };

  const handleSelectProfile = (profile: any) => {
    setSelectedProfile(profile);
    setSelectedStaffId(null);
    setProfileDetailTab('sales');
    setProfileSales([]);
    // setProfileReports([]);
    setProfileLeads([]);
    fetchProfileDetails(profile);
  };



  // Admin Override Staff Sale Record
  const handleUpdateProfileSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileSale || !selectedProfile) return;

    setIsUpdatingProfileSale(true);
    try {
      let pAmt = Number(editProfilePackageAmt) || 0;
      let rAmt = Number(editProfileRecAmt) || 0;
      if (editProfilePaymentType === 'Full') {
        rAmt = pAmt;
      } else if (editProfilePaymentType === 'Clearance') {
        pAmt = 0;
      }
      const bal = Math.max(0, pAmt - rAmt);

      let updatedMonth = editingProfileSale.sale_month;
      if (editProfileSaleDate) {
        const dObj = new Date(editProfileSaleDate);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        updatedMonth = `${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
      }

      const { error } = await supabase
        .from('sales')
        .update({
          client_name: editProfileClientName.trim(),
          service_package: editProfileServicePkg.trim(),
          payment_type: editProfilePaymentType,
          package_amount: pAmt,
          received_amount: rAmt,
          balance_amount: bal,
          payment_method: editProfilePaymentMethod,
          created_at: editProfileSaleDate ? `${editProfileSaleDate}T12:00:00+00:00` : editingProfileSale.created_at,
          sale_month: updatedMonth
        })
        .eq('id', editingProfileSale.id);

      if (error) throw error;

      alert('Sale record updated successfully!');
      setEditingProfileSale(null);
      await fetchProfileDetails(selectedProfile);
    } catch (err: any) {
      alert('Failed to update sale log: ' + err.message);
    } finally {
      setIsUpdatingProfileSale(false);
    }
  };

  const handleUpdateDailyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setIsUpdatingReport(true);
    try {
      const designation = isAdminView ? selectedProfile?.designation : activeStaff?.designation;
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
      
      if (isAdminView && selectedProfile) {
        await fetchProfileDetails(selectedProfile);
      } else if (activeStaff) {
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
      // 1. Fetch profile to get auth_user_id
      const { data: profileRow, error: profileErr } = await supabase
        .from('staff_profiles')
        .select('auth_user_id')
        .eq('id', selectedResetStaff)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profileRow) throw new Error('Staff profile not found.');

      // 2. Update Auth password using service role client if available
      if (profileRow.auth_user_id) {
        if (!supabaseAdmin) {
          throw new Error('Supabase Admin client is not initialized. Please verify VITE_SUPABASE_SERVICE_KEY.');
        }
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          profileRow.auth_user_id,
          { password: newResetPassword.trim() }
        );
        if (authErr) throw authErr;
      }

      // 3. Update plaintext fallback password in db
      const { error: dbErr } = await supabase
        .from('staff_profiles')
        .update({ password: newResetPassword.trim() })
        .eq('id', selectedResetStaff);

      if (dbErr) throw dbErr;

      alert('Password reset successfully!');
      setNewResetPassword('');
      setSelectedResetStaff('');
      setIsSettingsOpen(false);
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // CSV Closing Reports generators
  const handleDownloadAgencyReport = async () => {
    try {
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('client_name, service_package, payment_type, package_amount, received_amount, balance_amount, payment_method, sale_month, created_at');
      if (error) throw error;
      
      const headers = ['Client Name', 'Service Package', 'Payment Type', 'Package Amount', 'Received Amount', 'Balance', 'Payment Method', 'Month', 'Logged At'];
      const rows = (salesData || [])?.map(s => [
        s.client_name,
        s.service_package,
        s.payment_type,
        s.package_amount,
        s.received_amount,
        s.balance_amount,
        s.payment_method || 'UPI',
        s.sale_month,
        s.created_at
      ]);
      
      const csvContent = [headers.join(','), ...rows?.map(r => r?.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Closing_Agency_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message);
    }
  };

  const handleDownloadAcademyReport = async () => {
    try {
      const { data: payData, error } = await supabase
        .from('academy_installments')
        .select('student_id, amount_paid, payment_date, payment_method, transaction_slip_url, notes, created_at, academy_students(student_name)');
      if (error) throw error;
      
      const headers = ['Student Name', 'Amount Paid', 'Payment Date', 'Payment Method', 'Notes', 'Slip URL', 'Logged At'];
      const rows = (payData || [])?.map(p => {
        const name = p.academy_students 
          ? (Array.isArray(p.academy_students) ? (p.academy_students[0] as any)?.student_name : (p.academy_students as any).student_name)
          : 'Enrolled Student';
        return [
          name,
          p.amount_paid,
          p.payment_date,
          p.payment_method,
          p.notes || '',
          p.transaction_slip_url || '',
          p.created_at
        ];
      });
      
      const csvContent = [headers.join(','), ...rows?.map(r => r?.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Closing_Academy_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message);
    }
  };

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

  // Filter daily reports for the selected month
  const monthReports = useMemo(() => {
    return dailyReports?.filter(r => r.report_date && r.report_date.startsWith(selectedMonth));
  }, [dailyReports, selectedMonth]);

  // Financial math for cards (filtered by month)
  const totalPackage = monthSales?.filter(s => s.payment_type !== 'Clearance').reduce((sum, s) => sum + s.package_amount, 0);
  const totalReceived = monthSales.reduce((sum, s) => sum + s.received_amount, 0);
  const totalBalance = monthSales?.filter(s => s.payment_type !== 'Clearance').reduce((sum, s) => sum + Math.max(0, s.package_amount - s.received_amount), 0);

  // Targets
  const targetAmount = activeStaff.monthly_target_amount;
  const targetPercent = targetAmount > 0 ? Math.min(100, Math.round((totalReceived / targetAmount) * 100)) : 0;

  // Filter selected profile's sales for the selected month
  const monthProfileSales = useMemo(() => {
    return profileSales?.filter(s => {
      if (!s.created_at) {
        const [year, month] = selectedMonth.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        const name = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        return s.sale_month === name;
      }
      return s.created_at.startsWith(selectedMonth);
    });
  }, [profileSales, selectedMonth]);

  // Generate chronological serials and map Work SL for selected profile
  const computedProfileSales = useMemo(() => {
    const sorted = [...monthProfileSales]?.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
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
  }, [monthProfileSales]);

  // Filtered sales for the Admin detailed view
  const filteredProfileSales = useMemo(() => {
    return computedProfileSales?.filter(sale => {
      const matchesSearch = sale.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sale.service_package.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || sale.payment_type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [computedProfileSales, searchQuery, activeFilter]);



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
    return computedMonthSales?.filter(sale => {
      const matchesSearch = sale.client_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sale.service_package.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || sale.payment_type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [computedMonthSales, searchQuery, activeFilter]);

  // Sales totals calculator helper
  const getSalesTotals = (salesList: any[]) => {
    let totalPackageAmt = 0;
    let totalRec = 0;
    let totalBal = 0;
    let totalClearing = 0;
    let validWorksCount = 0;
    salesList.forEach(s => {
      if (s.payment_type === 'Clearance') {
        totalClearing += s.received_amount || 0;
      } else {
        totalPackageAmt += s.package_amount || 0;
        totalRec += s.received_amount || 0;
        totalBal += Math.max(0, (s.package_amount || 0) - (s.received_amount || 0));
        validWorksCount += 1;
      }
    });
    return { totalPackageAmt, totalRec, totalBal, totalClearing, validWorksCount };
  };

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
    const designation = isAdminView ? selectedProfile?.designation : activeStaff?.designation;
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex relative overflow-x-hidden">
      
      {/* Dynamic background lighting */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/15 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-24 md:pb-8">
        
        {/* Header */}
        <header className="glass-panel sticky top-0 z-30 px-4 md:px-8 py-3.5 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-base md:text-lg font-bold text-white tracking-wide">
                {isAdminView ? 'Admin Control Dashboard' :  'Consultant Sales Terminal'}
              </h1>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-350 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                {getMonthOptions()?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">


              {isAdminView && (
                <Button 
                  variant="glass" 
                  size="sm" 
                  className="!py-2 !px-3 border border-indigo-500/20 hover:bg-slate-800 text-xs font-bold text-indigo-400 flex items-center gap-1.5" 
                  onClick={() => setIsClosingReportOpen(true)}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Closing Reports</span>
                </Button>
              )}

              {!isAdminView && !isOwner && activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="!py-2 !px-3 shadow-md rounded-xl text-xs font-bold shrink-0 animate-pulse" 
                  onClick={() => {
                    setClientName('');
                    setServicePackage('');
                    setPaymentType('Advance');
                    setPackageAmount('');
                    setReceivedAmount('');
                    setPaymentMethod('UPI');
                    setPaymentProofUrl('');
                    setWorkDescription('');
                    setIsModalOpen(true);
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Log Sale
                </Button>
              )}

              {isOwner && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="!py-2 !px-3 shadow-md rounded-xl text-xs font-bold shrink-0 animate-pulse" 
                  onClick={() => {
                    setClientName('');
                    setServicePackage('');
                    setPaymentType('Advance');
                    setPackageAmount('');
                    setReceivedAmount('');
                    setPaymentMethod('UPI');
                    setPaymentProofUrl('');
                    setWorkDescription('');
                    setOwnerTransactionType('Expense');
                    setIsModalOpen(true);
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Log Transaction
                </Button>
              )}
  
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">
          
          {activeTab === 'sales' && (
 /* sales OR admin dashboard */
            <>
              {/* ADMIN VIEW LAYOUT */}
              {isAdminView && (
                <div className="space-y-6">
                  {/* Leaderboard Marquee */}
                  {renderLeaderboardMarquee()}

                  {/* Overhauled Admin Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Card 1: Revenue Month Agency & Academy separately */}
                    <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between min-h-[160px] border-indigo-500/10">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Month's Revenue Stream</span>
                      <div className="space-y-3.5 mt-3">
                        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Agency sales:</span>
                          <span className="text-base font-extrabold text-white">{formatCurrency(totalReceived)}</span>
                        </div>
                        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-indigo-300 font-bold uppercase">Academy tuition:</span>
                          <span className="text-base font-extrabold text-indigo-400">{formatCurrency(academyRevenue)}</span>
                        </div>
                      </div>
                    </Card>

                    {/* Card 2: Staff Performance Leaderboard */}
                    <Card variant="glass" className="p-5 flex flex-col min-h-[160px] max-h-[180px] overflow-y-auto scrollbar-none border-white/5">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-3">Daily Staff Leaderboard</span>
                      <div className="space-y-2.5">
                        {dailyLeaderboard.slice(0, 5)?.map((item, index) => (
                          <div key={item.name} className="flex items-center justify-between text-xs bg-slate-950/20 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-500">#{index + 1}</span>
                              <span className="font-bold text-slate-200">{item.name}</span>
                            </div>
                            <span className="font-extrabold text-emerald-400">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        {dailyLeaderboard.length === 0 && (
                          <span className="text-[10px] text-slate-500 block text-center py-4 font-bold uppercase">No daily sales logged.</span>
                        )}
                      </div>
                    </Card>

                    {/* Card 3: Today's Attendance Summaries */}
                    <Card variant="glass" glowColor="emerald" className="p-5 flex flex-col justify-between min-h-[160px] border-emerald-500/10">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Today's Attendance Status</span>
                      <div className="grid grid-cols-4 gap-2 text-center mt-3">
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                          <span className="text-lg font-extrabold text-emerald-400">{todayAttendanceStats.present}</span>
                          <span className="text-[8px] text-slate-500 block uppercase font-bold mt-0.5">Present</span>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                          <span className="text-lg font-extrabold text-amber-400">{todayAttendanceStats.late}</span>
                          <span className="text-[8px] text-slate-500 block uppercase font-bold mt-0.5">Late</span>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                          <span className="text-lg font-extrabold text-purple-400">{todayAttendanceStats.halfDay}</span>
                          <span className="text-[8px] text-slate-500 block uppercase font-bold mt-0.5">Half</span>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                          <span className="text-lg font-extrabold text-slate-400">{todayAttendanceStats.leave}</span>
                          <span className="text-[8px] text-slate-500 block uppercase font-bold mt-0.5">Leave</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium block mt-2 text-center">Active tallies for today</span>
                    </Card>
                  </div>
                </div>
              )}

              {/* STAFF VIEW LAYOUT */}
              {!isAdminView && (
                <div className="space-y-6">
                  {/* Top leaderboard banner */}
                  {(activeStaff?.designation?.toLowerCase().includes('sales') || isOwner) && (
                    renderLeaderboardMarquee()
                  )}

                  {/* Standard Staff Cards (Target Goal, Punch-in and Personal stats) */}
                  <div className={`grid grid-cols-1 ${
                    activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer' || activeStaff.designation === 'Videographer' 
                      ? 'max-w-3xl md:grid-cols-2'
                      : 'lg:grid-cols-3'
                  } gap-6`}>
                    {/* Target Card */}
                    {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && activeStaff.designation !== 'Videographer' && !isOwner && (
                      <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between h-full min-h-[185px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Target Goal</p>
                            <p className="text-sm font-semibold text-slate-400 mt-0.5">{formatCurrency(targetAmount)}</p>
                          </div>
                          <span className="text-indigo-400 font-extrabold text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-lg">{targetPercent}% Achieved</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 my-3">
                          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block uppercase font-bold">Collected</span>
                            <span className="text-lg font-extrabold text-emerald-400">{formatCurrency(totalReceived)}</span>
                          </div>
                          <div className="bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block uppercase font-bold">Remaining</span>
                            <span className="text-lg font-extrabold text-amber-500">
                              {totalReceived >= targetAmount ? 'Smashed!' : formatCurrency(targetAmount - totalReceived)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${targetPercent}%` }}></div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Attendance Status Card (Duplicated in Sales Hub) */}
                    <Card variant="glass" className="p-5 flex flex-col justify-between h-full min-h-[185px] border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Current Status</p>
                          <h4 className={`text-sm font-extrabold tracking-wide uppercase mt-1 ${!todayAttendance ? 'text-slate-450' : !todayAttendance.punch_out ? 'text-emerald-400' : 'text-indigo-400'}`}>
                            {!todayAttendance ? 'Not Checked In' : !todayAttendance.punch_out ? 'In Office' : 'Punched Out'}
                          </h4>
                        </div>
                        {todayAttendance && (
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg ${!todayAttendance.punch_out ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10'}`}>
                            {!todayAttendance.punch_out ? 'Active' : 'Completed'}
                          </span>
                        )}
                      </div>

                      <div className="my-2.5 space-y-1">
                        {todayAttendance ? (
                          <p className="text-[10px] text-slate-400 font-semibold">
                             In: <span className="text-white font-bold">{todayAttendance.punch_in}</span>
                            {todayAttendance.punch_out && (
                              <> &bull;  Out: <span className="text-white font-bold">{todayAttendance.punch_out}</span></>
                            )}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Please check in today to log attendance.
                          </p>
                        )}
                        <p className="text-[8.5px] text-slate-550 font-semibold uppercase">
                          Shift: {formatTimeStr(activeStaff?.shift_start_time || '09:30:00')} &bull; End Time: {formatTimeStr(activeStaff?.shift_end_time || ((activeStaff as any).gender === 'Female' ? '17:00:00' : '18:30:00'))}
                        </p>
                      </div>

                      <div className="w-full mt-2">
                        {!todayAttendance ? (
                          <button
                            onClick={() => {
                              setPunchType('IN');
                              setIsPunchModalOpen(true);
                              setIsCameraOpen(true);
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-pink-400/25 cursor-pointer"
                          >
                            PUNCH IN
                          </button>
                        ) : !todayAttendance.punch_out ? (
                          <button
                            onClick={() => {
                              setPunchType('OUT');
                              setIsPunchModalOpen(true);
                              setIsCameraOpen(true);
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-0.5 active:scale-95 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-pink-400/25 cursor-pointer"
                          >
                            PUNCH OUT
                          </button>
                        ) : (
                          <div className="w-full text-center py-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-slate-500 font-bold text-xs uppercase tracking-wider select-none">
                            ✅ Punched Out
                          </div>
                        )}
                      </div>
                    </Card>



                    {/* Monthly Summary Widget for Graphic Designer / Digital Marketer / Videographer */}
                    {(activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer' || activeStaff.designation === 'Videographer') && (() => {
                      const monthlyTotals = getDailyReportTotals(monthReports);
                      return (
                        <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between h-full min-h-[185px]">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Monthly Productivity Summary</p>
                            <h4 className="text-xs font-extrabold text-white mt-1 uppercase tracking-wider">
                              {activeStaff.designation} Overview
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 gap-3.5 my-3.5">
                            {activeStaff.designation === 'Graphic Designer' ? (
                              <>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Posters</span>
                                  <span className="text-sm font-extrabold text-white">{monthlyTotals.totalPosters}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Re-edits</span>
                                  <span className="text-sm font-extrabold text-indigo-400">{monthlyTotals.totalReEdits}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Logos</span>
                                  <span className="text-sm font-extrabold text-emerald-400">{monthlyTotals.totalLogos}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[8px] text-slate-500 block uppercase font-bold">Others</span>
                                  <span className="text-sm font-extrabold text-purple-400">{monthlyTotals.totalOthers}</span>
                                </div>
                              </>
                            ) : activeStaff.designation === 'Videographer' ? (
                              <>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Agency Videos</span>
                                  <span className="text-sm font-extrabold text-white">{monthlyTotals.totalAgencyVideos}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Academy Videos</span>
                                  <span className="text-sm font-extrabold text-indigo-400">{monthlyTotals.totalAcademyVideos}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center">
                                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">External Videos</span>
                                  <span className="text-sm font-extrabold text-emerald-400">{monthlyTotals.totalExternalVideos}</span>
                                </div>
                                <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                                  <span className="text-[7.5px] text-slate-500 block uppercase font-bold">Travel Expenses</span>
                                  <span className="text-[10px] font-extrabold text-purple-400 truncate block mt-0.5">{formatCurrency(monthlyTotals.totalTravelExpenses)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 col-span-2 flex justify-between items-center">
                                <div>
                                  <span className="text-[8.5px] text-slate-500 block uppercase font-bold">Total Ads Placed</span>
                                  <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{monthlyTotals.totalAdsPlaced}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <Star className="w-5 h-5 animate-pulse" />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider flex justify-between items-center pt-2 border-t border-white/5">
                            <span>Month: {selectedMonth}</span>
                            <span className="text-indigo-400">Keep it up!</span>
                          </div>
                        </Card>
                      );
                    })()}

                    {/* Financial Metrics */}
                    {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && activeStaff.designation !== 'Videographer' && (
                      <div className="grid grid-cols-3 md:grid-cols-1 gap-3.5 h-full">
                        <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                          <span className="text-[9px] font-semibold text-slate-455 uppercase">Contract Total</span>
                          <p className="text-sm font-extrabold text-white">{formatCurrency(totalPackage)}</p>
                        </Card>
                        <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                          <span className="text-[9px] font-semibold text-emerald-450 uppercase">Received Total</span>
                          <p className="text-sm font-extrabold text-emerald-400">{formatCurrency(totalReceived)}</p>
                        </Card>
                        <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                          <span className="text-[9px] font-semibold text-amber-455 uppercase">Balance Total</span>
                          <p className="text-sm font-extrabold text-amber-400">{formatCurrency(totalBalance)}</p>
                        </Card>
                      </div>
                    )}

                  </div>
                  <div className="space-y-3 mt-4">
                    {isOwner && (
                      <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                        {['All Sales', 'My Sales']?.map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                              activeFilter === filter
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-slate-900/60 border-white/5 text-slate-455 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Work SL</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Company Name</th>
                                    <th className="py-3 px-4">Package</th>
                                    <th className="py-3 px-4">Payment Method</th>
                                    <th className="py-3 px-4 text-right">Package Amount</th>
                                    <th className="py-3 px-4 text-center">Type</th>
                                    <th className="py-3 px-4 text-right">Received Amount</th>
                                    <th className="py-3 px-4 text-right">Balance Amount</th>
                                    <th className="py-3 px-4 text-right">Balance Clearing</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                                  {filteredProfileSales?.map(sale => {
                                    const isClearance = sale.payment_type === 'Clearance';
                                    const balance = isClearance ? 0 : Math.max(0, sale.package_amount - sale.received_amount);
                                    const dateStr = sale.created_at ? sale.created_at.split('T')[0] : (sale.sale_month || '');
                                    return (
                                      <tr key={sale.id} className="hover:bg-slate-900/10">
                                        <td className="py-3 px-4 font-extrabold text-indigo-400">{sale.work_sl}</td>
                                        <td className="py-3 px-4 text-slate-500">{dateStr}</td>
                                        <td className="py-3 px-4 text-white font-bold">{sale.client_name}</td>
                                        <td className="py-3 px-4 text-slate-400">{sale.service_package}</td>
                                        <td className="py-3 px-4 text-slate-400">{sale.payment_method || 'Bank Transfer'}</td>
                                        <td className="py-3 px-4 text-right">
                                          {isClearance ? '-' : formatCurrency(sale.package_amount)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'info' : 'purple'}>
                                            {sale.payment_type}
                                          </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-right text-emerald-400">
                                          {isClearance ? '-' : formatCurrency(sale.received_amount)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-amber-500">
                                          {isClearance ? '-' : formatCurrency(balance)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-purple-400">
                                          {isClearance ? formatCurrency(sale.received_amount) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <Button 
                                              variant="glass" 
                                              size="sm" 
                                              className="!py-1 !px-2 text-[10px] border-white/5"
                                              onClick={() => handleViewSlip(sale)}
                                            >
                                              View Slip
                                            </Button>
                                            <Button
                                              variant="glass"
                                              size="sm"
                                              onClick={() => {
                                                setEditingProfileSale(sale);
                                                setEditProfileClientName(sale.client_name);
                                                setEditProfilePackageAmt(sale.package_amount.toString());
                                                setEditProfileRecAmt(sale.received_amount.toString());
                                                setEditProfileServicePkg(sale.service_package || '');
                                                setEditProfilePaymentType(sale.payment_type || 'Advance');
                                                setEditProfilePaymentMethod((sale.payment_method as any) || 'UPI');
                                                setEditProfileSaleDate(sale.created_at ? sale.created_at.split('T')[0] : '');
                                              }}
                                              className="!py-1 !px-2 text-[10px] border-white/5 text-indigo-400"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {filteredProfileSales.length === 0 && (
                                    <tr>
                                      <td colSpan={11} className="text-center py-8 text-slate-655 font-semibold">No sales recorded.</td>
                                    </tr>
                                  )}
                                </tbody>
                                {filteredProfileSales.length > 0 && (() => {
                                  const { totalPackageAmt, totalRec, totalBal, totalClearing, validWorksCount } = getSalesTotals(filteredProfileSales);
                                  return (
                                    <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                                      <tr>
                                        <td className="py-3.5 px-4 text-left text-indigo-400 font-bold text-[9px] uppercase tracking-wider">
                                          Total Works: {validWorksCount}
                                        </td>
                                        <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-[9px] text-slate-400">Totals:</td>
                                        <td className="py-3.5 px-4 text-right">{formatCurrency(totalPackageAmt)}</td>
                                        <td></td>
                                        <td className="py-3.5 px-4 text-right text-emerald-400">{formatCurrency(totalRec)}</td>
                                        <td className="py-3.5 px-4 text-right text-amber-500">{formatCurrency(totalBal)}</td>
                                        <td className="py-3.5 px-4 text-right text-purple-400">{formatCurrency(totalClearing)}</td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  );
                                })()}
                              </table>
                            </div>

                            {/* Edit Sale form inline overlay */}
                            {editingProfileSale && (
                              <Card variant="glass" className="p-4 border-indigo-500/20 bg-slate-950/40 mt-3 max-w-md space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Override Sale Record</h4>
                                <form onSubmit={handleUpdateProfileSale} className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                  <div className="space-y-1 col-span-2 sm:col-span-3">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Client Name</label>
                                    <input 
                                      type="text" 
                                      required
                                      value={editProfileClientName}
                                      onChange={(e) => setEditProfileClientName(e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2 sm:col-span-3">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Service Package</label>
                                    <input 
                                      type="text" 
                                      required
                                      value={editProfileServicePkg}
                                      onChange={(e) => setEditProfileServicePkg(e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2 sm:col-span-3">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Sale Date</label>
                                    <input 
                                      type="date" 
                                      required
                                      value={editProfileSaleDate}
                                      onChange={(e) => setEditProfileSaleDate(e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Payment Status</label>
                                    <select
                                      value={editProfilePaymentType}
                                      onChange={(e) => {
                                        const val = e.target.value as any;
                                        setEditProfilePaymentType(val);
                                        if (val === 'Full') {
                                          setEditProfileRecAmt(editProfilePackageAmt);
                                        } else if (val === 'Clearance') {
                                          setEditProfilePackageAmt('0');
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                                    >
                                      <option value="Advance">Advance</option>
                                      <option value="Full">Full Payment</option>
                                      <option value="Clearance">Balance Clearing</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1 col-span-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Package (₹)</label>
                                    <input 
                                      type="number" 
                                      required
                                      disabled={editProfilePaymentType === 'Clearance'}
                                      value={editProfilePackageAmt}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setEditProfilePackageAmt(val);
                                        if (editProfilePaymentType === 'Full') {
                                          setEditProfileRecAmt(val);
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Received (₹)</label>
                                    <input 
                                      type="number" 
                                      required
                                      disabled={editProfilePaymentType === 'Full'}
                                      value={editProfileRecAmt}
                                      onChange={(e) => setEditProfileRecAmt(e.target.value)}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-1">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase">Method</label>
                                    <select
                                      value={editProfilePaymentMethod}
                                      onChange={(e) => setEditProfilePaymentMethod(e.target.value as any)}
                                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                                    >
                                      <option value="UPI">UPI</option>
                                      <option value="Bank Transfer">Bank Transfer</option>
                                      <option value="Cash">Cash</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-2 items-end pt-2 col-span-2 sm:col-span-3">
                                    <Button variant="secondary" size="sm" onClick={() => setEditingProfileSale(null)}>Cancel</Button>
                                    <Button type="submit" variant="primary" size="sm" disabled={isUpdatingProfileSale}>Save</Button>
                                  </div>
                                </form>
                              </Card>
                            )}
                          
                      </div>
                    )}

                    {/* TAB CONTENT: ATTENDANCE log */}
                    {profileDetailTab === 'attendance' && (
                      <AttendanceDashboard 
                        staffId={selectedStaffId || selectedProfile.id}
                        fullName={selectedProfile.full_name}
                        designation={selectedProfile.designation}
                        gender={selectedProfile.gender}
                        avatarUrl={selectedProfile.avatar_url}
                        isAdmin={true}
                        onOverrideSuccess={async () => {
                          if (selectedProfile) {
                            await fetchProfileDetails(selectedProfile);
                          }
                        }}
                      />
                    )}

                    {/* TAB CONTENT: LEADS */}
                    {profileDetailTab === 'leads' && (() => {
                      const totalLeads = profileLeads.length;
                      const conversionCount = profileLeads?.filter(l => l.status === 'Positive' || l.status === 'Closed').length;
                      return (
                        <div className="space-y-4">
                          {/* Overview Stats */}
                          <div className="grid grid-cols-2 gap-4 max-w-sm">
                            <Card variant="glass" className="p-3.5 border-white/5">
                              <span className="text-[9px] font-bold text-slate-455 uppercase block">Total Assigned Leads</span>
                              <p className="text-sm font-extrabold text-white mt-1">{totalLeads}</p>
                            </Card>
                            <Card variant="glass" className="p-3.5 border-white/5">
                              <span className="text-[9px] font-bold text-emerald-500 uppercase block">Conversions (Positive/Closed)</span>
                              <p className="text-sm font-extrabold text-emerald-400 mt-1">{conversionCount}</p>
                            </Card>
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                  <th className="py-3 px-4">Lead Name</th>
                                  <th className="py-3 px-4">Location</th>
                                  <th className="py-3 px-4">Service/Package</th>
                                  <th className="py-3 px-4">Contact Info</th>
                                  <th className="py-3 px-4">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                                {profileLeads?.map(lead => (
                                  <tr key={lead.id} className="hover:bg-slate-900/10">
                                    <td className="py-3 px-4 text-white font-bold">{lead.lead_name}</td>
                                    <td className="py-3 px-4 text-slate-400">{lead.location || '-'}</td>
                                    <td className="py-3 px-4 text-indigo-400">{lead.project_name || '-'}</td>
                                    <td className="py-3 px-4 text-slate-400">{lead.whatsapp_number}</td>
                                    <td className="py-2.5 px-3">
                                      <Badge variant={
                                        lead.status === 'Closed' ? 'success' :
                                        lead.status === 'Positive' ? 'success' :
                                        lead.status === 'Follow-up' ? 'warning' :
                                        lead.status === 'No Response' ? 'error' : 'info'
                                      }>
                                        {lead.status || 'New'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                                {profileLeads.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">
                                      No leads currently assigned to this staff member.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}


                 {
                  (() => {
                    const salesTeam = staffProfiles?.filter(p => p.designation === 'Sales Executive');
                    const creativeTeam = staffProfiles?.filter(p => p.designation !== 'Sales Executive');
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                            <Star className="w-5 h-5 text-indigo-400" />
                            Staff Performance Registers
                          </h2>
                          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                            {staffProfiles.length} Accounts
                          </span>
                        </div>

                        {/* SECTION 1: SALES TEAM */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
                            Sales Team ({salesTeam.length})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {salesTeam?.map(member => (
                              <div 
                                key={member.id}
                                onClick={() => handleSelectProfile(member)}
                                className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-center hover:bg-slate-900/60"
                              >
                                <img 
                                  src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                                  alt="" 
                                  className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0" 
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-white text-sm truncate leading-tight">{member.full_name}</h4>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-indigo-400 font-bold">{member.designation}</span>
                                    <span className="text-[9px] text-slate-650">•</span>
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Off: {member.weekly_off_day}</span>
                                  </div>
                                  
                                  <div className="mt-2.5 text-[9.5px] text-slate-400 space-y-0.5 font-semibold">
                                    <div className="flex gap-2">
                                      <span>Target: <span className="text-slate-200">{formatCurrency(member.monthly_target_amount || 0)}</span></span>
                                      <span>Achieved: <span className="text-emerald-400">{formatCurrency(member.achieved || 0)}</span></span>
                                    </div>
                                    <div className="flex gap-2 text-slate-550">
                                      <span>Works: <span className="text-indigo-300">{member.salesWorks || 0}</span></span>
                                      <span>Att: <span className="text-slate-350">{member.attendanceP || 0}/{member.attendanceL || 0}</span></span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {salesTeam.length === 0 && (
                              <p className="text-xs text-slate-600 font-bold py-2 col-span-3">No sales team profiles found.</p>
                            )}
                          </div>
                        </div>

                        {/* SECTION 2: SUPPORT & CREATIVE TEAM */}
                        <div className="space-y-3 pt-2">
                          <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider border-l-2 border-purple-500 pl-2">
                            Support & Creative Team ({creativeTeam.length})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {creativeTeam?.map(member => (
                              <div 
                                key={member.id}
                                onClick={() => handleSelectProfile(member)}
                                className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-center hover:bg-slate-900/60"
                              >
                                <img 
                                  src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                                  alt="" 
                                  className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0" 
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-white text-sm truncate leading-tight">{member.full_name}</h4>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-purple-400 font-bold">{member.designation}</span>
                                    <span className="text-[9px] text-slate-650">•</span>
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">Off: {member.weekly_off_day}</span>
                                  </div>
                                  
                                  <div className="mt-2.5 text-[9.5px] text-slate-400 space-y-0.5 font-semibold">
                                    <div className="flex gap-2">
                                      <span>Works: <span className="text-indigo-300">{member.creativeWorks || 0}</span></span>
                                      <span>Att: <span className="text-slate-350">{member.attendanceP || 0}/{member.attendanceL || 0}</span></span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {creativeTeam.length === 0 && (
                              <p className="text-xs text-slate-600 font-bold py-2 col-span-3">No support or creative team profiles found.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}






          </>
        )}

          {activeTab === 'history' && (
            <div className="space-y-6 pt-2">
              {isCreativeRole && (
                /* CREATIVE / MARKETING MODE - DAILY REPORTS LOGGING & HISTORY */
                <div className="space-y-6">
                  {/* Daily Report form submission */}
                  <Card variant="glass" className="p-5 border-white/5 relative">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-2">
                      <Edit2 className="w-5 h-5 text-indigo-400" />
                      Log Your Daily Activity Work
                    </h3>
                    <p className="text-xs text-slate-400 mb-5">Submit your poster completions, work logs, or campaign ad placements once at the end of the day.</p>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSubmittingReport(true);
                        try {
                          if (activeStaff.designation === 'Graphic Designer') {
                            const pCount = Number(postersCount) || 0;
                            const rCount = Number(reEditsCount) || 0;
                            const lCount = Number(logosCount) || 0;
                            const oCount = Number(othersCount) || 0;
                            await addDailyReport({
                              workType: 'Graphic Design',
                              description: dailyWorkDesc.trim() || `Posters: ${pCount}, Re-edits: ${rCount}, Logos: ${lCount}, Others: ${oCount}`,
                              postersCount: pCount,
                              reEditsCount: rCount,
                              logosCount: lCount,
                              othersCount: oCount
                            });
                            setPostersCount('');
                            setReEditsCount('');
                            setLogosCount('');
                            setOthersCount('');
                          } else if (activeStaff.designation === 'Digital Marketer') {
                            const apCount = Number(adsPlacedCount) || 0;
                            await addDailyReport({
                              workType: 'Digital Marketing',
                              description: dailyWorkDesc.trim() || `Ads Placed: ${apCount}`,
                              adsPlacedCount: apCount
                            });
                            setAdsPlacedCount('');
                          } else if (activeStaff.designation === 'Videographer') {
                            const vCount = Number(videoCount) || 0;
                            const tExp = Number(videoTravelExpense) || 0;
                            await addDailyReport({
                              workType: 'Video Work',
                              description: dailyWorkDesc.trim() || `${videoWorkCategory}: ${vCount} videos, Travel: ${formatCurrency(tExp)}`,
                              workCategory: videoWorkCategory,
                              clientName: videoClientName,
                              videosCount: vCount,
                              travelExpense: tExp
                            });
                            setVideoCount('');
                            setVideoTravelExpense('');
                          } else {
                            if (!dailyWorkType || !dailyWorkDesc.trim()) return;
                            await addDailyReport({
                              workType: dailyWorkType,
                              description: dailyWorkDesc.trim()
                            });
                            setDailyWorkType('');
                          }
                          setDailyWorkDesc('');
                          alert('Daily report submitted successfully!');
                        } catch (err: any) {
                          alert('Failed to log report: ' + err.message);
                        } finally {
                          setIsSubmittingReport(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      {activeStaff.designation === 'Graphic Designer' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Total Posters</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={postersCount}
                              onChange={(e) => setPostersCount(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Total Re-edits</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={reEditsCount}
                              onChange={(e) => setReEditsCount(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Total Logos</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={logosCount}
                              onChange={(e) => setLogosCount(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Others (OTH)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={othersCount}
                              onChange={(e) => setOthersCount(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : activeStaff.designation === 'Digital Marketer' ? (
                        <div className="space-y-1.5 max-w-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Total Ads Placed</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            min="0"
                            value={adsPlacedCount}
                            onChange={(e) => setAdsPlacedCount(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                      ) : activeStaff.designation === 'Videographer' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Work Category</label>
                            <select
                              required
                              value={videoWorkCategory}
                              onChange={(e) => {
                                setVideoWorkCategory(e.target.value);
                                if (e.target.value !== 'External Client') {
                                  setVideoClientName('Tech Ads');
                                } else if (videoClientName === 'Tech Ads') {
                                  setVideoClientName('');
                                }
                              }}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            >
                              <option value="Tech Ads Agency">Tech Ads Agency</option>
                              <option value="Tech Ads Academy">Tech Ads Academy</option>
                              <option value="External Client">External Client</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Client/Company Name</label>
                            <input 
                              type="text" 
                              required={videoWorkCategory === 'External Client'}
                              disabled={videoWorkCategory !== 'External Client'}
                              placeholder="Tech Ads"
                              value={videoClientName}
                              onChange={(e) => setVideoClientName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none disabled:opacity-50"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Number of Videos</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={videoCount}
                              onChange={(e) => setVideoCount(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Travel Expense (₹)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              min="0"
                              value={videoTravelExpense}
                              onChange={(e) => setVideoTravelExpense(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Work Log Category</label>
                            <select
                              required
                              value={dailyWorkType}
                              onChange={(e) => setDailyWorkType(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                            >
                              <option value="">Select Category</option>
                              <option value="Video Shoot">Video Shoot</option>
                              <option value="Editing/Polish">Editing/Polish</option>
                              <option value="General Task">General Task</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Log Date</label>
                            <input
                              type="date"
                              disabled
                              value={new Date().toISOString().split('T')[0]}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500 focus:outline-none cursor-not-allowed"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Description / Notes {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' ? '' : '(Optional)'}</label>
                        <textarea
                          required={activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer'}
                          rows={3}
                          placeholder="Provide details about the designs completed, ad placements set, or video scripts processed..."
                          value={dailyWorkDesc}
                          onChange={(e) => setDailyWorkDesc(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-655 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmittingReport}
                        className="text-xs font-bold py-2 px-6"
                      >
                        {isSubmittingReport ? 'Saving Log...' : 'Submit Daily Log'}
                      </Button>
                    </form>
                  </Card>

                  {/* Daily Report List history */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">My Submissions ({selectedMonth})</h3>
                    {renderDailyReportsTable(monthReports, activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer')}
                  </div>
                </div>
              )} { !isCreativeRole && (
                /* STAFF MODE - READ-ONLY SALES HISTORY */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-400" />
                      My Sales History Log (Read-Only)
                    </h2>
                    <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                      {filteredSales.length} Records
                    </span>
                  </div>

                  {/* Top Overview Metric Cards */}
                  {(() => {
                    const totals = getSalesTotals(filteredSales);
                    const combinedReceived = totals.totalRec + totals.totalClearing;
                    const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((combinedReceived / targetAmount) * 100)) : 0;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card variant="glass" className="p-3.5 border-white/5">
                          <span className="text-[9px] font-bold text-slate-455 uppercase block">Total Package</span>
                          <p className="text-sm font-extrabold text-white mt-1">{formatCurrency(totals.totalPackageAmt)}</p>
                        </Card>
                        <Card variant="glass" className="p-3.5 border-white/5">
                          <span className="text-[9px] font-bold text-emerald-500 uppercase block">Total Received</span>
                          <p className="text-sm font-extrabold text-emerald-400 mt-1">{formatCurrency(combinedReceived)}</p>
                        </Card>
                        <Card variant="glass" className="p-3.5 border-white/5">
                          <span className="text-[9px] font-bold text-amber-500 uppercase block">Total Balance</span>
                          <p className="text-sm font-extrabold text-amber-400 mt-1">{formatCurrency(totals.totalBal)}</p>
                        </Card>
                        <Card variant="glass" className="p-3.5 border-white/5 col-span-2 md:col-span-1">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase block">Target Progress</span>
                          <p className="text-[10px] font-extrabold text-white mt-1.5 leading-none">
                            {formatCurrency(combinedReceived)} / {formatCurrency(targetAmount)}
                          </p>
                          <div className="w-full bg-slate-950/80 rounded-full h-1 mt-2 overflow-hidden border border-white/5">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-[8px] text-indigo-400 font-bold block mt-1">{progressPercent}% Achieved</span>
                        </Card>
                      </div>
                    );
                  })()}

                                              {/* Filters & Quick Buttons */}
                  
                      <div className="space-y-3 mt-4">
                      {isOwner && (
                        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                          <button
                            onClick={() => setOwnerHistoryTab('Income')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                              ownerHistoryTab === 'Income' 
                                ? 'bg-indigo-500 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Incomes
                          </button>
                          <button
                            onClick={() => setOwnerHistoryTab('Expense')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                              ownerHistoryTab === 'Expense' 
                                ? 'bg-rose-500 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Expenses
                          </button>
                        </div>
                      )}
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="Search client or service package..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['All', 'Full', 'Advance', 'Clearance']?.map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setActiveFilter(filter as any)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                            activeFilter === filter
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                              : 'bg-slate-900/60 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Work SL</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Company Name</th>
                          <th className="py-3 px-4">Package</th>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4 text-right">Package Amount</th>
                          <th className="py-3 px-4 text-center">Type</th>
                          <th className="py-3 px-4 text-right">Received Amount</th>
                          <th className="py-3 px-4 text-right">Balance Amount</th>
                          <th className="py-3 px-4 text-right">Balance Clearing</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                        {filteredSales?.map(sale => {
                          const isClearance = sale.payment_type === 'Clearance';
                          const balance = isClearance ? 0 : Math.max(0, sale.package_amount - sale.received_amount);
                          const dateStr = sale.created_at ? sale.created_at.split('T')[0] : (sale.sale_month || '');
                          return (
                            <tr key={sale.id} className="hover:bg-slate-900/10">
                              <td className="py-3 px-4 font-extrabold text-indigo-400">{sale.work_sl}</td>
                              <td className="py-3 px-4 text-slate-500">{dateStr}</td>
                              <td className="py-3 px-4 text-white font-bold">{sale.client_name}</td>
                              <td className="py-3 px-4 text-slate-400">{sale.service_package}</td>
                              <td className="py-3 px-4 text-slate-400">{sale.payment_method || 'Bank Transfer'}</td>
                              <td className="py-3 px-4 text-right">
                                {isClearance ? '-' : formatCurrency(sale.package_amount)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'info' : 'purple'}>
                                  {sale.payment_type}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400">
                                {isClearance ? '-' : formatCurrency(sale.received_amount)}
                              </td>
                              <td className="py-3 px-4 text-right text-amber-500">
                                {isClearance ? '-' : formatCurrency(balance)}
                              </td>
                              <td className="py-3 px-4 text-right text-purple-400">
                                {isClearance ? formatCurrency(sale.received_amount) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button 
                                    variant="glass" 
                                    size="sm" 
                                    className="!py-1 !px-2 text-[10px] border-white/5"
                                    onClick={() => handleViewSlip(sale)}
                                  >
                                    View Slip
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredSales.length === 0 && (
                          <tr>
                            <td colSpan={11} className="text-center py-8 text-slate-600 font-semibold">No sales recorded.</td>
                          </tr>
                        )}
                      </tbody>
                      {filteredSales.length > 0 && (() => {
                        const { totalPackageAmt, totalRec, totalBal, totalClearing, validWorksCount } = getSalesTotals(filteredSales);
                        return (
                          <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                            <tr>
                              <td className="py-3.5 px-4 text-left text-indigo-400 font-bold text-[9px] uppercase tracking-wider">
                                Total Works: {validWorksCount}
                              </td>
                              <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-[9px] text-slate-400">Totals:</td>
                              <td className="py-3.5 px-4 text-right">{formatCurrency(totalPackageAmt)}</td>
                              <td></td>
                              <td className="py-3.5 px-4 text-right text-emerald-400">{formatCurrency(totalRec)}</td>
                              <td className="py-3.5 px-4 text-right text-amber-500">{formatCurrency(totalBal)}</td>
                              <td className="py-3.5 px-4 text-right text-purple-400">{formatCurrency(totalClearing)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        );
                      })()}
                    </table>
                  </div>
                
                </div>
              )}
            </div>
          )}

          {/* EXPENSE HISTORY TAB MODULE */}
                    {activeTab === 'history' && (
            <section className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Sales History Log</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">All Staff Submissions</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Staff</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                    {computedMonthSales.length > 0 ? computedMonthSales?.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-slate-900/10">
                        <td className="py-3 px-4">
                          {new Date(sale.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 flex items-center gap-2">
                          {sale.staff?.avatar_url && (
                             <img src={sale.staff.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                          )}
                          <span>{sale.staff?.full_name || 'Staff'}</span>
                        </td>
                        <td className="py-3 px-4">{sale.client_name}</td>
                        <td className="py-3 px-4"><Badge variant="info">{sale.project_name || 'Service'}</Badge></td>
                        <td className="py-3 px-4">
                          <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'warning' : 'info'}>
                            {sale.payment_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sale.received_amount)}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-8 text-slate-500 font-bold">No sales logged this month.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'expense_history' && (
            <section className="space-y-6 pt-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Expense History</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Owner Log</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 mt-6">
                  <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                      {ownerExpenses.length > 0 ? ownerExpenses?.filter(exp => exp.expense_date.startsWith(selectedMonth))?.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-900/10">
                          <td className="py-3 px-4">{new Date(exp.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-4"><Badge variant="info">{exp.category}</Badge></td>
                          <td className="py-3 px-4">{exp.description}</td>
                          <td className="py-3 px-4 text-right text-rose-400 font-bold">{formatCurrency(exp.amount)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} className="text-center py-8 text-slate-500 font-bold">No expenses logged yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </section>
          )}

          {/* LEADS TAB MODULE */}
          {activeTab === 'leads' && (
            <section className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-indigo-400" />
                  Lead Management Hub
                </h2>
                <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold font-mono">
                  {leadsList.length} Leads
                </span>
              </div>

              {activeStaff?.designation === 'Digital Marketer' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Add & Upload Leads Form */}
                  <Card variant="glass" className="lg:col-span-1 p-5 border-white/5 space-y-5 h-fit">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Lead</h3>
                      <p className="text-[11px] text-slate-400 mt-1">Manually enter lead information.</p>
                    </div>

                    <form onSubmit={handleAddLead} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lead Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={newLeadName}
                          onChange={(e) => setNewLeadName(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                        <input
                          type="text"
                          placeholder="Delhi, India"
                          value={newLeadLocation}
                          onChange={(e) => setNewLeadLocation(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp / Phone Number</label>
                        <input
                          type="text"
                          required
                          placeholder="919876543210"
                          value={newLeadPhone}
                          onChange={(e) => setNewLeadPhone(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Service / Package interested in</label>
                        <input
                          type="text"
                          placeholder="Web Design & SEO"
                          value={newLeadPackage}
                          onChange={(e) => setNewLeadPackage(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full text-xs py-2 rounded-xl font-bold uppercase tracking-wider mt-2"
                        disabled={isSubmittingLead}
                      >
                        {isSubmittingLead ? 'Adding...' : 'Add Lead'}
                      </Button>
                    </form>

                    <div className="border-t border-white/5 pt-4">
                      <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2">Bulk Upload Leads via CSV</h4>
                      <label className="flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 bg-slate-950/40 hover:bg-slate-900/20 cursor-pointer transition-all">
                        <Upload className="w-5 h-5 text-indigo-400 mb-1.5" />
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Choose CSV File</span>
                        <span className="text-[8px] text-slate-500 mt-1">Format: Name, Location, Phone, Package</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </Card>

                  {/* Right: Lead Distribution Table */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card variant="glass" className="p-4 border-white/5">
                      <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-3">Distributed Leads</h3>
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-2.5 px-3">Lead Name</th>
                              <th className="py-2.5 px-3">Location</th>
                              <th className="py-2.5 px-3">Contact</th>
                              <th className="py-2.5 px-3">Service Interest</th>
                              <th className="py-2.5 px-3">Assigned To</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                            {leadsList?.map(lead => (
                              <tr key={lead.id} className="hover:bg-slate-900/10">
                                <td className="py-2.5 px-3 text-white font-bold">{lead.lead_name}</td>
                                <td className="py-2.5 px-3 text-slate-400">{lead.location || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-400">{lead.whatsapp_number}</td>
                                <td className="py-2.5 px-3 text-indigo-400">{lead.project_name || '-'}</td>
                                <td className="py-2.5 px-3">
                                  <select
                                    value={lead.assigned_to || ''}
                                    onChange={async (e) => {
                                      const val = e.target.value || null;
                                      try {
                                        const { error } = await supabase
                                          .from('leads')
                                          .update({ assigned_to: val })
                                          .eq('id', lead.id);
                                        if (error) throw error;
                                        alert('Lead assigned successfully!');
                                        fetchLeads();
                                      } catch (err: any) {
                                        alert('Failed to assign lead: ' + err.message);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="">Unassigned</option>
                                    {salesStaff?.map(s => (
                                      <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge variant={
                                    lead.status === 'Closed' ? 'success' :
                                    lead.status === 'Positive' ? 'success' :
                                    lead.status === 'Follow-up' ? 'warning' :
                                    lead.status === 'No Response' ? 'error' : 'info'
                                  }>
                                    {lead.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                            {leadsList.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-600 font-semibold">No leads distributed yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeStaff?.designation === 'Sales Executive' && (
                <Card variant="glass" className="p-5 border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Assigned Leads</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Lead Name</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Service Interest</th>
                          <th className="py-3 px-4">Status Dropdown</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                        {leadsList?.map(lead => (
                          <tr key={lead.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-4 text-white font-bold">{lead.lead_name}</td>
                            <td className="py-3 px-4 text-slate-400">{lead.location || '-'}</td>
                            <td className="py-3 px-4 text-indigo-400">{lead.project_name || '-'}</td>
                            <td className="py-3 px-4">
                              <select
                                value={lead.status || 'New'}
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  try {
                                    const { error } = await supabase
                                      .from('leads')
                                      .update({ status: val })
                                      .eq('id', lead.id);
                                    if (error) throw error;
                                    alert('Lead status updated successfully!');
                                    fetchLeads();
                                  } catch (err: any) {
                                    alert('Failed to update status: ' + err.message);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                              >
                                <option value="New">New</option>
                                <option value="Positive">Positive</option>
                                <option value="Follow-up">Follow-up</option>
                                <option value="Closed">Closed</option>
                                <option value="No Response">No Response</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <a
                                href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all shadow-md shadow-emerald-950/20"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                              </a>
                            </td>
                          </tr>
                        ))}
                        {leadsList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">No leads currently assigned to you.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>
          )}

          {/* ADMIN ONLY - DAILY REPORTS LOG FULL PAGE VIEW */}
          {activeTab === 'reports' && (
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                  Graphic & Digital Marketing Work Registers
                </h2>
                <span className="text-xs bg-slate-805 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                  {monthReports.length} Logs
                </span>
              </div>

              {/* Daily Reports logs table */}
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Task Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                    {monthReports?.map((report: any) => (
                      <tr key={report.id} className="hover:bg-slate-900/10">
                        <td className="py-3 px-4 text-slate-500">{report.report_date}</td>
                        <td className="py-3 px-4 text-white font-extrabold">{report.staff_name}</td>
                        <td className="py-3 px-4 font-bold text-indigo-400">
                          <Badge variant="info">{report.work_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-md" title={report.description}>{report.description}</td>
                      </tr>
                    ))}
                    {monthReports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-600 font-semibold">No daily reports logged for this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ADMIN CLOSING REPORT MODAL - WITH CSV EXPORT BUTTONS */}
      {isClosingReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setIsClosingReportOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              Daily Closing Reports
            </h3>
            <p className="text-xs text-slate-400 mb-6">Review today's financial summary before downloading report logs.</p>
            
            {todaySummary.loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-450 gap-2 text-xs">
                <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading today's summary...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Section 1: Tech Ads Agency */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Tech Ads Agency</span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase">Today</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="text-[9px] text-slate-550 font-bold uppercase block">Total Sales Amount</span>
                      <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(todaySummary.agencySalesAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-550 font-bold uppercase block">Sales Logs Tally</span>
                      <span className="text-sm font-extrabold text-slate-200">{todaySummary.agencySalesCount} logs</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="primary" 
                      fullWidth 
                      onClick={handleDownloadAgencyReport}
                      className="py-2.5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider animate-scale-up"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Agency Sales Log</span>
                    </Button>
                  </div>
                </div>

                {/* Section 2: Techads Academy */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Techads Academy</span>
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-extrabold uppercase">Today</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="text-[9px] text-slate-550 font-bold uppercase block">Tuition Collected</span>
                      <span className="text-sm font-extrabold text-indigo-400">{formatCurrency(todaySummary.academyFeesAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-550 font-bold uppercase block">Fee Logs Tally</span>
                      <span className="text-sm font-extrabold text-slate-200">{todaySummary.academyFeesCount} logs</span>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="success" 
                      fullWidth 
                      onClick={handleDownloadAcademyReport}
                      className="py-2.5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider animate-scale-up"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Academy Fees Log</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-2 border-t border-slate-800">
              <Button variant="secondary" fullWidth onClick={() => setIsClosingReportOpen(false)}>Close Modal</Button>
            </div>
          </Card>
        </div>
      )}

      {/* LOG SALE MODAL (STAFF VIEW LOG SALE FORM) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-white text-sm uppercase">Log New Client Sale</h3>
            </div>

            {isOwner && (
              <div className="flex p-1 bg-slate-950/50 rounded-xl border border-white/5 w-full mb-4">
                <button
                  type="button"
                  onClick={() => setOwnerTransactionType('Expense')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    ownerTransactionType === 'Expense' 
                      ? 'bg-rose-500 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Log Expense
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTransactionType('Income')}
                  className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                    ownerTransactionType === 'Income' 
                      ? 'bg-indigo-500 text-white shadow-lg' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Log Sale
                </button>
              </div>
            )}


            
            {(!isOwner || ownerTransactionType === 'Income') ? (
              <form onSubmit={handleLogSale} className="space-y-3.5">
  
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Client / Company Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Service Package</label>
                <select
                  value={servicePackage}
                  onChange={(e) => setServicePackage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Select Package</option>
                  <option value="CEO Pack">CEO Pack</option>
                  <option value="SMM">SMM</option>
                  <option value="SEO">SEO</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Website">Website</option>
                  <option value="Logo">Logo</option>
                  <option value="Poster">Poster</option>
                  <option value="E-Commerce">E-Commerce</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</label>
                <select
                  value={paymentType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setPaymentType(val);
                    if (val === 'Clearance') {
                      setPackageAmount('0');
                    } else if (val === 'Full') {
                      setReceivedAmount(packageAmount);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="Full">Full Payment</option>
                  <option value="Advance">Advance Deposit</option>
                  <option value="Clearance">Balance Clearing</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Package Price (₹)</label>
                  <input 
                    type="number" 
                    required={paymentType !== 'Clearance'}
                    disabled={paymentType === 'Clearance'}
                    placeholder="e.g. 50000"
                    value={paymentType === 'Clearance' ? '0' : packageAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPackageAmount(val);
                      if (paymentType === 'Full') {
                        setReceivedAmount(val);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Received Amount (₹)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 20000"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Payment Proof Slip</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="slip-upload"
                  />
                  <label 
                    htmlFor="slip-upload"
                    className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 cursor-pointer font-bold hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    Select File
                  </label>
                  {paymentProofUrl && (
                    <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px]">Attached ✔</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Work Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on delivery specs..."
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth disabled={isLoggingSale || isUploadingProof}>
                  {isLoggingSale ? 'Saving...' : 'Register Sale'}
                </Button>
              </div>
            </form>

            ) : (
              <form onSubmit={handleOwnerSubmitExpense} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expense Category</label>
                  <select
                    value={ownerExpCategory}
                    onChange={(e) => setOwnerExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Rent">Rent</option>
                    <option value="Internet & Recharge">Internet & Recharge</option>
                    <option value="Food & Drinks">Food & Drinks</option>
                    <option value="EMI">EMI</option>
                    <option value="Repair & Maintenance">Repair & Maintenance</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    value={ownerExpAmount}
                    onChange={(e) => setOwnerExpAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief description..."
                    value={ownerExpDescription}
                    onChange={(e) => setOwnerExpDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={ownerExpDate}
                    onChange={(e) => setOwnerExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2.5 pt-4 border-t border-slate-800">
                  <Button type="button" variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" fullWidth disabled={isSubmittingOwnerExp} className="!bg-rose-600 hover:!bg-rose-700">
                    {isSubmittingOwnerExp ? 'Saving...' : 'Log Expense'}
                  </Button>
                </div>
              </form>
            )}

</Card>
</div>
      )}

      {/* Hidden canvas for selfie snapshots */}
      <canvas ref={canvasRef} className="hidden" width={640} height={480} />

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
               Panel
            </h3>
            <p className="text-xs text-slate-400 mb-6">Manage application configurations and preferences.</p>

            {/* Admin-only password reset */}
            {isAdminMode ? (
              <div className="space-y-4 border-t border-white/5 pt-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Admin Only: Staff Password Reset</h4>
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Select Staff Member</label>
                    <select
                      required
                      value={selectedResetStaff}
                      onChange={(e) => setSelectedResetStaff(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="">Choose Staff</option>
                      {staffProfiles?.map(staff => (
                        <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.username})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter new password"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    fullWidth 
                    disabled={isResettingPassword}
                    className="text-xs font-bold py-2 mt-2"
                  >
                    {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-500 font-medium">
                🔒 System settings are restricted to administrative accounts.
              </div>
            )}

            <div className="mt-6 pt-2 border-t border-slate-800">
              <Button variant="secondary" fullWidth onClick={() => setIsSettingsOpen(false)}>Close Panel</Button>
            </div>
          </Card>
        </div>
      )}
      {/* PUNCH MODAL */}
      {isPunchModalOpen && (() => {
        const distance = userCoords 
          ? getHaversineDistance(userCoords.lat, userCoords.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng) 
          : null;
        const isOutOfRange = distance === null || distance > 20000;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <Card variant="glass" className="w-full max-w-sm p-6 border-white/10 relative space-y-4 text-center">
              {/* Close Button */}
              <button 
                onClick={() => {
                  stopCamera();
                  setIsCameraOpen(false);
                  setIsPunchModalOpen(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title / Header */}
              <div>
                <h3 className="font-bold text-white text-base tracking-wide flex items-center justify-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <span>Punch {punchType} Camera Feed</span>
                </h3>
              </div>

              {/* Warning/Status Banner */}
              {distance === null ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                  Acquiring GPS location...
                </div>
              ) : distance > 20000 ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest animate-bounce">
                  🛑 TOO FAR! ({distance.toFixed(0)}m)
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
                  ✅ WITHIN RANGE ({distance.toFixed(0)}m)
                </div>
              )}

              {/* Webcam Live Feed */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/5 shadow-inner">
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-rose-400 text-xs font-semibold">
                    {cameraError}
                  </div>
                ) : (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}
              </div>

              {/* Confirmation action */}
              <div className="pt-2">
                <button 
                  disabled={isOutOfRange || isPunching}
                  onClick={() => handlePunch(punchType)}
                  className={`w-full font-extrabold py-4 text-xs tracking-wider uppercase rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg border cursor-pointer ${
                    isOutOfRange 
                      ? 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 border-emerald-400/25 active:scale-95'
                  }`}
                >
                  {isPunching ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'CONFIRM SELFIE PUNCH'
                  )}
                </button>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Lightbox Selfie Modal */}
      {enlargedSelfie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-lg w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl p-2 flex flex-col items-center">
            <button 
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
    </div>
  );
};

export default SalesDashboard;