import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { StaffDrilldownModal } from '../components/StaffDrilldownModal';
import { NoticeBoardAdminModal } from '../components/NoticeBoardAdminModal';
import { Megaphone } from 'lucide-react';
import StaffProfileDrawer from '../components/StaffProfileDrawer';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase, supabaseAdmin } from '../services/supabase';
import { 
   
  Search, 
  X, 
  Briefcase, 
   
   
   
   
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  ShieldAlert,
  
Star,
  Key,
} from 'lucide-react';

import type { StaffProfile } from '../types';

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  created_at: string;
}



export const StaffManagement: React.FC = () => {
  const { activeStaff, setActiveTab, isAdminMode,  } = useApp();

  if (!activeStaff) return null;
  // @ts-ignore
  const isOwner = activeStaff?.designation?.toLowerCase().includes('owner') || false;

  // List & Search states
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Holiday states
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('');
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Add Staff Form states
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('Male');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [weeklyOff, setWeeklyOff] = useState('Sunday');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Staff Profile Modal states
  const [drilldownProfile, setDrilldownProfile] = useState<StaffProfile | null>(null);
  const [isNoticeBoardModalOpen, setIsNoticeBoardModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StaffProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editShiftStart, setEditShiftStart] = useState('09:00');
  const [editShiftEnd, setEditShiftEnd] = useState('18:00');
  const [editWeeklyOff, setEditWeeklyOff] = useState('Sunday');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Detailed Profile Overlay state
  const [selectedProfile, setSelectedProfile] = useState<StaffProfile | null>(null);

  // Edit Sale overlay in detail view

  // Fetch all profiles, holidays
  const loadInitialData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. Fetch profiles
      const { data: profs, error: profErr } = await supabase
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profErr) throw profErr;

      // Fetch avatar_urls from staff table
      const { data: staffData } = await supabase
        .from('staff')
        .select('full_name, avatar_url');
      
      const avatarMap = new Map();
      if (staffData) {
        staffData.forEach(s => {
          if (s.full_name && s.avatar_url) {
            avatarMap.set(s.full_name, s.avatar_url);
          }
        });
      }

      const mergedProfs = (profs || [])
        ?.filter(p => {
          const desig = p.designation?.toLowerCase() || '';
          return !desig.includes('tutor') && !desig.includes('counselor');
        })
        ?.map(p => ({
          ...p,
          avatar_url: avatarMap.get(p.full_name) || undefined
        }));

      setProfiles(mergedProfs);

      // 2. Fetch holidays
      const { data: hols, error: holErr } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: false });
      if (holErr) {
        setHolidays([]);
      } else {
        setHolidays(hols || []);
      }

    } catch (err: any) {
      console.error('Error fetching staff registers:', err);
      setDbError(err.message || 'Failed to fetch staff management registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch detailed info for clicked profile
  

  const handleSelectProfile = (profile: StaffProfile) => {
    setSelectedProfile(profile);
  };

  // Filter profiles (strictly excluding Tutor & Academy Counselor)
  const filteredProfiles = profiles?.filter(p => {
    const desig = p.designation?.toLowerCase() || '';
    if (desig.includes('tutor') || desig.includes('counselor')) return false;

    return (
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  
  // Add new profile
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !designation.trim() || !username.trim() || !password.trim()) return;

    setIsAdding(true);
    try {
      let createdAuthUserId: string | null = null;
      let finalPassword = password;
      if (finalPassword.length < 6) {
        finalPassword = finalPassword.padEnd(6, "0");
      }
      if (supabaseAdmin) {
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");
        const email = `${cleanUsername}@agency.com`;
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: finalPassword,
          email_confirm: true
        });
        if (authErr) {
          console.error('Supabase Auth user creation failed:', authErr);
        } else if (authUser?.user) {
          createdAuthUserId = authUser.user.id;
        }
      }

      const { error } = await supabase
        .from('staff_profiles')
        .insert({
          full_name: fullName.trim(),
          designation: designation.trim(),
          username: username.trim(),
          password: finalPassword,
          gender,
          shift_start_time: shiftStart,
          shift_end_time: shiftEnd,
          weekly_off_day: weeklyOff,
          auth_user_id: createdAuthUserId
        });

      if (error) throw error;

      // Add to general 'staff' table also so they have target/dashboard references
      const { data: existingStaff } = await supabase
        .from('staff')
        .select('id')
        .eq('full_name', fullName.trim())
        .maybeSingle();

      if (!existingStaff) {
        await supabase.from('staff').insert({
          full_name: fullName.trim(),
          staff_code: `TA-STF-${Math.floor(10 + Math.random() * 90)}`,
          monthly_target_amount: 500000,
          status: 'ACTIVE'
        });
      }

      setFullName('');
      setDesignation('');
      setUsername('');
      setPassword('');
      setGender('Male');
      setShiftStart('09:00');
      setShiftEnd('18:00');
      setWeeklyOff('Sunday');

      await loadInitialData();
    } catch (err: any) {
      alert('Failed to add staff member: ' + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;

    setIsAddingHoliday(true);
    try {
      const { error } = await supabase
        .from('holidays')
        .insert({
          holiday_date: holidayDate,
          holiday_name: holidayName.trim()
        });

      if (error) throw error;

      setHolidayName('');
      setHolidayDate(new Date().toISOString().split('T')[0]);
      await loadInitialData();
    } catch (err: any) {
      alert('Failed to mark holiday: ' + err.message);
    } finally {
      setIsAddingHoliday(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to cancel the holiday "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInitialData();
    } catch (err: any) {
      alert('Failed to delete holiday: ' + err.message);
    }
  };

  
  // Reset Password for a partner/staff
  const handleResetPassword = async (profile: StaffProfile) => {
    const newPassword = prompt(`Enter new password for ${profile.full_name}:`);
    if (!newPassword || newPassword.trim() === '') return;
    
    if (!profile.auth_user_id) {
      alert('This profile does not have an associated authentication user ID.');
      return;
    }

    if (!supabaseAdmin) {
      alert('Admin privileges not available to reset password.');
      return;
    }

    try {
      // Update in Supabase Auth
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        profile.auth_user_id,
        newPassword.trim().length < 6 ? { password: newPassword.trim().padEnd(6, "0") } : { password: newPassword.trim() }
      );
      if (authErr) throw authErr;

      // Update in staff_profiles for reference
      const { error: dbErr } = await supabase
        .from('staff_profiles')
        .update(newPassword.trim().length < 6 ? { password: newPassword.trim().padEnd(6, "0") } : { password: newPassword.trim() })
        .eq('id', profile.id);
      if (dbErr) throw dbErr;

      alert(`Password for ${profile.full_name} has been reset successfully!`);
      await loadInitialData();
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    }
  };

  // Delete profile
  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete staff member "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadInitialData();
    } catch (err: any) {
      alert('Failed to delete staff member: ' + err.message);
    }
  };

  // Open edit profile modal
  const openEditModal = (profile: StaffProfile) => {
    setEditingProfile(profile);
    setEditFullName(profile.full_name);
    setEditDesignation(profile.designation);
    setEditUsername(profile.username);
    setEditGender(profile.gender);
    setEditShiftStart(profile.shift_start_time.substring(0, 5));
    setEditShiftEnd(profile.shift_end_time.substring(0, 5));
    setEditWeeklyOff(profile.weekly_off_day);
    setIsEditModalOpen(true);
  };

  // Update profile
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editFullName.trim() || !editDesignation.trim() || !editUsername.trim()) return;

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('staff_profiles')
        .update({
          full_name: editFullName.trim(),
          designation: editDesignation.trim(),
          username: editUsername.trim(),
          gender: editGender,
          shift_start_time: editShiftStart,
          shift_end_time: editShiftEnd,
          weekly_off_day: editWeeklyOff
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingProfile(null);
      await loadInitialData();
    } catch (err: any) {
      alert('Failed to update staff member: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Admin update specific sale in detailed history
  



  // Get generic avatar URLs based on name & gender
  const getAvatarUrl = (name: string, gender: string) => {
    const genderKey = gender.toLowerCase() === 'female' ? 'girl' : 'boy';
    const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const index = (sum % 20) + 1;
    return `https://avatar.iran.liara.run/public/${genderKey}?username=${encodeURIComponent(name)}&idx=${index}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex relative overflow-x-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-30%] w-[90vw] h-[90vw] rounded-full bg-purple-900/10 blur-[150px] pointer-events-none"></div>

      {/* Left Sidebar Navigation (Desktop only) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-24 md:pb-8 animate-fade-in">
        
        {/* Header Section */}
        <header className="glass-panel sticky top-0 z-30 px-4 md:px-8 py-3.5 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-base md:text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Staff Management Hub
              <Badge variant="indigo" className="text-[10px] py-0.5">Admin Only</Badge>
            </h1>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsNoticeBoardModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" /> Notice Board
              </button>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">{profiles.length} Staff Registry</span>
            </div>
          </div>
        </header>

        {/* Main Containers */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">
          
          {dbError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-xs text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Database Error</p>
                <p className="opacity-90">{dbError}</p>
              </div>
            </div>
          )}

          {/* Holiday Management Board */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Holiday Input */}
            <div className="lg:col-span-4">
              <Card variant="glass" className="p-5 border-white/5 space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <Calendar className="w-4.5 h-4.5 text-amber-400" />
                  Mark Special Holiday
                </h3>
                <form onSubmit={handleAddHoliday} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Holiday Date</label>
                    <input 
                      type="date" 
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Holiday Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Independence Day"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    fullWidth 
                    disabled={isAddingHoliday}
                    className="font-bold text-xs uppercase"
                  >
                    {isAddingHoliday ? 'Marking...' : 'Mark Holiday'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Holiday List */}
            <div className="lg:col-span-8">
              <Card variant="glass" className="p-5 border-white/5 space-y-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider border-b border-white/5 pb-2.5">
                  Registered Holidays Calendar
                </h3>
                <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-1 scrollbar-none">
                  {holidays?.map(h => (
                    <div key={h.id} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2">
                      <div>
                        <span className="font-bold text-amber-300 block">{h.holiday_name}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">{h.holiday_date} (Sunday defaults as Holiday)</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteHoliday(h.id, h.holiday_name)}
                        className="p-1 rounded bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <p className="text-xs text-slate-500 py-6 text-center w-full font-medium">No special holidays marked. Standard Sundays apply automatically.</p>
                  )}
                </div>
              </Card>
            </div>

          </div>

          {/* Two-column Layout for Staff adding and listing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Add New Member Form */}
            <div className="lg:col-span-4 space-y-4">
              <Card variant="glass" className="p-5 border-white/5 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Add New Member</h3>
                </div>

                <form onSubmit={handleAddStaff} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Staff Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Designation</label>
                    <select 
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Select Designation</option>
                      <option value="Managing Director">Managing Director</option>
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Digital Marketer">Digital Marketer</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Content Creator">Content Creator</option>
                      <option value="Company Owner">Company Owner</option>
                      <option value="Videographer">Videographer</option>
                      <option value="Company Staff">Company Staff</option>
                      <option value="Demo">Demo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Shift Start</label>
                      <input 
                        type="time" 
                        required
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Shift End</label>
                      <input 
                        type="time" 
                        required
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Weekly Off</label>
                    <select
                      value={weeklyOff}
                      onChange={(e) => setWeeklyOff(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    fullWidth 
                    className="mt-4 font-bold text-xs uppercase"
                    disabled={isAdding}
                  >
                    {isAdding ? 'Adding Member...' : 'Add Staff Member'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Right Column: Active Team Members List */}
            <div className="lg:col-span-8 space-y-4">
              <Card variant="glass" className="p-5 border-white/5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <Star className="w-5 h-5 text-indigo-400" />
                    Active Team Members (Click card to drill-down)
                  </h3>
                  
                  {/* Search registry */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search name, design..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Team Grid list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {loading ? (
                    <div className="col-span-2 text-center py-12 text-slate-500 text-xs font-bold animate-pulse">
                      Syncing team list from Supabase...
                    </div>
                  ) : filteredProfiles.length > 0 ? (
                    filteredProfiles?.map(profile => (
                      <div 
                        key={profile.id} 
                        onClick={() => handleSelectProfile(profile)}
                        className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 flex gap-3 hover:border-indigo-500/20 cursor-pointer transition-colors duration-200"
                      >
                        <img 
                          src={profile.avatar_url || getAvatarUrl(profile.full_name, profile.gender)} 
                          alt={profile.full_name} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-800"
                        />
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-slate-200 text-xs truncate leading-tight">{profile.full_name}</h4>
                            <span className="text-[10px] text-indigo-300/80 font-bold tracking-tight block mt-0.5">{profile.designation}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2.5 text-[9px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-slate-600" />
                              {profile.shift_start_time.substring(0, 5)} - {profile.shift_end_time.substring(0, 5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              Off: {profile.weekly_off_day}
                            </span>
                          </div>
                        </div>

                        {/* Actions buttons stack */}
                        <div className="flex flex-col gap-1.5 shrink-0 justify-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleResetPassword(profile)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDrilldownProfile(profile)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(profile.id, profile.full_name)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-16 glass-card border border-dashed border-white/5 rounded-2xl">
                      <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-semibold">No active staff members.</p>
                      <p className="text-xs text-slate-500 mt-1">Use the form to log first entry.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

          </div>

        </main>
      </div>

      {/* DETAILED STAFF PROFILE MODAL/OVERLAY */}
      <StaffProfileDrawer profile={selectedProfile} onClose={() => setSelectedProfile(null)} />

      {/* EDIT STAFF PROFILE MODAL */}
      {isEditModalOpen && editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card 
            variant="solid" 
            glowColor="indigo" 
            className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingProfile(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors duration-200"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Team Member</h3>
                <p className="text-xs text-slate-400">Correct team member credentials or details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Staff Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Designation</label>
                <select 
                  required
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select Designation</option>
                  <option value="Managing Director">Managing Director</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Digital Marketer">Digital Marketer</option>
                  <option value="Graphic Designer">Graphic Designer</option>
                  <option value="Content Creator">Content Creator</option>
                  <option value="Company Owner">Company Owner</option>
                  <option value="Videographer">Videographer</option>
                  <option value="Company Staff">Company Staff</option>
                  <option value="Demo">Demo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. johndoe"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Shift Start</label>
                  <input 
                    type="time" 
                    required
                    value={editShiftStart}
                    onChange={(e) => setEditShiftStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Shift End</label>
                  <input 
                    type="time" 
                    required
                    value={editShiftEnd}
                    onChange={(e) => setEditShiftEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Weekly Off</label>
                <select
                  value={editWeeklyOff}
                  onChange={(e) => setEditWeeklyOff(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="Sunday">Sunday</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingProfile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
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
            <span className="text-[9px] font-medium">Sales Hub</span>
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

          {isAdminMode && (
            <>
              <button 
                onClick={() => setActiveTab('academy_batches')}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
              >
                <Star className="w-5 h-5" />
                <span className="text-[9px] font-medium">Academy</span>
              </button>

              <button 
                onClick={() => setActiveTab('leads')}
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
              >
                <Star className="w-5 h-5" />
                <span className="text-[9px] font-medium">Leads</span>
              </button>
            </>
          )}
        </div>
      </nav>
      {drilldownProfile && (
        <StaffDrilldownModal
          profile={drilldownProfile}
          onClose={() => setDrilldownProfile(null)}
          onEdit={() => {
            setDrilldownProfile(null);
            openEditModal(drilldownProfile);
          }}
        />
      )}
      
      {isNoticeBoardModalOpen && (
        <NoticeBoardAdminModal
          onClose={() => setIsNoticeBoardModalOpen(false)}
          staffId={activeStaff?.id}
        />
      )}
    </div>
  );
};

export default StaffManagement;
