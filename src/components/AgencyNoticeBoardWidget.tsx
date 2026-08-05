import React, { useState, useEffect } from 'react';
import { Megaphone, Bell, Calendar, User, Settings } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { supabase } from '../services/supabase';
import { getLocalNotices } from '../services/noticeStore';

interface AgencyNoticeBoardWidgetProps {
  isAdmin?: boolean;
  onOpenAdminNoticeModal?: () => void;
}

export const AgencyNoticeBoardWidget: React.FC<AgencyNoticeBoardWidgetProps> = ({
  isAdmin = false,
  onOpenAdminNoticeModal
}) => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    // 1. Instantly load local notices at 0ms delay
    const local = getLocalNotices();
    setNotices(local);
    setLoading(false);

    // 2. Perform background check against Supabase
    try {
      const { data, error } = await supabase
        .from('agency_notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbMapped = data.map((n: any) => ({
          id: n.id,
          title: n.title || n.subject || 'Announcement',
          content: n.content || n.message || n.notice || '',
          created_by: n.created_by,
          author_name: n.author_name || n.author?.full_name || 'Management',
          created_at: n.created_at
        }));

        const merged = [...local];
        dbMapped.forEach((dbItem: any) => {
          if (!merged.some(m => m.id === dbItem.id || (m.title === dbItem.title && m.content === dbItem.content))) {
            merged.push(dbItem);
          }
        });
        setNotices(merged);
      }
    } catch (err: any) {
      console.warn('Background Supabase notice check info:', err);
    }
  };

  useEffect(() => {
    fetchNotices();

    const handleLocalSync = (e?: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setNotices(e.detail);
      } else {
        fetchNotices();
      }
    };

    window.addEventListener('agency_notices_updated', handleLocalSync);
    window.addEventListener('agency_notices_changed', handleLocalSync);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'agency_notices_local_store') {
        fetchNotices();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('agency_notices_updated', handleLocalSync);
      window.removeEventListener('agency_notices_changed', handleLocalSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const formatISTDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Card variant="glass" className="p-5 border-white/5 space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Megaphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              Agency Notice Board
              <Badge variant="warning" className="text-[9px] py-0.2 px-1.5 font-bold">
                {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
              </Badge>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Important announcements & staff updates</p>
          </div>
        </div>

        {isAdmin && onOpenAdminNoticeModal && (
          <button
            onClick={onOpenAdminNoticeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Notices
          </button>
        )}
      </div>

      {/* Notices List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-6 text-slate-500 text-xs font-bold animate-pulse">
            Loading announcements...
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-slate-950/20">
            <Bell className="w-6 h-6 text-slate-600 mx-auto mb-1.5 opacity-60" />
            <p className="text-xs text-slate-400 font-semibold">No active notices published yet.</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Admin updates and announcements will appear here.</p>
          </div>
        ) : (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="p-3.5 rounded-xl bg-slate-950/50 border border-white/5 hover:border-amber-500/20 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-100 text-xs tracking-wide leading-snug">{notice.title}</h4>
                <span className="text-[9px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {formatISTDate(notice.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium pt-1 border-t border-white/5">
                <User className="w-3 h-3 text-indigo-400" />
                <span>Posted by: <strong className="text-slate-200">{notice.author_name || notice.author?.full_name || 'Management'}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
