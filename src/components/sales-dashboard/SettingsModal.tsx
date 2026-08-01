import React from 'react';
import { Card } from '../Card';
import { Button } from '../Button';
import { X, Star } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminMode: boolean;
  staffProfiles: any[];
  selectedResetStaff: string;
  setSelectedResetStaff: (val: string) => void;
  newResetPassword: string;
  setNewResetPassword: (val: string) => void;
  isResettingPassword: boolean;
  handleResetPassword: (e: React.FormEvent) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isAdminMode,
  staffProfiles,
  selectedResetStaff,
  setSelectedResetStaff,
  newResetPassword,
  setNewResetPassword,
  isResettingPassword,
  handleResetPassword
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
        <button 
          onClick={onClose}
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
          <Button variant="secondary" fullWidth onClick={onClose}>Close Panel</Button>
        </div>
      </Card>
    </div>
  );
};
