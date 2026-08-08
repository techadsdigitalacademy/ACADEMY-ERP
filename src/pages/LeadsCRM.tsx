import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import type { Lead } from '../types';
import { 
  Search, 
  Plus, 
   
  
  X,
  Briefcase,
  
  ChevronLeft,
  ChevronRight,
  Trash2,
  Upload,
  Phone,
  Save,
  
  
  Calendar as CalendarIcon,
  PhoneCall,
  CheckCircle2,
  Edit2,
  
Star,
} from 'lucide-react';

interface StaffItem {
  id: string;
  full_name: string;
  avatar_url?: string;
}



interface LeadCall {
  id: string;
  lead_id: string;
  call_date: string;
  status: 'POSITIVE' | 'NEGATIVE' | 'NO ANSWER';
  notes: string;
  created_at: string;
}

export const LeadsCRM: React.FC = () => {
  const { activeStaff, setActiveTab, isAdminMode,  selectedMonth, setSelectedMonth } = useApp();

  // Local States
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [staffRegistry, setStaffRegistry] = useState<StaffItem[]>([]);
  const [callLogs, setCallLogs] = useState<LeadCall[]>([]);
  const [selectedSalesExec, setSelectedSalesExec] = useState<any | null>(null);
  const [salesExecutives, setSalesExecutives] = useState<any[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [distributionDate, setDistributionDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [filterDate, setFilterDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  
  // Edit Lead Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [editLeadName, setEditLeadName] = useState('');
  const [editLeadWhatsapp, setEditLeadWhatsapp] = useState('');
  const [editLeadLocation, setEditLeadLocation] = useState('');
  const [editLeadProject, setEditLeadProject] = useState('');
  const [editLeadStatus, setEditLeadStatus] = useState<Lead['status']>('NEW LEAD');
  const [editLeadAssignedTo, setEditLeadAssignedTo] = useState('');
  const [isSavingEditLead, setIsSavingEditLead] = useState(false);

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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  
  // Call Form states
  const [newCallStatus, setNewCallStatus] = useState<'POSITIVE' | 'NEGATIVE' | 'NO ANSWER'>('POSITIVE');
  const [newCallNotes, setNewCallNotes] = useState('');
  const [newCallDate, setNewCallDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSavingCall, setIsSavingCall] = useState(false);

  // Calendar drilling detail modal
  const [drilledDate, setDrilledDate] = useState<string | null>(null);
  const [drilledCalls, setDrilledCalls] = useState<LeadCall[]>([]);

  // Manual Form states
  const [leadName, setLeadName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [leadWhatsapp, setLeadWhatsapp] = useState('');
  const [leadLocation, setLeadLocation] = useState('');
  const [leadProject, setLeadProject] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  // Inline notes state
  const [localNotes, setLocalNotes] = useState<{ [leadId: string]: string }>({});
  const [isSavingNotes, setIsSavingNotes] = useState<{ [leadId: string]: boolean }>({});

  // Bulk Upload states
  const [bulkProjectName, setBulkProjectName] = useState('');
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [staffQuotas, setStaffQuotas] = useState<{ [staffId: string]: number }>({});
  const [csvFileName, setCsvFileName] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all leads, staff, and logs
  const loadCRMData = async () => {
    try {
      // 1. Fetch leads
      const { data: leadsData, error: leadsErr } = await supabase
        .from('leads')
        .select('*');
      if (leadsErr) throw leadsErr;

      // 2. Fetch staff list for assignment dropdown
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .select('id, full_name, avatar_url');
      if (staffErr) throw staffErr;

      // 3. Fetch call logs
      const { data: callsData, error: callsErr } = await supabase
        .from('lead_calls')
        .select('*')
        .order('created_at', { ascending: false });
      if (callsErr) throw callsErr;

      // 4. Fetch sales executives profiles
      const { data: seData } = await supabase
        .from('staff_profiles')
        .select('id, full_name, designation')
        .eq('designation', 'Sales Executive');

      const spList = seData || [];
      const seList = spList.map(sp => {
        const matchedStaff = (staffData || []).find(s => s.id === sp.id);
        return {
          id: sp.id,
          full_name: sp.full_name,
          designation: sp.designation,
          avatar_url: matchedStaff?.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(sp.full_name)}`
        };
      });

      // Fetch assignment logs
      const { data: logsData } = await supabase
        .from('lead_assignment_logs')
        .select('*')
        .order('assigned_at', { ascending: false });

      setLeadsList(leadsData || []);
      setStaffRegistry(staffData || []);
      setCallLogs(callsData || []);
      setSalesExecutives(seList);
      setAssignmentLogs(logsData || []);
      setLocalNotes({});
    } catch (err: any) {
      console.error('Error loading CRM leads:', err);
    }
  };

  useEffect(() => {
    loadCRMData();
  }, []);

  if (!activeStaff) return null;
  // @ts-ignore
  const isOwner = activeStaff?.designation?.toLowerCase().includes('owner') || false;
  const isAdminView = isAdminMode && !isOwner;



  // Add Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;

    try {
      const { data: newLead, error: insertErr } = await supabase
        .from('leads')
        .insert({
          lead_name: leadName.trim(),
          assigned_to: assignedTo || null,
          status: 'NEW LEAD',
          whatsapp_number: leadWhatsapp.trim() || undefined,
          location: leadLocation.trim() || undefined,
          project_name: leadProject.trim() || undefined,
          follow_up_notes: leadNotes.trim() || undefined
        })
        .select();

      if (insertErr) throw insertErr;

      // Log assignment if assigned to someone
      if (newLead && newLead[0] && assignedTo) {
        await supabase.from('lead_assignment_logs').insert({
          lead_id: newLead[0].id,
          staff_id: assignedTo
        });
      }

      setIsAddModalOpen(false);
      setLeadName('');
      setAssignedTo('');
      setLeadWhatsapp('');
      setLeadLocation('');
      setLeadProject('');
      setLeadNotes('');

      await loadCRMData();
    } catch (err: any) {
      alert('Failed to register lead: ' + err.message);
    }
  };

  const handleOpenEditLeadModal = (lead: Lead) => {
    setSelectedLeadForEdit(lead);
    setEditLeadName(lead.lead_name);
    setEditLeadWhatsapp(lead.whatsapp_number || '');
    setEditLeadLocation(lead.location || '');
    setEditLeadProject(lead.project_name || '');
    setEditLeadStatus(lead.status);
    setEditLeadAssignedTo(lead.assigned_to || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForEdit) return;

    setIsSavingEditLead(true);
    try {
      const { error: updateErr } = await supabase
        .from('leads')
        .update({
          lead_name: editLeadName.trim(),
          whatsapp_number: editLeadWhatsapp.trim() || null,
          location: editLeadLocation.trim() || null,
          project_name: editLeadProject.trim() || null,
          status: editLeadStatus,
          assigned_to: editLeadAssignedTo || null
        })
        .eq('id', selectedLeadForEdit.id);

      if (updateErr) throw updateErr;

      // Log assignment if reassigned
      if (editLeadAssignedTo !== selectedLeadForEdit.assigned_to) {
        await supabase.from('lead_assignment_logs').insert({
          lead_id: selectedLeadForEdit.id,
          staff_id: editLeadAssignedTo || null
        });
      }

      await loadCRMData();
      setIsEditModalOpen(false);
      setSelectedLeadForEdit(null);
    } catch (err: any) {
      alert('Failed to update lead: ' + err.message);
    } finally {
      setIsSavingEditLead(false);
    }
  };

  // Update Lead Status
  const handleUpdateStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeadsList(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
    } catch (err: any) {
      alert('Failed to update lead status: ' + err.message);
    }
  };

  // Delete/Archive Lead
  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      setLeadsList(prev => prev.filter(lead => lead.id !== leadId));
    } catch (err: any) {
      alert('Failed to archive lead: ' + err.message);
    }
  };

  // Save Follow-up notes
  const handleSaveNotes = async (leadId: string) => {
    const notesValue = localNotes[leadId];
    if (notesValue === undefined) return;

    setIsSavingNotes(prev => ({ ...prev, [leadId]: true }));
    try {
      const { error } = await supabase
        .from('leads')
        .update({ follow_up_notes: notesValue.trim() || undefined })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeadsList(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, follow_up_notes: notesValue.trim() || undefined } : lead
      ));
      
      alert('Notes saved successfully!');
    } catch (err: any) {
      alert('Failed to save follow-up notes: ' + err.message);
    } finally {
      setIsSavingNotes(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Log Call Activity
  const handleSaveCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForCall || !newCallDate) return;

    setIsSavingCall(true);
    try {
      const { error } = await supabase
        .from('lead_calls')
        .insert({
          lead_id: selectedLeadForCall.id,
          call_date: newCallDate,
          status: newCallStatus,
          notes: newCallNotes.trim() || null
        });

      if (error) throw error;

      setIsLogCallOpen(false);
      setSelectedLeadForCall(null);
      setNewCallNotes('');
      setNewCallStatus('POSITIVE');
      setNewCallDate(new Date().toISOString().split('T')[0]);
      await loadCRMData();
    } catch (err: any) {
      alert('Failed to save call log: ' + err.message);
    } finally {
      setIsSavingCall(false);
    }
  };

  // Process Bulk CSV Upload File
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      
      const leads: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 2) {
          leads.push({
            lead_name: columns[0],
            whatsapp_number: columns[1] || null,
            location: columns[2] || null
          });
        }
      }
      setParsedLeads(leads);
    };
    reader.readAsText(file);
  };

  // Distribute Bulk Leads
  const handleBulkDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedLeads.length === 0) return;

    try {
      const batchId = `BATCH-${Date.now()}`;
      let currentIdx = 0;

      for (const staff of salesExecutives) {
        const count = staffQuotas[staff.id] || 0;
        if (count > 0) {
          const quotaLeads = parsedLeads.slice(currentIdx, currentIdx + count);
          currentIdx += count;

          for (const lead of quotaLeads) {
            const { data: newLead } = await supabase
              .from('leads')
              .insert({
                lead_name: lead.lead_name,
                whatsapp_number: lead.whatsapp_number,
                location: lead.location,
                project_name: bulkProjectName || 'SMM',
                batch_id: batchId,
                assigned_to: staff.id,
                status: 'NEW LEAD'
              })
              .select();

            if (newLead && newLead[0]) {
              await supabase.from('lead_assignment_logs').insert({
                lead_id: newLead[0].id,
                staff_id: staff.id
              });
            }
          }
        }
      }

      const unassignedLeads = parsedLeads.slice(currentIdx);
      for (const lead of unassignedLeads) {
        await supabase
          .from('leads')
          .insert({
            lead_name: lead.lead_name,
            whatsapp_number: lead.whatsapp_number,
            location: lead.location,
            project_name: bulkProjectName || 'SMM',
            batch_id: batchId,
            assigned_to: null,
            status: 'NEW LEAD'
          });
      }

      setIsBulkModalOpen(false);
      setParsedLeads([]);
      setBulkProjectName('');
      setCsvFileName('');
      setStaffQuotas({});
      await loadCRMData();

      alert(`Successfully distributed ${parsedLeads.length} leads!`);
    } catch (err: any) {
      alert('Failed to distribute batch: ' + err.message);
    }
  };

  const getStaffName = (id?: string) => {
    if (!id) return 'Unassigned';
    const staff = staffRegistry.find(s => s.id === id);
    return staff ? staff.full_name : 'Staff Member';
  };

  const getLeadName = (id: string) => {
    const lead = leadsList.find(l => l.id === id);
    return lead ? lead.lead_name : 'Lead Account';
  };

  // Filtered Leads based on search and Active Mode (Admin vs Staff)
  const displayedLeads = leadsList.filter(lead => {
    const matchesSearch = lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lead.project_name && lead.project_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by selectedMonth
    const matchesMonth = !lead.created_at || lead.created_at.startsWith(selectedMonth);

    if (isAdminView) {
      if (selectedSalesExec) {
        return matchesSearch && matchesMonth && lead.assigned_to === selectedSalesExec.id;
      }
      return matchesSearch && matchesMonth;
    }
    return matchesSearch && matchesMonth && lead.assigned_to === activeStaff.id;
  });




  // Keep original currentMonthCalls for Calendar display (always Month view)
  const currentMonthCalls = callLogs.filter(call => {
    if (!isAdminView) {
      const matchLead = leadsList.find(l => l.id === call.lead_id);
      if (!matchLead || matchLead.assigned_to !== activeStaff.id) return false;
    } else if (selectedSalesExec) {
      const matchLead = leadsList.find(l => l.id === call.lead_id);
      if (!matchLead || matchLead.assigned_to !== selectedSalesExec.id) return false;
    }
    return call.call_date && call.call_date.startsWith(selectedMonth);
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Parse selectedMonth YYYY-MM
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const currentYear = selYear || new Date().getFullYear();
  const currentMonthIdx = (selMonth ? selMonth - 1 : new Date().getMonth());

  // Generate Calendar cells
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = Sun
  
  const calendarCells: (number | null)[] = [];
  // Add empty spaces for offset
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const handleDrillDate = (dayNum: number) => {
    const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayCalls = currentMonthCalls.filter(c => c.call_date === dateStr);
    setDrilledDate(dateStr);
    setDrilledCalls(dayCalls);
  };

  const columns: { title: Lead['status']; badgeColor: string }[] = [
    { title: 'NEW LEAD', badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
    { title: 'CONTACTED', badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    { title: 'PROPOSAL SENT', badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' }
  ];

  const totalAllocated = Object.values(staffQuotas).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col lg:flex-row relative w-full overflow-x-clip">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-30%] w-[90vw] h-[90vw] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>

      {/* Left Sidebar Navigation (Desktop only) */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-24 md:pb-8">
        
        {/* Header */}
        <header className="glass-panel sticky top-14 lg:top-0 z-30 px-4 md:px-8 py-3.5 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-base md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Leads & Call Logs
                <Badge variant="indigo" className="text-[10px] py-0.5 uppercase tracking-wide">
                  {isAdminView ? 'Admin Portal' : 'Staff Portal'}
                </Badge>
              </h1>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-350 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                {getMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              {(isAdminMode || activeStaff.designation === 'Digital Marketer') && (
                <Button 
                  variant="glass" 
                  size="sm" 
                  className="!py-2 !px-3 font-bold text-xs flex items-center gap-1.5 border border-white/10 hover:bg-slate-800" 
                  onClick={() => {
                    setParsedLeads([]);
                    setBulkProjectName('');
                    setCsvFileName('');
                    setStaffQuotas({});
                    setIsBulkModalOpen(true);
                  }}
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Bulk Distribution</span>
                </Button>
              )}
              
              {(isAdminMode || activeStaff.designation === 'Digital Marketer') && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="!py-2 !px-3 font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-500/20" 
                  onClick={() => {
                    setLeadName('');
                    setAssignedTo('');
                    setLeadWhatsapp('');
                    setLeadLocation('');
                    setLeadProject('');
                    setLeadNotes('');
                    setIsAddModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>New Lead</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">

          {/* Daily Date Filter Picker */}
          {activeStaff.designation !== 'Digital Marketer' && (
            <div className="flex justify-end items-center gap-2 mb-2 animate-fade-in">
              <span className="text-[10px] font-bold text-slate-400 uppercase">View Stats for Date:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              />
            </div>
          )}

          {/* Month-based history tracking cards (Digital Marketer view handles its own cards) */}
          {activeStaff.designation !== 'Digital Marketer' && (
            (() => {
              // Calculate SE specific stats (Leads Received, Total Calls, Positive Leads, Closed Works)
              const activeStaffId = !isAdminView ? activeStaff.id : (selectedSalesExec ? selectedSalesExec.id : null);
              
              if (!activeStaffId) return null; // If admin is in grid view, we hide this row

              const filteredLeadsForMetrics = leadsList.filter(l => {
                if (l.assigned_to !== activeStaffId) return false;
                const leadLocalDate = l.created_at ? new Date(l.created_at).toLocaleDateString('sv-SE') : '';
                return leadLocalDate === filterDate;
              });

              const totalLeadsReceived = filteredLeadsForMetrics.length;
              const positiveLeadsCount = filteredLeadsForMetrics.filter(l => l.status === 'PROPOSAL SENT' || l.status === 'NEGOTIATION').length;
              const closedWorksCount = filteredLeadsForMetrics.filter(l => l.status === 'WON').length;

              // Calculate calls based on selected filterDate
              const rangeFilteredCalls = callLogs.filter(call => {
                if (!isAdminView) {
                  const matchLead = leadsList.find(l => l.id === call.lead_id);
                  if (!matchLead || matchLead.assigned_to !== activeStaff.id) return false;
                } else if (selectedSalesExec) {
                  const matchLead = leadsList.find(l => l.id === call.lead_id);
                  if (!matchLead || matchLead.assigned_to !== selectedSalesExec.id) return false;
                }
                return call.call_date === filterDate;
              });
              const totalCallsCount = rangeFilteredCalls.length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 items-start animate-fade-in">
                  {/* Total Leads Received Card */}
                  <Card variant="glass" glowColor="none" className="p-4 flex flex-col justify-between border-white/5 min-h-[105px]">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Leads Received</span>
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Star className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-white mt-2">{totalLeadsReceived}</p>
                    <span className="text-[9px] text-indigo-400 font-medium block mt-1.5">
                      Leads assigned on {filterDate}
                    </span>
                  </Card>

                  {/* Total Calls Widget */}
                  <Card variant="glass" glowColor="none" className="p-4 flex flex-col justify-between border-white/5 min-h-[105px]">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Calls</span>
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-white mt-2">{totalCallsCount}</p>
                    <span className="text-[9px] text-indigo-400 font-medium block mt-1.5">
                      Calls made on {filterDate}
                    </span>
                  </Card>

                  {/* Positive Cases Widget */}
                  <Card variant="glass" glowColor="emerald" className="p-4 flex flex-col justify-between border-emerald-500/10 min-h-[105px]">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Positive Leads</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Star className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-2">{positiveLeadsCount}</p>
                    <span className="text-[9px] text-emerald-500 font-medium block mt-1.5">Proposal / Negotiation status</span>
                  </Card>

                  {/* Closed Works Widget */}
                  <Card variant="glass" glowColor="purple" className="p-4 flex flex-col justify-between border-purple-500/10 min-h-[105px]">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Closed Works</span>
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-purple-400 mt-2">{closedWorksCount}</p>
                    <span className="text-[9px] text-purple-500 font-medium block mt-1.5">Won / Closed status</span>
                  </Card>
                </div>
              );
            })()
          )}

          {/* Digital Marketer Distribution Report & Statistics */}
          {activeStaff.designation === 'Digital Marketer' && (() => {
            const formattedDate = new Date(distributionDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            return (
              <div className="space-y-6 animate-fade-in max-w-4xl">
                <Card variant="glass" className="p-5 border-white/5 space-y-4 max-w-2xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-3 gap-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Daily Distribution Report</span>
                      <span className="text-[10px] text-slate-500 font-medium normal-case">({formattedDate})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-450 uppercase">Date:</span>
                      <input 
                        type="date" 
                        value={distributionDate}
                        onChange={(e) => setDistributionDate(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Sales Executive</th>
                          <th className="py-3 px-4 text-center">Leads Assigned on this Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                        {salesExecutives.map(staff => {
                          const staffDateCount = assignmentLogs.filter(log => {
                            if (log.staff_id !== staff.id) return false;
                            const logLocalDate = new Date(log.assigned_at).toLocaleDateString('sv-SE');
                            return logLocalDate === distributionDate;
                          }).length;

                          return (
                            <tr key={staff.id} className="hover:bg-slate-900/10">
                              <td className="py-3 px-4 text-white font-bold">{staff.full_name}</td>
                              <td className="py-3 px-4 text-center text-indigo-400 font-extrabold text-sm">{staffDateCount}</td>
                            </tr>
                          );
                        })}
                        {salesExecutives.length === 0 && (
                          <tr>
                            <td colSpan={2} className="text-center py-8 text-slate-600 font-semibold">No Sales Executives registered.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Leads Directory Table */}
                <Card variant="glass" className="p-5 border-white/5 space-y-4">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Leads Directory</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Manage and reassign all system leads</p>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20 max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Lead Name</th>
                          <th className="py-2.5 px-3">Project</th>
                          <th className="py-2.5 px-3">Location</th>
                          <th className="py-2.5 px-3">WhatsApp</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Assigned Executive</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                        {leadsList.map(lead => {
                          const matchedStaff = staffRegistry.find(s => s.id === lead.assigned_to);
                          return (
                            <tr key={lead.id} className="hover:bg-slate-900/10">
                              <td className="py-2.5 px-3 text-white font-bold">{lead.lead_name}</td>
                              <td className="py-2.5 px-3 text-slate-400">{lead.project_name || '-'}</td>
                              <td className="py-2.5 px-3 text-slate-400">{lead.location || '-'}</td>
                              <td className="py-2.5 px-3 text-indigo-400 font-medium">{lead.whatsapp_number || '-'}</td>
                              <td className="py-2.5 px-3">
                                <Badge variant={lead.status === 'WON' ? 'success' : 'indigo'} className="text-[9px] py-0.5 px-1.5">
                                  {lead.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-slate-350">{matchedStaff?.full_name || 'Unassigned'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <Button 
                                  variant="glass" 
                                  size="sm"
                                  className="!py-1 !px-2 text-[10px] font-bold border border-white/10 hover:bg-slate-800"
                                  onClick={() => handleOpenEditLeadModal(lead)}
                                >
                                  Edit / Reassign
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {leadsList.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-600 font-semibold">No leads found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* ADMIN LEADS REDESIGN PANEL */}
          {isAdminView && !selectedSalesExec && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
              {/* Sales Executives Grid */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Executives</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {salesExecutives.map(staff => {
                    const assignedCount = leadsList.filter(l => {
                      if (l.assigned_to !== staff.id) return false;
                      const leadLocalDate = l.created_at ? new Date(l.created_at).toLocaleDateString('sv-SE') : '';
                      return leadLocalDate === filterDate;
                    }).length;

                    const callsCount = callLogs.filter(c => {
                      const matchLead = leadsList.find(l => l.id === c.lead_id);
                      return matchLead && matchLead.assigned_to === staff.id && c.call_date === filterDate;
                    }).length;

                    const positiveCount = leadsList.filter(l => {
                      if (l.assigned_to !== staff.id) return false;
                      const leadLocalDate = l.created_at ? new Date(l.created_at).toLocaleDateString('sv-SE') : '';
                      return leadLocalDate === filterDate && (l.status === 'PROPOSAL SENT' || l.status === 'NEGOTIATION');
                    }).length;

                    const closedCount = leadsList.filter(l => {
                      if (l.assigned_to !== staff.id) return false;
                      const leadLocalDate = l.created_at ? new Date(l.created_at).toLocaleDateString('sv-SE') : '';
                      return leadLocalDate === filterDate && l.status === 'WON';
                    }).length;

                    return (
                      <Card 
                        key={staff.id} 
                        variant="glass" 
                        className="p-4 border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all duration-200"
                        onClick={() => setSelectedSalesExec(staff)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <img 
                            src={staff.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(staff.full_name)}`} 
                            alt={staff.full_name} 
                            className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                          />
                          <div>
                            <h4 className="text-xs font-extrabold text-white">{staff.full_name}</h4>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">Sales Executive</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/20 p-2.5 rounded-xl border border-white/5">
                          <div>
                            <span className="text-slate-550 block font-bold uppercase text-[8px]">Leads</span>
                            <span className="text-white font-extrabold">{assignedCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block font-bold uppercase text-[8px]">Calls</span>
                            <span className="text-indigo-400 font-extrabold">{callsCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block font-bold uppercase text-[8px]">Positive</span>
                            <span className="text-emerald-400 font-extrabold">{positiveCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-550 block font-bold uppercase text-[8px]">Closed</span>
                            <span className="text-purple-400 font-extrabold">{closedCount}</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Call Activity Calendar (Retained on the right for Admin overall company daily calls) */}
              <div className="lg:col-span-1 space-y-4">
                <Card variant="glass" className="p-4 border-white/5">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                    Overall Call Calendar ({selectedMonth})
                  </h3>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-[9px] text-center font-bold text-slate-500 uppercase tracking-tight mb-2 border-b border-white/5 pb-1">
                    {weekDays.map(d => <div key={d}>{d}</div>)}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-[10px]">
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <div key={`empty-${idx}`} className="p-1"></div>;
                      }

                      const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayCalls = currentMonthCalls.filter(c => c.call_date === dateStr);
                      const hasPositive = dayCalls.some(c => c.status === 'POSITIVE');
                      const hasCalls = dayCalls.length > 0;

                      return (
                        <button
                          key={`day-${day}`}
                          onClick={() => handleDrillDate(day)}
                          disabled={!hasCalls}
                          className={`p-1.5 rounded-lg font-bold flex flex-col items-center justify-between transition-all duration-200 ${hasPositive ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : hasCalls ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/25' : 'bg-slate-950/20 border border-white/5 text-slate-600 cursor-default'}`}
                        >
                          <span>{day}</span>
                          {hasCalls && (
                            <span className="text-[7px] font-extrabold bg-slate-900 px-1 rounded-full text-slate-300 mt-0.5 leading-none">
                              {dayCalls.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Detailed Leads view if Sales Executive is selected by Admin */}
          {isAdminView && selectedSalesExec && (
            <div className="flex items-center justify-between border-b border-white/5 pb-3 animate-fade-in">
              <Button 
                variant="glass" 
                size="sm" 
                onClick={() => setSelectedSalesExec(null)}
                className="!py-2 !px-3 text-xs font-bold text-slate-350 border border-white/10 hover:bg-slate-800"
              >
                ← Back to Sales Executives
              </Button>
              <div className="flex items-center gap-2">
                <img 
                  src={selectedSalesExec.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(selectedSalesExec.full_name)}`} 
                  alt={selectedSalesExec.full_name} 
                  className="w-6 h-6 rounded-full border border-slate-700 object-cover"
                />
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">{selectedSalesExec.full_name}'s Leads</span>
              </div>
            </div>
          )}

          {/* Search bar and Kanban board: Rendered when it is NOT admin main grid view and NOT Digital Marketer */}
          {(!isAdminView || selectedSalesExec) && activeStaff.designation !== 'Digital Marketer' && (
            <div className="space-y-6 animate-fade-in">
              {/* Search bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search leads by name or project..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Kanban Board Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map(col => {
                  const colLeads = displayedLeads.filter(lead => lead.status === col.title);

                  return (
                    <div key={col.title} className="flex flex-col gap-4">
                      
                      {/* Column Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold py-0.5 px-2 rounded-lg ${col.badgeColor}`}>
                            {col.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-bold">{colLeads.length}</span>
                      </div>

                      {/* Column Pipeline Cards list */}
                      <div className="space-y-3.5 min-h-[300px]">
                        {colLeads.map(lead => {
                          const notesVal = localNotes[lead.id] !== undefined ? localNotes[lead.id] : (lead.follow_up_notes || '');

                          return (
                            <Card 
                              key={lead.id}
                              variant="glass"
                              className="p-4 bg-slate-900/20 border-white/5 hover:border-indigo-500/10 flex flex-col gap-3 relative"
                            >
                              <div className="flex justify-between items-start gap-1">
                                <div>
                                  <h4 className="font-bold text-white text-xs leading-tight">{lead.lead_name}</h4>
                                  <p className="text-[10px] text-slate-400 mt-1">Assigned: <span className="text-indigo-400 font-bold">{getStaffName(lead.assigned_to)}</span></p>
                                </div>
                                
                                {/* Direction controls */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {col.title !== 'NEW LEAD' && (
                                    <button
                                      onClick={() => handleUpdateStatus(lead.id, col.title === 'PROPOSAL SENT' ? 'CONTACTED' : 'NEW LEAD')}
                                      className="p-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {col.title !== 'PROPOSAL SENT' && (
                                    <button
                                      onClick={() => handleUpdateStatus(lead.id, col.title === 'NEW LEAD' ? 'CONTACTED' : 'PROPOSAL SENT')}
                                      className="p-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Location & Project labels */}
                              <div className="flex flex-wrap gap-1.5 text-[9px] font-bold mt-1">
                                {lead.project_name && (
                                  <Badge variant="indigo" className="py-0 px-1.5">{lead.project_name}</Badge>
                                )}
                                {lead.location && (
                                  <Badge variant="purple" className="py-0 px-1.5">{lead.location}</Badge>
                                )}
                              </div>

                              {/* Follow-up Notes inputs */}
                              <div className="space-y-1 pt-2 border-t border-white/5">
                                <span className="text-[9px] text-slate-500 uppercase font-bold block">Follow-up Notes</span>
                                <div className="flex gap-1.5 items-center">
                                  <textarea
                                    rows={1}
                                    value={notesVal}
                                    onChange={(e) => setLocalNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                    placeholder="Type updates..."
                                    className="flex-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-900 text-[10px] text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
                                  />
                                  <button
                                    onClick={() => handleSaveNotes(lead.id)}
                                    disabled={isSavingNotes[lead.id]}
                                    className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[9px]"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>                              {/* Action footer */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {lead.whatsapp_number && (
                                    <a
                                      href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 hover:bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/20 hover:border-emerald-500/30 transition-all"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-450" />
                                      <span className="text-[8px] uppercase">WhatsApp</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedLeadForCall(lead);
                                      setNewCallDate(new Date().toISOString().split('T')[0]);
                                      setNewCallStatus('POSITIVE');
                                      setNewCallNotes('');
                                      setIsLogCallOpen(true);
                                    }}
                                    className="flex items-center gap-1 text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-colors"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    <span className="text-[8px] uppercase">Log Call</span>
                                  </button>
                                  {isAdminView && (
                                    <button
                                      onClick={() => handleOpenEditLeadModal(lead)}
                                      className="flex items-center gap-1 text-slate-350 hover:text-white font-bold bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                      <Edit2 className="w-3 h-3 text-slate-400" />
                                      <span className="text-[8px] uppercase">Edit</span>
                                    </button>
                                  )}
                                </div>

                                {isAdminView && (
                                  <button
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                        {colLeads.length === 0 && (
                          <p className="text-center text-slate-600 py-12 text-xs font-semibold border border-dashed border-white/5 rounded-2xl">
                            No leads in column
                          </p>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* LOG CALL LOG MODAL */}
      {isLogCallOpen && selectedLeadForCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => {
                setIsLogCallOpen(false);
                setSelectedLeadForCall(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-sm mb-1 uppercase tracking-wider flex items-center gap-2">
              <PhoneCall className="w-4.5 h-4.5 text-indigo-400" />
              Log Call Activity
            </h3>
            <p className="text-xs text-slate-400 mb-4">Client: {selectedLeadForCall.lead_name}</p>
            <form onSubmit={handleSaveCallLog} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Call Date</label>
                <input 
                  type="date" 
                  required
                  value={newCallDate}
                  onChange={(e) => setNewCallDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Call Status / Outcome</label>
                <select
                  value={newCallStatus}
                  onChange={(e) => setNewCallStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="POSITIVE">Positive Conversion</option>
                  <option value="NEGATIVE">Negative Response</option>
                  <option value="NO ANSWER">No Answer / Busy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Conversation Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client requested website proposal by Monday..."
                  value={newCallNotes}
                  onChange={(e) => setNewCallNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => {
                    setIsLogCallOpen(false);
                    setSelectedLeadForCall(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" fullWidth disabled={isSavingCall}>Save Log</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CALENDAR DRILL-DOWN MODAL */}
      {drilledDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <Card variant="solid" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setDrilledDate(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              Calls Logged: {drilledDate}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{drilledCalls.length} calls logged on this date</p>
            
            <div className="space-y-3">
              {drilledCalls.map(call => (
                <div key={call.id} className="p-3 rounded-xl bg-slate-950/40 border border-white/5 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{getLeadName(call.lead_id)}</span>
                    <Badge variant={call.status === 'POSITIVE' ? 'success' : call.status === 'NEGATIVE' ? 'error' : 'warning'} className="text-[8px] py-0 px-1">
                      {call.status}
                    </Badge>
                  </div>
                  {call.notes ? (
                    <p className="text-slate-400 italic text-[11px] font-medium leading-normal bg-slate-950/40 p-2 rounded-lg border border-white/5 mt-1">"{call.notes}"</p>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">No notes captured</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* NEW LEAD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
              Register New Lead
            </h3>
            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Lead Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp (No)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 9876543210"
                    value={leadWhatsapp}
                    onChange={(e) => setLeadWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Delhi"
                    value={leadLocation}
                    onChange={(e) => setLeadLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Project / Requirements</label>
                <input 
                  type="text" 
                  placeholder="e.g. Website Design"
                  value={leadProject}
                  onChange={(e) => setLeadProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Initial Conversation Notes</label>
                <textarea
                  rows={2}
                  placeholder="Type updates..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {staffRegistry.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth>Create Lead</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* BULK LEADS DISTRIBUTION DIALOG */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up max-h-[95vh] overflow-y-auto">
            <button 
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-4">Bulk Leads Distribution Panel</h3>
            <form onSubmit={handleBulkDistribution} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Requirements Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. SMM, Website, SEO"
                  value={bulkProjectName}
                  onChange={(e) => setBulkProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Upload Leads CSV File</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-file-upload"
                  />
                  <label 
                    htmlFor="csv-file-upload"
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Upload CSV File</span>
                  </label>
                  {csvFileName && (
                    <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px]">
                      {csvFileName} ({parsedLeads.length} leads)
                    </span>
                  )}
                </div>
              </div>

              {parsedLeads.length > 0 && (
                <div className="space-y-3 pt-3.5 border-t border-white/5">
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 font-bold mb-3 flex justify-between">
                    <span>Valid Leads Found:</span>
                    <span className="text-white font-extrabold">{parsedLeads.length}</span>
                  </div>
                  <label className="text-xs font-bold text-indigo-300 block">Allocate Leads Quotas to Sales Executives</label>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 scrollbar-none">
                    {salesExecutives.map(staff => (
                      <div key={staff.id} className="flex justify-between items-center gap-2 text-xs">
                        <span className="font-bold text-slate-300 truncate max-w-[200px]">{staff.full_name}</span>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={staffQuotas[staff.id] || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setStaffQuotas(prev => ({ ...prev, [staff.id]: val }));
                          }}
                          className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-850 text-right text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {totalAllocated < parsedLeads.length && (
                    <p className="text-[10px] text-amber-400 font-bold leading-normal">
                      ⚠️ Remaining to allocate: {parsedLeads.length - totalAllocated} leads. Quotas must sum up exactly to the total leads count.
                    </p>
                  )}
                  {totalAllocated > parsedLeads.length && (
                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 leading-normal">
                      ⚠️ Error: Allocated count exceeds parsed leads by {totalAllocated - parsedLeads.length}. Adjust quotas.
                    </p>
                  )}
                  {totalAllocated === parsedLeads.length && (
                    <p className="text-[10px] text-emerald-450 font-bold flex items-center gap-1 leading-normal">
                      ✅ Perfect allocation! {totalAllocated} of {parsedLeads.length} leads allocated.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth disabled={parsedLeads.length === 0 || totalAllocated !== parsedLeads.length}>Distribute Batch</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT/REASSIGN LEAD DIALOG */}
      {isEditModalOpen && selectedLeadForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedLeadForEdit(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-indigo-400" />
              Edit / Reassign Lead
            </h3>
            <form onSubmit={handleUpdateLead} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Lead Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={editLeadName}
                  onChange={(e) => setEditLeadName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp (No)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 9876543210"
                    value={editLeadWhatsapp}
                    onChange={(e) => setEditLeadWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Delhi"
                    value={editLeadLocation}
                    onChange={(e) => setEditLeadLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Project / Requirements</label>
                <input 
                  type="text" 
                  placeholder="e.g. Website Design"
                  value={editLeadProject}
                  onChange={(e) => setEditLeadProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                  <select
                    value={editLeadStatus}
                    onChange={(e) => setEditLeadStatus(e.target.value as Lead['status'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="NEW LEAD">NEW LEAD</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="PROPOSAL SENT">PROPOSAL SENT</option>
                    <option value="NEGOTIATION">NEGOTIATION</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff</label>
                  <select
                    value={editLeadAssignedTo}
                    onChange={(e) => setEditLeadAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {staffRegistry.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedLeadForEdit(null);
                }}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth disabled={isSavingEditLead}>
                  {isSavingEditLead ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Mobile Sticky Bottom Tab Bar Navigation (Hidden on desktop) */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 backdrop-blur-md py-2.5 px-6 z-40 md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('sales')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-[9px] font-medium">Sales</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-medium">History</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('attendance')}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
          >
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-medium">Attendance</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-indigo-400 select-none">
            <Star className="w-5 h-5" />
            <span className="text-[9px] font-bold">Leads</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default LeadsCRM;
