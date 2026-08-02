import React, { useState, useEffect } from 'react';
import { Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { SalesHistoryLog } from '../SalesHistoryLog';
import { AttendanceDashboard } from '../AttendanceDashboard';
import { EditSaleModal } from '../EditSaleModal';
import { SelfieLightboxModal } from '../sales-dashboard/SelfieLightboxModal';
import { supabase } from '../../services/supabase';
import { formatCurrency } from '../../services/mockData';

interface StaffHistoryTabProps {
  staffProfiles: any[];
  selectedMonth?: string;
}

export const StaffHistoryTab: React.FC<StaffHistoryTabProps> = ({ staffProfiles, selectedMonth }) => {
  const activeMonthStr = selectedMonth || new Date().toISOString().substring(0, 7);

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileDetailTab, setProfileDetailTab] = useState<'sales' | 'attendance' | 'daily_reports' | 'leads'>('sales');

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [profileSales, setProfileSales] = useState<any[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [profileLeads, setProfileLeads] = useState<any[]>([]);
  const [profileTarget, setProfileTarget] = useState<number>(0);
  const [monthTargetsMap, setMonthTargetsMap] = useState<{ [staffId: string]: number }>({});

  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Target setter states
  const [newTargetInput, setNewTargetInput] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  const salesTeam = staffProfiles?.filter(p => p.designation === 'Sales Executive');
  const creativeTeam = staffProfiles?.filter(p => p.designation !== 'Sales Executive');

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

    if (targetsObj && typeof targetsObj === 'object') {
      // 1. Exact match for monthKey
      if (targetsObj[monthKey] !== undefined && targetsObj[monthKey] !== null) {
        return Number(targetsObj[monthKey]) || 0;
      }

      // 2. Immediately preceding month
      const sortedKeys = Object.keys(targetsObj)
        .filter(k => k < monthKey)
        .sort((a, b) => b.localeCompare(a));

      if (sortedKeys.length > 0 && targetsObj[sortedKeys[0]] !== undefined) {
        return Number(targetsObj[sortedKeys[0]]) || 0;
      }
    }

    // 3. Fallback to default monthly_target_amount
    return Number(staffRecord.monthly_target_amount) || 0;
  };

  // Fetch targets for card grid view when activeMonthStr changes
  useEffect(() => {
    const fetchGridMonthTargets = async () => {
      try {
        const { data: staffRows } = await supabase
          .from('staff')
          .select('id, full_name, monthly_target_amount, monthly_targets');

        const map: { [staffId: string]: number } = {};
        const dbStaffMap: { [name: string]: any } = {};
        staffRows?.forEach(r => {
          if (r.id) map[r.id] = resolveMonthTarget(r, activeMonthStr);
          if (r.full_name) dbStaffMap[r.full_name] = r;
        });

        staffProfiles?.forEach(staff => {
          if (map[staff.id] !== undefined) return;
          const match = dbStaffMap[staff.full_name];
          if (match) {
            map[staff.id] = resolveMonthTarget(match, activeMonthStr);
          } else {
            map[staff.id] = resolveMonthTarget(staff, activeMonthStr);
          }
        });

        setMonthTargetsMap(map);
      } catch (err) {
        console.warn('Grid targets resolution info:', err);
      }
    };

    fetchGridMonthTargets();
  }, [activeMonthStr, staffProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      if (selectedProfile.designation === 'Sales Executive') {
        setProfileDetailTab('sales');
      } else {
        setProfileDetailTab('daily_reports');
      }
      fetchProfileDetails(selectedProfile, activeMonthStr);
    }
  }, [selectedProfile, activeMonthStr]);

  const fetchProfileDetails = async (p: any, monthFilter: string) => {
    setIsLoadingDetails(true);
    try {
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('id, monthly_target_amount, monthly_targets')
        .eq('full_name', p.full_name)
        .maybeSingle();

      const targetStaffId = staffRecord ? staffRecord.id : p.id;
      setSelectedStaffId(targetStaffId);

      const activeTarget = resolveMonthTarget(staffRecord || p, monthFilter);
      setProfileTarget(activeTarget);
      setNewTargetInput(activeTarget.toString());

      // Fetch Sales & filter strictly for monthFilter
      const { data: saleData } = await supabase
        .from('sales')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('created_at', { ascending: false });

      const filteredSales = (saleData || []).filter(s => s.created_at?.startsWith(monthFilter));

      // Fetch Daily Reports & filter strictly for monthFilter
      const { data: reportData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('report_date', { ascending: false });

      const filteredReports = (reportData || []).filter(r => r.report_date?.startsWith(monthFilter));

      // Fetch Assigned Leads & filter for monthFilter if created_at exists
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', targetStaffId)
        .order('created_at', { ascending: false });

      const filteredLeads = (leadData || []).filter(l => {
        if (!l.created_at) return true;
        return l.created_at.startsWith(monthFilter);
      });

      setProfileSales(filteredSales);
      setProfileReports(filteredReports);
      setProfileLeads(filteredLeads);
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
      setMonthTargetsMap(prev => ({ ...prev, [selectedStaffId]: targetVal }));
      alert(`Target for ${activeMonthStr} set to ${formatCurrency(targetVal)}!`);
    } catch (err: any) {
      alert('Failed to update target: ' + err.message);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const getAvatarUrl = (name: string, gender: string) => {
    return `https://avatar.iran.liara.run/public/${gender?.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(name)}`;
  };

  // FULL-PAGE DETAIL VIEW
  if (selectedProfile) {
    const isSalesRole = selectedProfile.designation === 'Sales Executive';

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
                  <Badge variant={isSalesRole ? 'info' : 'success'}>
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

          {/* Month-Specific Target Setter for Sales Team */}
          {isSalesRole && (
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
        <div className="flex gap-2 border-b border-white/5 pb-3">
          {isSalesRole ? (
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
          <div className="p-12 text-center text-xs text-slate-500 font-bold">Loading staff details for {activeMonthStr}...</div>
        ) : (
          <>
            {/* SALES LOG SUB-TAB */}
            {profileDetailTab === 'sales' && (
              <div className="space-y-4">
                <SalesHistoryLog
                  sales={profileSales}
                  targetAmount={profileTarget}
                  isAdmin={true}
                  onEdit={(sale) => setEditingSale(sale)}
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

                      if (error) throw error;
                      setEditingSale(null);
                      fetchProfileDetails(selectedProfile, activeMonthStr);
                    }}
                  />
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
                          </tr>
                        );
                      })}
                      {profileReports.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-600 font-semibold">No daily work reports logged for {activeMonthStr}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
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
          <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-indigo-400" />
            Staff Performance Registers
          </h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
            {staffProfiles.length} Accounts ({activeMonthStr})
          </span>
        </div>

        {/* SECTION 1: SALES TEAM */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-indigo-500/30">
            Sales & Field Operations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesTeam?.map(member => {
              const cardTarget = monthTargetsMap[member.id] ?? resolveMonthTarget(member, activeMonthStr);
              return (
                <div 
                  key={member.id}
                  onClick={() => setSelectedProfile(member)}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-start hover:bg-slate-900/60 group"
                >
                  <img 
                    src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                    alt="" 
                    className="w-12 h-12 rounded-full border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                  />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{member.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{member.designation}</p>
                    </div>

                    {/* SALES PERFORMANCE STATS */}
                    <div className="pt-1.5 border-t border-white/5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-300">
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Target</span>
                        <span className="text-slate-200">{formatCurrency(cardTarget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Achieved</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(member.achievedAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Works</span>
                        <span className="text-indigo-300">{member.salesWorksCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Att</span>
                        <span className="text-teal-300">{member.attendancePCount || 0}/{member.attendanceTotalCount || 0}</span>
                      </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {creativeTeam.map(member => (
                <div 
                  key={member.id}
                  onClick={() => setSelectedProfile(member)}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-emerald-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-start hover:bg-slate-900/60 group"
                >
                  <img 
                    src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                    alt="" 
                    className="w-12 h-12 rounded-full border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                  />
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">{member.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{member.designation}</p>
                    </div>

                    {/* CREATIVE/SUPPORT PERFORMANCE STATS */}
                    <div className="pt-1.5 border-t border-white/5 flex items-center gap-4 text-[11px] font-semibold text-slate-300">
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Works</span>
                        <span className="text-emerald-300">{member.creativeWorksCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] block">Att</span>
                        <span className="text-teal-300">{member.attendancePCount || 0}/{member.attendanceTotalCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
