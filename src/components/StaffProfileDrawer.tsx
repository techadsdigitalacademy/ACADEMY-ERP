import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Card } from './Card';
import { Button } from './Button';
import { X } from 'lucide-react';
import { SalesHistoryLog } from './SalesHistoryLog';
import { EditSaleModal } from './EditSaleModal';

interface StaffProfile {
  id: string;
  full_name: string;
  username: string;
  designation: string;
  gender: string;
  shift_start_time: string;
  shift_end_time: string;
  weekly_off_day: string;
  avatar_url?: string;
  auth_user_id?: string;
  monthly_target_amount?: number;
}

interface StaffProfileDrawerProps {
  profile: StaffProfile | null;
  onClose: () => void;
}

export default function StaffProfileDrawer({ profile, onClose }: StaffProfileDrawerProps) {
  const [profileSales, setProfileSales] = useState<any[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [detailTab, setDetailTab] = useState<'sales' | 'attendance' | 'reports'>('sales');

  const [editingSale, setEditingSale] = useState<any | null>(null);

  useEffect(() => {
    if (profile) {
      if (profile.designation === 'Sales Executive') {
        setDetailTab('sales');
      } else {
        setDetailTab('reports');
      }
      fetchProfileDetails(profile);
    }
  }, [profile]);

  const fetchProfileDetails = async (p: StaffProfile) => {
    try {
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('id')
        .eq('full_name', p.full_name)
        .maybeSingle();

      const targetStaffId = staffRecord ? staffRecord.id : p.id;

      const { data: saleData } = await supabase
        .from('sales')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('created_at', { ascending: false });
      
      const { data: reportData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('staff_id', targetStaffId)
        .order('report_date', { ascending: false });
        
      setProfileSales(saleData || []);
      setProfileReports(reportData || []);
    } catch (err) {
      console.error('Error fetching details', err);
    }
  };

  const getAvatarUrl = (name: string, gender: string) => {
    return `https://avatar.iran.liara.run/public/${gender.toLowerCase() === 'female' ? 'girl' : 'boy'}?username=${encodeURIComponent(name)}`;
  };

  

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <Card variant="solid" className="w-full max-w-2xl p-6 bg-slate-900 border border-slate-800 relative animate-scale-up max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4 items-center border-b border-white/5 pb-4 mb-4">
            <img 
              src={profile.avatar_url || getAvatarUrl(profile.full_name, profile.gender)} 
              alt={profile.full_name} 
              className="w-16 h-16 rounded-3xl object-cover bg-slate-900 border-2 border-slate-800" 
            />
          <div>
            <h3 className="font-bold text-white text-base leading-tight">{profile.full_name}</h3>
            <p className="text-xs text-indigo-400 font-semibold mt-0.5">{profile.designation}</p>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
              <span>Shift: {profile.shift_start_time.substring(0, 5)} - {profile.shift_end_time.substring(0, 5)}</span>
              <span>Off: {profile.weekly_off_day}</span>
            </div>
          </div>
        </div>

        {/* Detailed Sub-tabs selectors */}
        <div className="flex gap-2.5 border-b border-white/5 pb-3.5 mb-4">
          <button
            onClick={() => setDetailTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${detailTab === 'sales' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}
          >
            Sales History Log
          </button>
          <button
            onClick={() => setDetailTab('attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${detailTab === 'attendance' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}
          >
            Attendance
          </button>
          <button
            onClick={() => setDetailTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${detailTab === 'reports' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/5 text-slate-400'}`}
          >
            Daily Reports
          </button>
        </div>

        {/* TAB CONTENT: SALES HISTORY LOG */}
        {detailTab === 'sales' && (
          <div className="space-y-4">
            <SalesHistoryLog 
              sales={profileSales}
              targetAmount={profile.monthly_target_amount || 0}
              isAdmin={true}
              onEdit={(sale) => setEditingSale(sale)}
              onDelete={async (sale) => {
                if (window.confirm(`Are you sure you want to delete sale for "${sale.client_name}" (${sale.work_sl})?`)) {
                  try {
                    const { error } = await supabase.from('sales').delete().eq('id', sale.id);
                    if (error) throw error;
                    fetchProfileDetails(profile);
                  } catch (err: any) {
                    alert('Failed to delete sale: ' + err.message);
                  }
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
                      package_amount: data.package_cost,
                      received_amount: data.amount,
                      balance_amount: Math.max(0, data.package_cost - data.amount)
                    })
                    .eq('id', id);
                  if (error) throw error;
                  setEditingSale(null);
                  fetchProfileDetails(profile);
                }}
              />
            )}
          </div>
        )}

        {detailTab === 'reports' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase">Daily Reports ({profileReports.length})</h4>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20 max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Work Type</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {profileReports.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{r.report_date}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{r.work_type}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">{r.description || '-'}</td>
                    </tr>
                  ))}
                  {profileReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-slate-500 font-bold">No daily reports recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 pt-2 border-t border-slate-800">
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={onClose}
          >
            Close Profile Drawer
          </Button>
        </div>
      </Card>
    </div>
  );
}
