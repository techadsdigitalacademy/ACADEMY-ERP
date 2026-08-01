import React, { useState } from 'react';
import { Star } from 'lucide-react';
import StaffProfileDrawer from '../StaffProfileDrawer';

interface StaffHistoryTabProps {
  staffProfiles: any[];
}

export const StaffHistoryTab: React.FC<StaffHistoryTabProps> = ({ staffProfiles }) => {
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [profileDetailTab, setProfileDetailTab] = useState<'sales' | 'attendance' | 'daily_reports' | 'leads'>('sales');

  const salesTeam = staffProfiles?.filter(p => p.designation === 'Sales Executive');
  const creativeTeam = staffProfiles?.filter(p => p.designation !== 'Sales Executive');

  return (
    <section className="space-y-6 pt-2 animate-fade-in max-w-7xl mx-auto">
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
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-indigo-500/30">
            Sales & Field Operations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesTeam?.map(member => (
              <div 
                key={member.id}
                onClick={() => { setSelectedProfile(member); setProfileDetailTab('sales'); }}
                className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-indigo-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-center hover:bg-slate-900/60 group"
              >
                <img 
                  src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                  alt="" 
                  className="w-12 h-12 rounded-full border border-white/10 group-hover:scale-105 transition-transform"
                />
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{member.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{member.designation}</p>
                </div>
              </div>
            ))}
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
                  onClick={() => { setSelectedProfile(member); setProfileDetailTab('daily_reports'); }}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-white/5 hover:border-emerald-500/20 transition-all duration-300 cursor-pointer flex gap-3.5 items-center hover:bg-slate-900/60 group"
                >
                  <img 
                    src={member.avatar_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(member.full_name)}`} 
                    alt="" 
                    className="w-12 h-12 rounded-full border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{member.full_name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{member.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {selectedProfile && (
        <StaffProfileDrawer 
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </section>
  );
};
