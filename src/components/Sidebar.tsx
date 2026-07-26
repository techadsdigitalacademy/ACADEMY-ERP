import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Briefcase, 
  DollarSign, 
  FileText, 
  Clock, 
  Users, 
  Edit2, 
  GraduationCap, 
  Wallet,
  Sparkles,
  Settings,
  LogOut,
  Camera
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeStaff, 
    activeTab, 
    setActiveTab, 
    isAdminMode, 
    logout,
    
  } = useApp();

  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  if (!activeStaff) return null;

  const isOwner = activeStaff.full_name === 'SHIBILI' || activeStaff.full_name === 'ASHIF' || activeStaff.designation?.toLowerCase().includes('owner');
  const isAdminView = isAdminMode && !isOwner;
  const isCreativeRole = activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Videographer';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      /* await (file); */
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 bg-slate-900/20 backdrop-blur-lg fixed inset-y-0 left-0 z-40 p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-wider">Tech Ads</span>
              <span className="text-[10px] block text-indigo-400 font-bold leading-none uppercase">ERP & CRM</span>
            </div>
          </div>

          <nav className="space-y-1.5 pt-4">
            <button 
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'sales' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
            >
              <Briefcase className="w-4.5 h-4.5" />
              <span>{(isAdminView && !isOwner) ? 'Admin Hub' : 'Sales Hub'}</span>
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'history' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
            >
              {isCreativeRole ? (
                <>
                  <Edit2 className="w-4.5 h-4.5" />
                  <span>Daily Reports</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4.5 h-4.5" />
                  <span>{(isAdminView && !isOwner) ? 'Staff History' : 'Sales History'}</span>
                </>
              )}
            </button>

            {isOwner && (
              <button 
                onClick={() => setActiveTab('expense_history')}
                className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'expense_history' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>Expense History</span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'attendance' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
            >
              <Clock className="w-4.5 h-4.5" />
              <span>Attendance</span>
            </button>

            {activeStaff && activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Videographer' && (
              <button 
                onClick={() => setActiveTab('leads')}
                className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'leads' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
              >
                <Users className="w-4.5 h-4.5" />
                <span>Leads</span>
              </button>
            )}

            {isAdminMode && !isOwner && (
              <>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'reports' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <Edit2 className="w-4.5 h-4.5" />
                  <span>Daily Reports Log</span>
                </button>

                <button 
                  onClick={() => setActiveTab('academy_overview')}
                  className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'academy_overview' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <GraduationCap className="w-4.5 h-4.5" />
                  <span>Academy</span>
                </button>

                <button 
                  onClick={() => setActiveTab('staff')}
                  className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'staff' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <Users className="w-4.5 h-4.5" />
                  <span>Staff Management</span>
                </button>

                <button 
                  onClick={() => setActiveTab('finance')}
                  className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'finance' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                  <Briefcase className="w-4.5 h-4.5" />
                  <span>Finance</span>
                </button>
              </>
            )}

            {(isAdminMode || isOwner) && (
              <button 
                onClick={() => setActiveTab('withdrawals')}
                className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'withdrawals' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
              >
                <Wallet className="w-4.5 h-4.5" />
                <span>Partner Withdrawals</span>
              </button>
            )}

          </nav>
        </div>

        {/* Sidebar Footer User Profile */}
        <div className="border-t border-white/5 pt-4 space-y-3.5">
          <div className="flex items-center gap-3 px-2">
            <div className="relative group">
              <img 
                src={activeStaff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}&background=random`}
                alt={activeStaff.full_name} 
                className="w-10 h-10 rounded-full border border-slate-700 object-cover"
              />
              <label 
                htmlFor="avatar-upload-sidebar"
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                className="hidden"
                id="avatar-upload-sidebar"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate leading-tight">{activeStaff.full_name}</h4>
              <span className="text-[9px] block text-indigo-400 font-bold leading-none uppercase mt-1">
                {activeStaff.designation}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-white/5 transition-all duration-200"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <button 
              onClick={logout}
              className="flex items-center justify-center p-2 rounded-xl text-rose-450 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
