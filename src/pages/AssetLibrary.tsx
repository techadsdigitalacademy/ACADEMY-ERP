import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import { 
  FolderOpen, 
  Search, 
  Plus, 
  X,
  ExternalLink,
  Video,
  Image as ImageIcon,
  Layout,
  Star
} from 'lucide-react';

interface MarketingAsset {
  id: string;
  title: string;
  category: string;
  asset_date: string;
  drive_link: string;
  staff_id: string;
  description?: string;
  created_at: string;
  staff?: {
    full_name: string;
  };
}

export const AssetLibrary: React.FC = () => {
  const { activeStaff, isAdminMode } = useApp();

  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [assetTitle, setAssetTitle] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetCategory, setAssetCategory] = useState('Anchor Video');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().split('T')[0]);
  const [driveLink, setDriveLink] = useState('');

  const canUpload = isAdminMode || ['Videographer', 'Graphic Designer', 'Company Owner'].includes(activeStaff?.designation || '');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*, staff:staff_id(full_name)')
        .order('asset_date', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('marketing_assets').insert({
        title: assetTitle,
        category: assetCategory,
        asset_date: assetDate,
        drive_link: driveLink,
        staff_id: activeStaff.id,
        description: assetDescription
      });
      if (error) throw error;
      
      setIsAdding(false);
      setAssetTitle('');
      setAssetDescription('');
      setDriveLink('');
      await fetchAssets();
    } catch (err: any) {
      alert("Error adding asset: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesCategory = activeCategory === 'All' || a.category === activeCategory;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (a.staff?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SMM Video': return <Video className="w-4 h-4 text-pink-400" />;
      case 'Logo Design': return <Star className="w-4 h-4 text-amber-400" />;
      case 'Real Estate Ad': return <Layout className="w-4 h-4 text-emerald-400" />;
      default: return <ImageIcon className="w-4 h-4 text-indigo-400" />;
    }
  };

  const categories = ['All', 'Anchor Video', 'Anchor Reel Video', 'Script Reel Video', 'AI Video', 'AI Animations', 'Poster', 'Logo Work', 'Catalog', 'Cover Photos', 'Magazine', 'Notice', 'Others'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex relative overflow-x-hidden">
      {/* Background Lighting Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/15 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-pink-900/10 blur-[130px] pointer-events-none"></div>

      <Sidebar />

      <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 lg:ml-72 transition-all duration-300 z-10 min-h-screen flex flex-col relative">
        <div className="max-w-7xl mx-auto w-full flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
                <FolderOpen className="w-3.5 h-3.5" />
                Asset Library
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Marketing <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Hub</span>
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">
                Browse and download marketing materials, videos, and graphics.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {canUpload && (
                <Button 
                  onClick={() => setIsAdding(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Asset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Controls */}
          <Card variant="glass" className="mb-6 p-4 border-white/5 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      activeCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                        : 'bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>
          </Card>

          {/* Asset Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : dbError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center text-red-400">
              {dbError}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-white/5 border-dashed">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No assets found</h3>
              <p className="text-sm text-slate-400">Upload marketing materials to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => (
                <Card 
                  key={asset.id} 
                  variant="glass" 
                  className="border-white/5 p-5 flex flex-col hover:border-indigo-500/30 transition-all duration-300 group animate-fade-in-up"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
                        {getCategoryIcon(asset.category)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors">{asset.title}</h3>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-1">{asset.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  
                  <div className="flex-1 mt-2 text-sm text-slate-400 line-clamp-3">
                    {asset.description || <span className="italic opacity-50">No description provided</span>}
                  </div>

                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Uploaded By</span>
                      <span className="text-xs text-slate-300">{asset.staff?.full_name || 'Unknown'}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{new Date(asset.asset_date).toLocaleDateString()}</span>
                    </div>
                    <a 
                      href={asset.drive_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
                    >
                      <span>Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Asset Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <Card variant="glass" className="w-full max-w-md border-white/10 p-6 animate-scale-up relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Upload Asset</h3>
                <p className="text-xs text-slate-400 mt-1">Add a new link to the Marketing Hub</p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Asset Title</label>
                <input 
                  type="text" 
                  required
                  value={assetTitle}
                  onChange={e => setAssetTitle(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  placeholder="e.g. Real Estate Promo Q3"
                />
              </div>
              
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description (Company/Client)</label>
                <textarea 
                  value={assetDescription}
                  onChange={e => setAssetDescription(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
                  placeholder="Which company or client is this for?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={assetCategory}
                  onChange={e => setAssetCategory(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {categories.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date</label>
                <input 
                  type="date" 
                  required
                  value={assetDate}
                  onChange={e => setAssetDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Google Drive Link</label>
                <input 
                  type="url" 
                  required
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-500">
                  Save Asset
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
