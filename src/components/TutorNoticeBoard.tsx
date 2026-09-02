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
        <div className="p-2 bg-primary-soft rounded-lg text-primary">
          <Megaphone className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Notice Board</h3>
      </div>
      
      {isLoading ? (
        <Card variant="glass" className="p-6 border-border animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </Card>
      ) : notices.length === 0 ? (
        <Card variant="glass" className="p-6 border-border bg-muted-2">
          <p className="text-muted-foreground text-sm text-center italic">No new notices at this time.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map(notice => (
            <Card key={notice.id} variant="glass" className="p-5 border-l-4 border-l-indigo-500 border-border hover:bg-muted transition-colors">
              <h4 className="font-bold text-foreground mb-2">{notice.title}</h4>
              <p className="text-sm text-secondary-foreground mb-4 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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
