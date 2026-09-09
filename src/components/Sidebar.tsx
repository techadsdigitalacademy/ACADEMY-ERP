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
        className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'sales' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
      >
        <Briefcase className="w-4 h-4 shrink-0" />
        <span>{(isAdminView && !isOwner) ? 'Admin Hub' : 'Sales Hub'}</span>
      </button>

      <button 
        onClick={() => handleNavClick(isAdminView && !isOwner ? 'staff-history' : 'history')}
        className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'history' || activeTab === 'staff-history' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
      >
        {isCreativeRole ? (
          <>
            <Edit2 className="w-4 h-4 shrink-0" />
            <span>Daily Reports</span>
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>{(isAdminView && !isOwner) ? 'Staff History' : 'Sales History'}</span>
          </>
        )}
      </button>

      {isOwner && (
        <button 
          onClick={() => handleNavClick('expense_history')}
          className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'expense_history' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Expense History</span>
        </button>
      )}

      <button 
        onClick={() => handleNavClick('attendance')}
        className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'attendance' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
      >
        <Clock className="w-4 h-4 shrink-0" />
        <span>Attendance</span>
      </button>

      <button 
        onClick={() => handleNavClick('assets')}
        className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'assets' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
      >
        <FolderOpen className="w-4 h-4 shrink-0" />
        <span>Asset Library</span>
      </button>

      {activeStaff && activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Videographer' && (
        <button 
          onClick={() => handleNavClick('leads')}
          className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'leads' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>Leads</span>
        </button>
      )}

      {isAdminMode && !isOwner && (
        <>
          <button 
            onClick={() => handleNavClick('reports')}
            className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'reports' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Edit2 className="w-4 h-4 shrink-0" />
            <span>Daily Reports Log</span>
          </button>

          <button 
            onClick={() => handleNavClick('academy_overview')}
            className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'academy_overview' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Academy</span>
          </button>

          <button 
            onClick={() => handleNavClick('staff')}
            className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'staff' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Staff Management</span>
          </button>

          <button 
            onClick={() => handleNavClick('finance')}
            className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'finance' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Finance</span>
          </button>
        </>
      )}

      {(isAdminMode || isOwner) && (
        <button 
          onClick={() => handleNavClick('withdrawals')}
          className={`flex items-center gap-2.5 w-full h-9 px-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${activeTab === 'withdrawals' ? 'bg-muted text-foreground font-semibold [&>svg]:text-primary' : 'text-secondary-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span>Partner Withdrawals</span>
        </button>
      )}
    </nav>
  );

  const renderFooterProfile = (idPrefix: string) => (
    <div className="border-t border-border pt-3 space-y-3">
      <div className="flex items-center gap-3 px-2">
        <div className="relative group">
          <img 
            src={activeStaff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}&background=random`}
            alt={activeStaff.full_name} 
            className="w-8 h-8 rounded-full border border-border object-cover"
          />
          <label 
            htmlFor={`avatar-upload-${idPrefix}`}
            className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <Camera className="w-3.5 h-3.5 text-foreground" />
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
          <h4 className="text-[13px] font-semibold text-foreground truncate leading-tight">{activeStaff.full_name}</h4>
          <span className="text-[9.5px] block text-muted-foreground font-semibold leading-none uppercase tracking-[.07em] mt-1">
            {activeStaff.designation}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex items-center justify-center h-8 w-8 rounded-md text-secondary-foreground bg-card border border-border hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 h-8 px-2 rounded-md text-[11px] font-medium text-secondary-foreground hover:text-foreground bg-card hover:bg-muted border border-border transition-colors duration-150"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
        <button 
          onClick={logout}
          className="flex items-center justify-center h-8 w-8 rounded-md text-danger bg-card border border-border hover:bg-danger-soft transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="h-8 w-8 rounded-md bg-card text-foreground border border-border hover:bg-muted transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground tracking-tight">Tech Ads</span>
              <span className="text-[9.5px] block text-muted-foreground font-semibold leading-none uppercase tracking-[.07em]">ERP & CRM</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="h-7 w-7 rounded-md text-secondary-foreground bg-card border border-border hover:bg-muted hover:text-foreground transition-colors duration-150 flex items-center justify-center"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <img 
            src={activeStaff.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStaff.full_name)}&background=random`}
            alt={activeStaff.full_name} 
            className="w-7 h-7 rounded-full border border-border object-cover"
          />
        </div>
      </div>

      {/* Mobile Drawer Overlay / Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)} 
          className="lg:hidden fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        />
      )}

      {/* Mobile Drawer Navigation Panel (Slide-out) */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border z-50 p-4 flex flex-col justify-between transform transition-transform duration-300 ease-in-out shadow-[var(--shadow-pop)] ${
 isMobileOpen ? 'translate-x-0' : '-translate-x-full'
 }`}
      >
        <div className="space-y-6 overflow-y-auto scrollbar-none">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-primary text-primary-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-foreground tracking-tight">Tech Ads</span>
                <span className="text-[9.5px] block text-muted-foreground font-semibold leading-none uppercase tracking-[.07em]">ERP & CRM</span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="h-7 w-7 rounded-md bg-card text-secondary-foreground hover:text-foreground hover:bg-muted border border-border flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {renderNavLinks()}
        </div>

        {renderFooterProfile('mobile')}
      </aside>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card fixed inset-y-0 left-0 z-40 p-3.5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-2 rounded-md bg-primary text-primary-foreground">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground tracking-tight">Tech Ads</span>
              <span className="text-[9.5px] block text-muted-foreground font-semibold leading-none uppercase tracking-[.07em]">ERP & CRM</span>
            </div>
          </div>

          {renderNavLinks()}
        </div>

        {renderFooterProfile('desktop')}
      </aside>
    </>
  );
};
