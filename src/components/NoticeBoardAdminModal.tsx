import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Megaphone } from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../services/supabase';

interface NoticeBoardAdminModalProps {
  onClose: () => void;
  staffId?: string;
}

export const NoticeBoardAdminModal: React.FC<NoticeBoardAdminModalProps> = ({ onClose, staffId }) => {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tutor_notices')
        .select('*, author:staff_profiles(full_name)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setNotices(data || []);
    } catch (err: any) {
      alert('Error fetching notices: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !staffId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.from('tutor_notices').insert({
        title,
        content,
        created_by: staffId
      });
      
      if (error) throw error;
      
      setIsAdding(false);
      setTitle('');
      setContent('');
      fetchNotices();
    } catch (err: any) {
      alert('Failed to save notice: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    
    try {
      const { error } = await supabase.from('tutor_notices').delete().eq('id', id);
      if (error) throw error;
      fetchNotices();
    } catch (err: any) {
      alert('Failed to delete notice: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <Card variant="glass" className="w-full max-w-2xl bg-slate-900 border border-slate-700 relative shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Notice Board Management</h2>
              <p className="text-xs text-slate-400">Broadcast messages to tutors</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="flex justify-end">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              {isAdding ? 'Cancel' : 'Create Notice'}
            </button>
          </div>

          {isAdding && (
            <Card variant="solid" className="p-5 border-indigo-500/30 bg-indigo-500/5">
              <form onSubmit={handleSaveNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Notice Title</label>
                  <input 
                    required 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Schedule Update for April"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Content</label>
                  <textarea 
                    required 
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Enter the notice details here..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-bold">Cancel</button>
                  <button type="submit" disabled={isSaving} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-bold">
                    {isSaving ? 'Publishing...' : 'Publish Notice'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500 animate-pulse">Loading notices...</div>
            ) : notices.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic bg-slate-900/50 rounded-2xl border border-white/5">
                No active notices found.
              </div>
            ) : (
              notices.map(notice => (
                <div key={notice.id} className="p-5 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-white">{notice.title}</h3>
                    <button 
                      onClick={() => handleDelete(notice.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap leading-relaxed">{notice.content}</p>
                  <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                    <span>?</span>
                    <span>By {notice.author?.full_name || 'Admin'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </Card>
    </div>
  );
};
