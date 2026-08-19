import React, { useState, useEffect } from 'react';
import { Star, ArrowLeft, MessageSquare, AlertTriangle, Edit2, Trash2, X } from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { SalesHistoryLog } from '../SalesHistoryLog';
import { AttendanceDashboard } from '../AttendanceDashboard';
import { EditSaleModal } from '../EditSaleModal';
import { ExpenseHistoryTab } from './ExpenseHistoryTab';
import { SelfieLightboxModal } from '../sales-dashboard/SelfieLightboxModal';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '../../services/mockData';
import { dataCache } from '../../services/dataCache';
import { TableSkeleton } from '../Skeleton';

interface StaffHistoryTabProps {
  staffProfiles: any[];
  selectedMonth?: string;
}

export const StaffHistoryTab: React.FC<StaffHistoryTabProps> = ({ staffProfiles, selectedMonth }) => {
  const activeMonthStr = selectedMonth || new Date().toISOString().substring(0, 7);

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileDetailTab, setProfileDetailTab] = useState<'sales' | 'attendance' | 'daily_reports' | 'leads' | 'expense_history'>('sales');

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [profileSales, setProfileSales] = useState<any[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [profileLeads, setProfileLeads] = useState<any[]>([]);
  const [profileExpenses, setProfileExpenses] = useState<any[]>([]);
  const [profileTarget, setProfileTarget] = useState<number>(0);
  const [monthTargetsMap, setMonthTargetsMap] = useState<{ [staffId: string]: number }>({});

  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [deletingSale, setDeletingSale] = useState<any | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Target setter states
  const [newTargetInput, setNewTargetInput] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  // Daily Reports Edit & Delete states
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [deletingReport, setDeletingReport] = useState<any | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isDeletingReport, setIsDeletingReport] = useState(false);

  // Edit fields state
  const [editReportWorkType, setEditReportWorkType] = useState('');
  const [editReportPosters, setEditReportPosters] = useState<number | string>(0);
  const [editReportReEdits, setEditReportReEdits] = useState<number | string>(0);
  const [editReportLogos, setEditReportLogos] = useState<number | string>(0);
  const [editReportOthers, setEditReportOthers] = useState<number | string>(0);
  const [editReportAdsPlaced, setEditReportAdsPlaced] = useState<number | string>(0);
  const [editReportVideos, setEditReportVideos] = useState<number | string>(0);
  const [editReportTravel, setEditReportTravel] = useState<number | string>(0);
  const [editReportDesc, setEditReportDesc] = useState('');

  const openEditReportModal = (report: any) => {
    setEditingReport(report);
    setEditReportWorkType(report.work_type || 'Creative Work');
    setEditReportPosters(report.posters_count || 0);
    setEditReportReEdits(report.re_edits_count || 0);
    setEditReportLogos(report.logos_count || 0);
    setEditReportOthers(report.others_count || 0);
    setEditReportAdsPlaced(report.ads_placed_count || 0);
    setEditReportVideos(report.videos_count || 0);
    setEditReportTravel(report.travel_expense || 0);
    setEditReportDesc(report.description || '');
  };

  const handleSaveReportEdit = async () => {
    if (!editingReport) return;
    setIsSavingReport(true);
    try {
      const pCount = Number(editReportPosters) || 0;
      const rCount = Number(editReportReEdits) || 0;
      const lCount = Number(editReportLogos) || 0;
      const oCount = Number(editReportOthers) || 0;
      const apCount = Number(editReportAdsPlaced) || 0;
      const vCount = Number(editReportVideos) || 0;
      const tExp = Number(editReportTravel) || 0;

      const { error } = await supabase
        .from('daily_reports')
        .update({
          work_type: editReportWorkType,
          posters_count: pCount,
          re_edits_count: rCount,
          logos_count: lCount,
          others_count: oCount,
          ads_placed_count: apCount,
          videos_count: vCount,
          travel_expense: tExp,
          description: editReportDesc.trim()
        })
        .eq('id', editingReport.id);

      if (error) throw error;

      alert('Work report updated successfully!');
      setEditingReport(null);
      if (selectedProfile) {
        fetchProfileDetails(selectedProfile, activeMonthStr, true);
      }
    } catch (err: any) {
      alert('Failed to update report: ' + err.message);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleDeleteReportConfirm = async () => {
    if (!deletingReport) return;
    setIsDeletingReport(true);
    try {
      const { error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('id', deletingReport.id);

      if (error) throw error;

      alert('Work report deleted successfully!');
      setDeletingReport(null);
      if (selectedProfile) {
        fetchProfileDetails(selectedProfile, activeMonthStr, true);
      }
    } catch (err: any) {
      alert('Failed to delete report: ' + err.message);
    } finally {
      setIsDeletingReport(false);
    }
  };

  // Filter out extra academy-specific roles (Tutor and Academy Counselor), Admin Director, and resigned/inactive staff
  const validStaffProfiles = (staffProfiles || []).filter(p => {
    if (!p) return false;
    if (p.status === 'INACTIVE' || p.status === 'RESIGNED') return false;
    const desig = String(p?.designation || p?.role_name || p?.role || '').toLowerCase().trim();
    const rName = String(p?.role_name || p?.role || '').toLowerCase().trim();
    const nameStr = String(p?.full_name || '').toLowerCase().trim();

    if (nameStr.includes('althaf')) return false;

    const isTutor = desig.includes('tutor') || rName.includes('tutor');
    const isCounselor = desig.includes('counselor') || rName.includes('counselor');
    
    // Explicitly filter out Admin Director or Admin designation/role (excluding Managing Director)
    const isAdminDirector = desig.includes('admin') || desig.includes('director') || rName.includes('admin') || rName.includes('director');
    const isManagingDirector = desig === 'managing director' || nameStr.includes('shibili');

    if (isAdminDirector && !isManagingDirector) return false;
    if (isTutor || isCounselor) return false;

    return true;
  });

  const salesTeam = validStaffProfiles.filter(p => p.designation === 'Sales Executive');
  const creativeTeam = validStaffProfiles.filter(p => p.designation !== 'Sales Executive');

  // Safe Month-Specific Target Resolver
  const resolveMonthTarget = (staffRecord: any, monthKey: string) => {
    if (!staffRecord) return 0;

    let targetsObj: any = null;
    if (staffRecord.monthly_targets) {
      try {
        targetsObj = typeof staffRecord.monthly_targets === 'string'
          ? JSON.parse(staffRecord.monthly_targets)
          : staffRecord.monthly_targets;
      } catch (e) {
        targetsObj = null;
      }
    }

    if (targetsObj && typeof targetsObj === 'object' && Object.keys(targetsObj).length > 0) {
      if (targetsObj[monthKey] !== undefined && targetsObj[monthKey] !== null) {
        return Number(targetsObj[monthKey]) || 0;
      }
      return 0;
    }

    const currentMonthStr = new Date().toISOString().substring(0, 7);
    if (monthKey === currentMonthStr) {
      return Number(staffRecord.monthly_target_amount) || 0;
    }

    return 0;
  };

  // Fetch targets for card grid view when activeMonthStr changes
  useEffect(() => {
    const fetchGridMonthTargets = async () => {
      try {
        const cacheKey = `grid_targets_${activeMonthStr}`;
        const map = await dataCache.fetchWithCache(
          cacheKey,
          async () => {
            const { data: staffRows } = await supabase
              .from('staff')
              .select('id, full_name, monthly_target_amount, monthly_targets');

            const m: { [staffId: string]: number } = {};
            const dbStaffMap: { [name: string]: any } = {};
            staffRows?.forEach(r => {
              if (r.id) m[r.id] = resolveMonthTarget(r, activeMonthStr);
              if (r.full_name) dbStaffMap[r.full_name] = r;
            });

            validStaffProfiles.forEach(staff => {
              if (m[staff.id] !== undefined) return;
              const match = dbStaffMap[staff.full_name];
              if (match) {
                m[staff.id] = resolveMonthTarget(match, activeMonthStr);
              } else {
                m[staff.id] = resolveMonthTarget(staff, activeMonthStr);
              }
            });

            return m;
          },
          { ttlMs: 60000 }
        );

        setMonthTargetsMap(map);
      } catch (err) {
        console.warn('Grid targets resolution info:', err);
      }
    };

    fetchGridMonthTargets();
  }, [activeMonthStr, staffProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      const isOwner = selectedProfile.designation === 'Company Owner' || selectedProfile.designation === 'Company Owner / Partner' || selectedProfile.designation === 'Managing Director';
      if (isOwner || selectedProfile.designation === 'Sales Executive') {
        setProfileDetailTab('sales');
      } else {
        setProfileDetailTab('daily_reports');
      }
      fetchProfileDetails(selectedProfile, activeMonthStr);

      const handleExpensesChanged = () => {
        fetchProfileDetails(selectedProfile, activeMonthStr, true);
      };

      window.addEventListener('company_expenses_changed', handleExpensesChanged);
      return () => {
        window.removeEventListener('company_expenses_changed', handleExpensesChanged);
      };
    }
  }, [selectedProfile, activeMonthStr]);

  const fetchProfileDetails = async (p: any, monthFilter: string, isBackground = false) => {
    if (!isBackground) setIsLoadingDetails(true);
    try {
      const cacheKey = `profile_details_${p.id || p.full_name}_${monthFilter}`;
      const bundle = await dataCache.fetchWithCache(
        cacheKey,
        async () => {
          const staffQuery = p.id
            ? supabase.from('staff').select('id, full_name, monthly_target_amount, monthly_targets').eq('id', p.id).maybeSingle()
            : supabase.from('staff').select('id, full_name, monthly_target_amount, monthly_targets').ilike('full_name', p.full_name).maybeSingle();

          const [
            staffRes,
            salesRes,
            reportRes,
            leadRes,
            exp1Res,
            exp2Res,
            exp3Res
          ] = await Promise.all([
            staffQuery,
            supabase.from('sales').select('*').order('created_at', { ascending: false }),
            supabase.from('daily_reports').select('*').eq('staff_id', p.id).order('report_date', { ascending: false }),
            supabase.from('leads').select('*').eq('assigned_to', p.id).order('created_at', { ascending: false }),
            p.id ? supabase.from('expenses').select('*').eq('staff_id', p.id).order('expense_date', { ascending: false }) : Promise.resolve({ data: [] }),
            p.id ? supabase.from('owner_expenses').select('*').eq('staff_id', p.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
            p.id ? supabase.from('partner_withdrawals').select('*').or(`partner_id.eq.${p.id},partner_name.eq.${p.full_name || ''}`).order('withdrawal_date', { ascending: false }) : Promise.resolve({ data: [] })
          ]);

          return {
            staffRecord: staffRes.data || null,
            allSalesData: salesRes.data || [],
            reportData: reportRes.data || [],
            leadData: leadRes.data || [],
            exp1: exp1Res.data || [],
            exp2: exp2Res.data || [],
            exp3: exp3Res.data || []
          };
        },
        { ttlMs: 45000, forceRefresh: isBackground }
      );

      const staffRecord = bundle.staffRecord;
      const targetStaffId = staffRecord ? staffRecord.id : p.id;
      setSelectedStaffId(targetStaffId);

      const activeTarget = resolveMonthTarget(staffRecord || p, monthFilter);
      setProfileTarget(activeTarget);
      setNewTargetInput(activeTarget > 0 ? activeTarget.toString() : '');

      const targetIdStr = String(targetStaffId || '').trim();
      const pIdStr = String(p.id || '').trim();
      const pNameTrim = String(p.full_name || staffRecord?.full_name || '').trim().toLowerCase();
      const pFirstName = pNameTrim ? pNameTrim.split(' ')[0] : '';

      const matchedSales = (bundle.allSalesData || []).filter((s: any) => {
        if (!s) return false;
        const sStaffId = String(s.staff_id || '').trim();
        const sUserId = String(s.user_id || '').trim();
        const sStaffName = String(s.staff_name || '').trim().toLowerCase();
        const sFullName = String(s.full_name || '').trim().toLowerCase();
        const sLoggedBy = String(s.logged_by_name || s.created_by || '').trim().toLowerCase();

        if (targetIdStr && (sStaffId === targetIdStr || sUserId === targetIdStr)) return true;
        if (pIdStr && (sStaffId === pIdStr || sUserId === pIdStr)) return true;
        if (pNameTrim && (sStaffName === pNameTrim || sFullName === pNameTrim || sLoggedBy === pNameTrim)) return true;
        if (pFirstName && pFirstName.length >= 3) {
          if (sStaffName.includes(pFirstName) || sFullName.includes(pFirstName) || sLoggedBy.includes(pFirstName)) return true;
        }

        return false;
      });

      const filteredSales = matchedSales.filter((s: any) => {
        if (!monthFilter) return true;
        const rawDate = s.created_at || s.date || s.sale_date || s.timestamp;
        if (rawDate) {
          const dStr = String(rawDate).trim();
          if (dStr.startsWith(monthFilter)) return true;
          try {
            const dObj = new Date(rawDate);
            if (!isNaN(dObj.getTime())) {
              const y = dObj.getFullYear();
              const m = String(dObj.getMonth() + 1).padStart(2, '0');
              if (`${y}-${m}` === monthFilter) return true;
            }
          } catch (e) {}
        }
        if (s.sale_month && monthFilter) {
          try {
            const [year, month] = monthFilter.split('-');
            const d = new Date(Number(year), Number(month) - 1, 1);
            const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (String(s.sale_month).toLowerCase() === monthName.toLowerCase()) return true;
          } catch (e) {}
        }
        return false;
      });

      const filteredReports = (bundle.reportData || []).filter((r: any) => r.report_date?.startsWith(monthFilter));

      const filteredLeads = (bundle.leadData || []).filter((l: any) => {
        if (!l.created_at) return true;
        return l.created_at.startsWith(monthFilter);
      });

      let localExp: any[] = [];
      const keysToTry = ['company_expenses_local_store', 'expenses', 'owner_expenses', 'expenses_list'];
      keysToTry.forEach(k => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const matchingItems = parsed.filter((item: any) => 
                item.staff_id === targetStaffId || 
                item.logged_by_name === p.full_name ||
                item.created_by === targetStaffId
              );
              localExp.push(...matchingItems);
            }
          }
        } catch (e) {}
      });

      const withdrawalsAsExpenses = (bundle.exp3 || []).map((w: any) => ({
        id: w.id || 'withdrawal-' + (w.created_at || Date.now()),
        category: 'Partner Withdrawal',
        description: w.notes || w.description || `Partner Withdrawal (${w.partner_name || p.full_name})`,
        amount: Number(w.amount) || 0,
        expense_date: w.withdrawal_date || w.created_at?.substring(0, 10),
        staff_id: w.partner_id || targetStaffId,
        created_at: w.created_at || w.withdrawal_date
      }));

      const rawCombined = [...(bundle.exp1 || []), ...(bundle.exp2 || []), ...withdrawalsAsExpenses, ...localExp];

      const seenIds = new Set<string>();
      const finalExpenses: any[] = [];

      rawCombined.forEach((item, idx) => {
        if (item && !(item.id && String(item.id).startsWith('seed-exp-'))) {
          const uniqueId = item.id ? String(item.id) : `generated-exp-${idx}-${item.amount}-${item.expense_date}`;
          if (!seenIds.has(uniqueId)) {
            seenIds.add(uniqueId);
            finalExpenses.push({ ...item, id: uniqueId });
          }
        }
      });

      setProfileSales(filteredSales || []);
      setProfileReports(filteredReports || []);
      setProfileLeads(filteredLeads || []);
      setProfileExpenses(finalExpenses);
    } catch (err) {
      console.error('Error fetching staff profile details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !newTargetInput || !selectedStaffId) return;
    setIsUpdatingTarget(true);
    try {
      const targetVal = Number(newTargetInput);
      if (isNaN(targetVal)) throw new Error('Please enter a valid numeric target amount');

      const { data: currentStaffRow } = await supabase
        .from('staff')
        .select('monthly_targets')
        .eq('id', selectedStaffId)
        .maybeSingle();

      let existingTargets: any = {};
      if (currentStaffRow?.monthly_targets) {
        try {
          existingTargets = typeof currentStaffRow.monthly_targets === 'string'
            ? JSON.parse(currentStaffRow.monthly_targets)
            : currentStaffRow.monthly_targets;
        } catch (e) {
          existingTargets = {};
        }
      }

      const updatedTargets = { ...existingTargets, [activeMonthStr]: targetVal };

      const { error: updateErr } = await supabase
        .from('staff')
        .update({ monthly_targets: updatedTargets })
        .eq('id', selectedStaffId);

      if (updateErr) {
        console.warn('monthly_targets column update warning:', updateErr.message);
        await supabase
          .from('staff')
          .update({ monthly_target_amount: targetVal })
          .eq('id', selectedStaffId);
      }

      setProfileTarget(targetVal);
      setNewTargetInput(targetVal.toString());
      setMonthTargetsMap(prev => ({ ...prev, [selectedStaffId]: targetVal }));
      setSelectedProfile((prev: any) => prev ? { ...prev, monthly_targets: updatedTargets, monthly_target_amount: targetVal } : prev);
      
      // Invalidate relevant cache entries
      dataCache.invalidate('grid_targets_*');
      dataCache.invalidate('admin_dashboard_summaries_*');
      dataCache.invalidate('profile_details_*');

      // Dispatch global event for instant reactivity across all tabs
      window.dispatchEvent(new CustomEvent('staff_target_updated', {
        detail: { staffId: selectedStaffId, target: targetVal, month: activeMonthStr }
      }));

      alert(`Target for ${activeMonthStr} set to ${formatCurrency(targetVal)}!`);
    } catch (err: any) {
      alert('Failed to update target: ' + err.message);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSale) return;
    setIsDeletingSale(true);
    
    // Optimistic UI Update
    const saleIdToDelete = deletingSale.id;
    setProfileSales(prev => prev.filter(s => s.id !== saleIdToDelete));
    
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleIdToDelete);

      if (error) {
        // Rollback on error
        if (selectedProfile) fetchProfileDetails(selectedProfile, activeMonthStr, true);
        throw error;
      }
      setDeletingSale(null);
      if (selectedProfile) {
        fetchProfileDetails(selectedProfile, activeMonthStr, true);
      }
    } catch (err: any) {
      alert('Failed to delete sale entry: ' + err.message);
    } finally {
      setIsDeletingSale(false);
    }
  };

  const getAvatarUrl = (name: string, gender: string) => {
    return `https://avatar.iran.liara.run/public/${gender?.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(name)}`;
  };

  // FULL-PAGE DETAIL VIEW
  if (selectedProfile) {
    const isSalesRole = selectedProfile.designation === 'Sales Executive';
    const isOwnerRole = selectedProfile.designation === 'Company Owner' || selectedProfile.designation === 'Company Owner / Partner' || selectedProfile.designation === 'Managing Director';

    return (
      <div className="space-y-6 pt-2 animate-fade-in max-w-7xl mx-auto">
        {/* Top Header & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedProfile(null)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-white/10 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Staff List
            </button>
            <div className="flex items-center gap-3">
              <img
                src={selectedProfile.avatar_url || getAvatarUrl(selectedProfile.full_name, selectedProfile.gender)}
                alt={selectedProfile.full_name}
                className="w-12 h-12 rounded-2xl object-cover bg-slate-950 border border-white/10 shrink-0"
              />
              <div>
                <h2 className="text-base md:text-lg font-black text-white leading-tight">{selectedProfile.full_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={isOwnerRole ? 'purple' : isSalesRole ? 'info' : 'success'}>
                    {selectedProfile.designation}
                  </Badge>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Month: {activeMonthStr}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                    Shift: {selectedProfile.shift_start_time?.substring(0, 5)} - {selectedProfile.shift_end_time?.substring(0, 5)} | Off: {selectedProfile.weekly_off_day}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Month-Specific Target Setter for Sales Team & Company Owners */}
          {(isSalesRole || isOwnerRole) && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center gap-3 self-start sm:self-center">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Target ({activeMonthStr})</span>
                <span className="text-xs font-black text-emerald-400">{formatCurrency(profileTarget)}</span>
              </div>
              <form onSubmit={handleSetTarget} className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                <input
                  type="number"
                  placeholder="New Target ₹"
                  value={newTargetInput}
                  onChange={(e) => setNewTargetInput(e.target.value)}
                  className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isUpdatingTarget}
                  className="text-[10px] py-1.5 px-3 font-bold uppercase tracking-wider shrink-0"
                >
                  {isUpdatingTarget ? 'Saving...' : 'Set'}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Role-Based Sub-Nav Tabs */}
        <div className="flex gap-2 border-b border-white/5 pb-3 overflow-x-auto scrollbar-none whitespace-nowrap">
          {isOwnerRole ? (
            <>
              <button
                onClick={() => setProfileDetailTab('sales')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'sales'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Sales History ({profileSales.length})
              </button>
              <button
                onClick={() => setProfileDetailTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'attendance'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Attendance
              </button>
              <button
                onClick={() => setProfileDetailTab('expense_history')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'expense_history'
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Expense History ({profileExpenses.length})
              </button>
            </>
          ) : isSalesRole ? (
            <>
              <button
                onClick={() => setProfileDetailTab('sales')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'sales'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Sales Log ({profileSales.length})
              </button>
              <button
                onClick={() => setProfileDetailTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'attendance'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Attendance
              </button>
              <button
                onClick={() => setProfileDetailTab('leads')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'leads'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Leads ({profileLeads.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setProfileDetailTab('daily_reports')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'daily_reports'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Daily Reports ({profileReports.length})
              </button>
              <button
                onClick={() => setProfileDetailTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                  profileDetailTab === 'attendance'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                Attendance
              </button>
            </>
          )}
        </div>

        {/* SUB-TAB CONTENTS */}
        {isLoadingDetails ? (
          <div className="p-2 animate-fade-in">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : (
          <>
            {/* SALES LOG SUB-TAB */}
            {profileDetailTab === 'sales' && (
              <div className="space-y-4">
                <SalesHistoryLog
                  sales={profileSales}
                  targetAmount={profileTarget}
                  isAdmin={true}
                  hideTargetProgress={false}
                  onEdit={(sale) => setEditingSale(sale)}
                  onDelete={(sale) => setDeletingSale(sale)}
                  onViewSlip={(sale) => {
                    if (sale.payment_proof_url) {
                      setPreviewSlipUrl(sale.payment_proof_url);
                    } else {
                      alert(`Sale SL: ${sale.work_sl}\nClient: ${sale.client_name}\nAmount: ${formatCurrency(sale.received_amount)}\nStatus: ${sale.payment_type}`);
                    }
                  }}
                />

                {editingSale && (
                  <EditSaleModal
                    sale={editingSale}
                    onClose={() => setEditingSale(null)}
                    onSave={async (id, data) => {
                      // Optimistic UI Update
                      setProfileSales(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
                      
                      const { error } = await supabase
                        .from('sales')
                        .update({
                          client_name: data.client_name,
                          service_package: data.service_package,
                          payment_type: data.payment_type,
                          package_amount: data.package_amount,
                          received_amount: data.received_amount,
                          balance_amount: data.balance_amount,
                          payment_method: data.payment_method,
                          work_description: data.work_description
                        })
                        .eq('id', id);

                      if (error) {
                         if (selectedProfile) fetchProfileDetails(selectedProfile, activeMonthStr, true);
                         throw error;
                      }
                      setEditingSale(null);
                      fetchProfileDetails(selectedProfile, activeMonthStr, true);
                    }}
                  />
                )}

                {/* Delete Confirmation Modal */}
                {deletingSale && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
                    <Card variant="glass" className="w-full max-w-md border-rose-500/20 p-6 animate-scale-up relative">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Delete Sale Entry</h3>
                          <p className="text-xs text-slate-400">This action cannot be undone.</p>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1.5 mb-6 text-xs text-slate-300">
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Work SL:</span> <span className="font-mono text-indigo-400 font-bold">{deletingSale.work_sl || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Client Name:</span> <span className="font-bold text-white">{deletingSale.client_name}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Service Package:</span> <span className="font-semibold text-slate-400">{deletingSale.service_package}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Received Amount:</span> <span className="font-extrabold text-emerald-400">{formatCurrency(deletingSale.received_amount)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Payment Type:</span> <span className="font-semibold text-slate-200">{deletingSale.payment_type}</span></div>
                      </div>

                      <p className="text-xs font-semibold text-slate-300 mb-6">
                        Are you sure you want to permanently delete this sale entry from the database?
                      </p>

                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setDeletingSale(null)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleConfirmDelete}
                          isLoading={isDeletingSale}
                          className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30"
                        >
                          Yes, Delete
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}

                <SelfieLightboxModal
                  enlargedSelfie={previewSlipUrl}
                  onClose={() => setPreviewSlipUrl(null)}
                />
              </div>
            )}

            {/* ATTENDANCE SUB-TAB */}
            {profileDetailTab === 'attendance' && (
              <AttendanceDashboard
                staffId={selectedStaffId || selectedProfile.id}
                fullName={selectedProfile.full_name}
                designation={selectedProfile.designation}
                gender={selectedProfile.gender}
                avatarUrl={null}
                isAdmin={true}
                onOverrideSuccess={() => fetchProfileDetails(selectedProfile, activeMonthStr)}
              />
            )}

            {/* LEADS SUB-TAB - COMPLETE STAFF PORTAL INTEGRATION */}
            {profileDetailTab === 'leads' && (
              <Card variant="glass" className="p-5 border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Leads Assigned to {selectedProfile.full_name}</h3>
                  <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                    {profileLeads.length} Leads ({activeMonthStr})
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Lead Name</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Service Interest</th>
                        <th className="py-3 px-4">Status Dropdown</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                      {profileLeads?.map((lead: any) => (
                        <tr key={lead.id} className="hover:bg-slate-900/10">
                          <td className="py-3 px-4 text-white font-bold">{lead.lead_name}</td>
                          <td className="py-3 px-4 text-slate-400">{lead.location || '-'}</td>
                          <td className="py-3 px-4 text-slate-300 font-mono">{lead.whatsapp_number || '-'}</td>
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
                                  fetchProfileDetails(selectedProfile, activeMonthStr);
                                } catch (err: any) {
                                  alert('Failed to update lead status: ' + err.message);
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
                            {lead.whatsapp_number ? (
                              <a
                                href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all shadow-md shadow-emerald-950/20"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                              </a>
                            ) : (
                              <span className="text-slate-600 text-[10px]">No contact</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {profileLeads.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-600 font-semibold">No leads assigned to this staff member for {activeMonthStr}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* DAILY REPORTS SUB-TAB - COMPLETE CREATIVE / MARKETING TABLE */}
            {profileDetailTab === 'daily_reports' && (
              <Card variant="glass" className="p-5 border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Work Log Registers ({selectedProfile.full_name})</h3>
                  <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
                    {profileReports.length} Logs ({activeMonthStr})
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Work Details / Badges</th>
                        <th className="py-3 px-4">Task Description</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                      {profileReports?.map((report: any) => {
                        const hasTallies = (report.posters_count > 0 || report.re_edits_count > 0 || report.logos_count > 0 || report.others_count > 0 || report.ads_placed_count > 0 || report.videos_count > 0);
                        return (
                          <tr key={report.id} className="hover:bg-slate-900/10">
                            <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">{report.report_date}</td>
                            <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                              <Badge variant="info">{report.work_type}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              {hasTallies ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {report.posters_count > 0 && <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">Posters: {report.posters_count}</span>}
                                  {report.re_edits_count > 0 && <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md font-bold">Re-edits: {report.re_edits_count}</span>}
                                  {report.logos_count > 0 && <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">Logos: {report.logos_count}</span>}
                                  {report.ads_placed_count > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold">Ads: {report.ads_placed_count}</span>}
                                  {report.videos_count > 0 && <span className="text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded-md font-bold">Videos: {report.videos_count}</span>}
                                  {report.travel_expense > 0 && <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md font-bold">Travel: {formatCurrency(report.travel_expense)}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px] font-normal">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-200">{report.description}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditReportModal(report)}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors cursor-pointer"
                                  title="Edit Report"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingReport(report)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                                  title="Delete Report"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {profileReports.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-600 font-semibold">No daily work reports logged for {activeMonthStr}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* EXPENSE HISTORY SUB-TAB FOR COMPANY OWNER - DIRECT COMPONENT REUSE */}
            {profileDetailTab === 'expense_history' && (() => {
              console.log('DEBUG OWNER EXPENSES:', profileExpenses, activeMonthStr);
              return (
                <ExpenseHistoryTab
                  activeTab="expense_history"
                  isOwner={true}
                  ownerExpenses={profileExpenses}
                  selectedMonth={activeMonthStr}
                />
              );
            })()}
            {/* DELETE REPORT CONFIRMATION MODAL */}
            {deletingReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                <Card className="w-full max-w-md p-6 relative space-y-5 text-center bg-slate-900 border border-rose-500/20 shadow-2xl">
                  <button 
                    onClick={() => setDeletingReport(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Delete Work Report?</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Are you sure you want to delete the log for <span className="text-slate-200 font-semibold">{deletingReport.report_date}</span>? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Button 
                      variant="secondary" 
                      className="w-1/2 border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => setDeletingReport(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="danger" 
                      className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                      onClick={handleDeleteReportConfirm}
                      disabled={isDeletingReport}
                    >
                      {isDeletingReport ? 'Deleting...' : 'Yes, Delete'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* EDIT REPORT MODAL */}
            {editingReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
                <Card className="w-full max-w-lg p-6 relative space-y-5 bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <button 
                    onClick={() => setEditingReport(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Edit2 className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white text-base">Edit Work Report ({editingReport.report_date})</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Category / Work Type</label>
                      <input 
                        type="text" 
                        value={editReportWorkType}
                        onChange={(e) => setEditReportWorkType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Posters</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportPosters}
                          onChange={(e) => setEditReportPosters(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Re-edits</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportReEdits}
                          onChange={(e) => setEditReportReEdits(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Logos</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportLogos}
                          onChange={(e) => setEditReportLogos(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ads Placed</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportAdsPlaced}
                          onChange={(e) => setEditReportAdsPlaced(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Videos</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportVideos}
                          onChange={(e) => setEditReportVideos(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Travel Expense (₹)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReportTravel}
                          onChange={(e) => setEditReportTravel(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Task Description / Work Notes</label>
                      <textarea 
                        rows={3}
                        value={editReportDesc}
                        onChange={(e) => setEditReportDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium resize-none"
                        placeholder="Enter detailed description of tasks completed..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                    <Button 
                      variant="secondary" 
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => setEditingReport(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                      onClick={handleSaveReportEdit}
                      disabled={isSavingReport}
                    >
                      {isSavingReport ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // DEFAULT GRID VIEW OF CARDS
  return (
    <section className="space-y-6 pt-2 animate-fade-in max-w-7xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Staff Performance Registers
          </h2>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
            {validStaffProfiles.length} Accounts ({activeMonthStr})
          </span>
        </div>

        {/* SECTION 1: SALES TEAM */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-indigo-500/30">
            Sales & Field Operations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {salesTeam?.map(member => {
              const cardTarget = monthTargetsMap[member.id] ?? resolveMonthTarget(member, activeMonthStr);
              const achievedAmt = member.achievedAmount || 0;
              const targetPct = cardTarget > 0 ? Math.min(Math.round((achievedAmt / cardTarget) * 100), 100) : 0;
              const avatarSrc = member.avatar_url || getAvatarUrl(member.full_name, member.gender);

              return (
                <div 
                  key={member.id}
                  onClick={() => setSelectedProfile(member)}
                  className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/90 dark:border-white/10 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4"
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={avatarSrc} 
                          alt={member.full_name} 
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/30 group-hover:border-indigo-400 group-hover:scale-105 transition-all duration-300 bg-slate-100 dark:bg-slate-950"
                        />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" title="Active Staff"></span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">
                          {member.full_name}
                        </h4>
                        <span className="inline-block mt-0.5 text-[9.5px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
                          {member.designation}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 dark:text-slate-400 transition-all border border-slate-200 dark:border-white/5 shrink-0">
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </div>
                  </div>

                  {/* Target Progress Bar (Sales) */}
                  {cardTarget > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Goal</span>
                        <span className={targetPct >= 100 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-indigo-600 dark:text-indigo-300 font-extrabold'}>
                          {targetPct}% Achieved
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950/80 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            targetPct >= 100 
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50' 
                              : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400'
                          }`}
                          style={{ width: `${targetPct}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Metric Pillars Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-white/5">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Target</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1">{formatCurrency(cardTarget)}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Achieved</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(achievedAmt)}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Deals Logged</span>
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 mt-1">{member.salesWorksCount || 0} Works</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Attendance</span>
                      <span className="text-xs font-black text-teal-700 dark:text-teal-300 mt-1">{member.attendancePCount || 0}/{member.attendanceTotalCount || 0} Days</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: CREATIVE TEAM */}
        {creativeTeam?.length > 0 && (
          <div className="space-y-3 pt-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-emerald-500/30">
              Creative & Marketing Team
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {creativeTeam.map(member => {
                const avatarSrc = member.avatar_url || getAvatarUrl(member.full_name, member.gender);

                return (
                  <div 
                    key={member.id}
                    onClick={() => setSelectedProfile(member)}
                    className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    {/* Top Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative shrink-0">
                          <img 
                            src={avatarSrc} 
                            alt={member.full_name} 
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/30 group-hover:border-emerald-400 group-hover:scale-105 transition-all duration-300 bg-slate-100 dark:bg-slate-950"
                          />
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" title="Active Staff"></span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors truncate">
                            {member.full_name}
                          </h4>
                          <span className="inline-block mt-0.5 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                            {member.designation}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 dark:text-slate-400 transition-all border border-slate-200 dark:border-white/5 shrink-0">
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </div>
                    </div>

                    {/* Metric Pillars Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-white/5">
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed Works</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-1">{member.creativeWorksCount || 0} Deliverables</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Attendance Log</span>
                        <span className="text-xs font-black text-teal-700 dark:text-teal-300 mt-1">{member.attendancePCount || 0}/{member.attendanceTotalCount || 0} Days</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
