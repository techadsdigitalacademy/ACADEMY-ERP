import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../services/supabase';

export const TutorNoticeBoard: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('tutor_notices')
        .select('*, author:staff_profiles(full_name)')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setNotices(data);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
          <Megaphone className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-white">Notice Board</h3>
      </div>
      
      {isLoading ? (
        <Card variant="glass" className="p-6 border-white/5 animate-pulse">
          <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-slate-800 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </Card>
      ) : notices.length === 0 ? (
        <Card variant="glass" className="p-6 border-white/5 bg-slate-900/50">
          <p className="text-slate-400 text-sm text-center italic">No new notices at this time.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map(notice => (
            <Card key={notice.id} variant="glass" className="p-5 border-l-4 border-l-indigo-500 border-white/5 hover:bg-slate-800/50 transition-colors">
              <h4 className="font-bold text-white mb-2">{notice.title}</h4>
              <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                <span>By {notice.author?.full_name || 'Admin'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
