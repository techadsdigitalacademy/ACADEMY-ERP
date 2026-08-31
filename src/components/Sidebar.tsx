import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { processAvatarFile } from '../utils/imageUtils';
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
  Camera,
  FolderOpen,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeStaff, 
    activeTab, 
    setActiveTab, 
    isAdminMode, 
    logout,
    theme,
    toggleTheme,
    updateAvatar
  } = useApp();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  React.useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    const handleClose = () => setIsMobileOpen(false);
    window.addEventListener('toggle_mobile_sidebar', handleToggle);
    window.addEventListener('close_mobile_sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle_mobile_sidebar', handleToggle);
      window.removeEventListener('close_mobile_sidebar', handleClose);
    };
  }, []);

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [activeTab]);

  if (!activeStaff) return null;

  const isOwner = activeStaff.full_name === 'SHIBILI' || activeStaff.full_name === 'ASHIF' || activeStaff.designation?.toLowerCase().includes('owner');
  const isAdminView = isAdminMode && !isOwner;
  const isCreativeRole = activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Videographer';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const processedBlob = await processAvatarFile(file);
      await updateAvatar(processedBlob);
      alert('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar: ' + (error.message || 'Please try another image.'));
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
    window.dispatchEvent(new CustomEvent('close_mobile_sidebar'));
  };

  const renderNavLinks = () => (
    <nav className="space-y-1.5 pt-4">
      <button 
        onClick={() => handleNavClick('sales')}
        className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'sales' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
      >
        <Briefcase className="w-4.5 h-4.5" />
        <span>{(isAdminView && !isOwner) ? 'Admin Hub' : 'Sales Hub'}</span>
      </button>

      <button 
        onClick={() => handleNavClick(isAdminView && !isOwner ? 'staff-history' : 'history')}
        className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'history' || activeTab === 'staff-history' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
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
          onClick={() => handleNavClick('expense_history')}
          className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'expense_history' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
        >
          <FileText className="w-4.5 h-4.5" />
          <span>Expense History</span>
        </button>
      )}

      <button 
        onClick={() => handleNavClick('attendance')}
        className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'attendance' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
      >
        <Clock className="w-4.5 h-4.5" />
        <span>Attendance</span>
      </button>

      <button 
        onClick={() => handleNavClick('assets')}
        className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'assets' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
      >
        <FolderOpen className="w-4.5 h-4.5" />
        <span>Asset Library</span>
      </button>

      {activeStaff && activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Videographer' && (
        <button 
          onClick={() => handleNavClick('leads')}
          className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'leads' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>Leads</span>
        </button>
      )}

      {isAdminMode && !isOwner && (
        <>
          <button 
            onClick={() => handleNavClick('reports')}
            className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'reports' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
          >
            <Edit2 className="w-4.5 h-4.5" />
            <span>Daily Reports Log</span>
          </button>

          <button 
            onClick={() => handleNavClick('academy_overview')}
            className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'academy_overview' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Academy</span>
          </button>

          <button 
            onClick={() => handleNavClick('staff')}
            className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'staff' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
          >
            <Users className="w-4.5 h-4.5" />
            <span>Staff Management</span>
          </button>

          <button 
            onClick={() => handleNavClick('finance')}
            className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'finance' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
          >
            <Briefcase className="w-4.5 h-4.5" />
            <span>Finance</span>
          </button>
        </>
      )}

      {(isAdminMode || isOwner) && (
        <button 
          onClick={() => handleNavClick('withdrawals')}
          className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'withdrawals' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 font-bold border border-indigo-500/20' : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/40'}`}
        >
          <Wallet className="w-4.5 h-4.5" />
          <span>Partner Withdrawals</span>
        </button>
      )}
    </nav>
  );

  const renderFooterProfile = (idPrefix: string) => (
    <div className="border-t border-slate-200 dark:border-white/5 pt-4 space-y-3.5">
      <div className="flex items-center gap-3 px-2">
        <div className="relative group">
          <img 
            src={activeStaff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}&background=random`}
            alt={activeStaff.full_name} 
            className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
          />
          <label 
            htmlFor={`avatar-upload-${idPrefix}`}
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
            id={`avatar-upload-${idPrefix}`}
          />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate leading-tight">{activeStaff.full_name}</h4>
          <span className="text-[9px] block text-indigo-600 dark:text-indigo-400 font-bold leading-none uppercase mt-1">
            {activeStaff.designation}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex items-center justify-center p-2 rounded-xl text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 transition-all duration-200 cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
        </button>
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 transition-all duration-200"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
        <button 
          onClick={logout}
          className="flex items-center justify-center p-2 rounded-xl text-rose-500 dark:text-rose-450 bg-rose-500/10 border border-rose-500/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-indigo-500" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm text-slate-900 dark:text-white tracking-wider">Tech Ads</span>
              <span className="text-[9px] block text-indigo-600 dark:text-indigo-400 font-bold leading-none uppercase">ERP & CRM</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
          </button>
          <img 
            src={activeStaff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}&background=random`}
            alt={activeStaff.full_name} 
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 object-cover"
          />
        </div>
      </div>

      {/* Mobile Drawer Overlay / Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)} 
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity duration-300"
        />
      )}

      {/* Mobile Drawer Navigation Panel (Slide-out) */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200 dark:border-white/10 z-50 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-wider">Tech Ads</span>
                <span className="text-[10px] block text-indigo-600 dark:text-indigo-400 font-bold leading-none uppercase">ERP & CRM</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderNavLinks()}
        </div>

        {renderFooterProfile('mobile')}
      </aside>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-white/5 bg-white/95 dark:bg-slate-900/40 backdrop-blur-lg fixed inset-y-0 left-0 z-40 p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-wider">Tech Ads</span>
              <span className="text-[10px] block text-indigo-600 dark:text-indigo-400 font-bold leading-none uppercase">ERP & CRM</span>
            </div>
          </div>

          {renderNavLinks()}
        </div>

        {renderFooterProfile('desktop')}
      </aside>
    </>
  );
};
