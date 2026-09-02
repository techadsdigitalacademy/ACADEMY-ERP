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
  Star,
  Copy,
  Check,
  Building2,
  Sparkles,
  Box,
  FileText,
  Film,
  Play,
  Pencil,
  Trash2
} from 'lucide-react';

interface MarketingAsset {
  id: string;
  title: string;
  company_name?: string;
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

const ALL_CATEGORIES = [
  'All',
  'SMM Videos',
  'Anchor/Script',
  'Animation & 3D',
  'Ai videos',
  'Posters & Branding',
  'Logo Design',
  'Brochures',
  'Packaging & Product Designs (Boxes/Bottles)'
];

const VIDEOGRAPHER_CATEGORIES = [
  'SMM Videos',
  'Anchor/Script',
  'Animation & 3D',
  'Ai videos'
];

const DESIGNER_CATEGORIES = [
  'Posters & Branding',
  'Logo Design',
  'Brochures',
  'Packaging & Product Designs (Boxes/Bottles)'
];

export const AssetLibrary: React.FC = () => {
  const { activeStaff, isAdminMode } = useApp();

  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form State
  const [assetTitle, setAssetTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetCategory, setAssetCategory] = useState('SMM Videos');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().split('T')[0]);
  const [driveLink, setDriveLink] = useState('');

  // Edit Modal State
  const [editingAsset, setEditingAsset] = useState<MarketingAsset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('SMM Videos');
  const [editDate, setEditDate] = useState('');
  const [editDriveLink, setEditDriveLink] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const userDesignation = activeStaff?.designation || '';
  const isVideographer = userDesignation === 'Videographer';
  const isDesigner = userDesignation === 'Graphic Designer';
  const isAdminOrOwner = isAdminMode || userDesignation === 'Company Owner' || userDesignation === 'Admin';

  const canUpload = isAdminOrOwner || isVideographer || isDesigner;

  const allowedUploadCategories = isAdminOrOwner 
    ? ALL_CATEGORIES.filter(c => c !== 'All')
    : isVideographer 
    ? VIDEOGRAPHER_CATEGORIES
    : isDesigner 
    ? DESIGNER_CATEGORIES
    : ALL_CATEGORIES.filter(c => c !== 'All');

  const canManageAsset = (asset: MarketingAsset) => {
    if (isAdminOrOwner) return true;
    if (activeStaff && asset.staff_id === activeStaff.id) return true;
    return false;
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (allowedUploadCategories.length > 0 && !allowedUploadCategories.includes(assetCategory)) {
      setAssetCategory(allowedUploadCategories[0]);
    }
  }, [userDesignation, isAdding]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_assets')
        .select('*, staff:staff_id(full_name)')
        .order('asset_date', { ascending: false });

      if (error) {
        console.warn('Primary asset fetch warning, attempting fallback:', error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('marketing_assets')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          console.warn('Fallback asset fetch warning:', fallbackError);
          setAssets([]);
          setDbError(fallbackError.message);
        } else {
          setAssets(fallbackData || []);
        }
      } else {
        setAssets(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setAssets([]);
      setDbError(err?.message || 'Error loading assets');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayCompany = (asset: MarketingAsset): string => {
    if (asset.company_name?.trim()) return asset.company_name.trim();
    if (asset.description) {
      const match = asset.description.match(/\[Company:\s*(.*?)\]/i);
      if (match && match[1]) return match[1].trim();
    }
    return '';
  };

  const getCleanDescription = (asset: MarketingAsset): string => {
    if (!asset.description) return '';
    return asset.description.replace(/\[Company:\s*.*?\]\n?/i, '').trim();
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setIsSubmitting(true);
    try {
      const cleanCompany = companyName.trim();
      const finalDescription = assetDescription.trim();

      const payload: any = {
        title: assetTitle.trim(),
        category: assetCategory,
        asset_date: assetDate,
        drive_link: driveLink.trim(),
        staff_id: activeStaff.id,
        company_name: cleanCompany || null,
        description: cleanCompany ? `[Company: ${cleanCompany}]\n${finalDescription}` : finalDescription
      };

      const { error } = await supabase.from('marketing_assets').insert(payload);
      
      if (error) {
        // Fallback without explicit company_name if column doesn't exist in Supabase DB
        delete payload.company_name;
        const { error: fallbackErr } = await supabase.from('marketing_assets').insert(payload);
        if (fallbackErr) throw fallbackErr;
      }
      
      setIsAdding(false);
      setAssetTitle('');
      setCompanyName('');
      setAssetDescription('');
      setDriveLink('');
      await fetchAssets();
    } catch (err: any) {
      alert("Error adding asset: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (asset: MarketingAsset) => {
    setEditingAsset(asset);
    setEditTitle(asset.title || '');
    setEditCompanyName(getDisplayCompany(asset));
    setEditCategory(asset.category || 'SMM Videos');
    setEditDate(asset.asset_date ? asset.asset_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditDriveLink(asset.drive_link || '');
    setEditDescription(getCleanDescription(asset));
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setIsUpdating(true);
    try {
      const cleanCompany = editCompanyName.trim();
      const finalDescription = editDescription.trim();

      const payload: any = {
        title: editTitle.trim(),
        category: editCategory,
        asset_date: editDate,
        drive_link: editDriveLink.trim(),
        company_name: cleanCompany || null,
        description: cleanCompany ? `[Company: ${cleanCompany}]\n${finalDescription}` : finalDescription
      };

      const { error } = await supabase
        .from('marketing_assets')
        .update(payload)
        .eq('id', editingAsset.id);

      if (error) {
        delete payload.company_name;
        const { error: fallbackErr } = await supabase
          .from('marketing_assets')
          .update(payload)
          .eq('id', editingAsset.id);
        if (fallbackErr) throw fallbackErr;
      }

      setEditingAsset(null);
      await fetchAssets();
    } catch (err: any) {
      alert("Error updating asset: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAsset = async (asset: MarketingAsset) => {
    if (!canManageAsset(asset)) {
      alert("You do not have permission to delete this asset.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${asset.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('marketing_assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;
      await fetchAssets();
    } catch (err: any) {
      alert("Error deleting asset: " + err.message);
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesCategory = activeCategory === 'All' || a.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const companyTag = getDisplayCompany(a).toLowerCase();
    const cleanDesc = getCleanDescription(a).toLowerCase();

    const matchesSearch = 
      a.title.toLowerCase().includes(q) || 
      companyTag.includes(q) ||
      (a.company_name || '').toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      cleanDesc.includes(q) ||
      (a.staff?.full_name || '').toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SMM Videos':
      case 'SMM Video': 
        return <Video className="w-4 h-4 text-primary" />;
      case 'Anchor/Script':
      case 'Anchor Video':
      case 'Anchor Reel Video':
      case 'Script Reel Video': 
        return <Film className="w-4 h-4 text-primary" />;
      case 'Animation & 3D': 
        return <Play className="w-4 h-4 text-primary" />;
      case 'Ai videos':
      case 'AI Video':
      case 'AI Animations': 
        return <Sparkles className="w-4 h-4 text-warning" />;
      case 'Posters & Branding':
      case 'Poster':
      case 'Cover Photos': 
        return <ImageIcon className="w-4 h-4 text-primary" />;
      case 'Logo Design':
      case 'Logo Work': 
        return <Star className="w-4 h-4 text-yellow-400" />;
      case 'Brochures':
      case 'Catalog':
      case 'Magazine': 
        return <FileText className="w-4 h-4 text-success" />;
      case 'Packaging & Product Designs (Boxes/Bottles)': 
        return <Box className="w-4 h-4 text-primary" />;
      default: 
        return <Layout className="w-4 h-4 text-primary" />;
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-card text-foreground font-sans flex flex-col lg:flex-row relative w-full max-w-full overflow-x-hidden">

      <Sidebar />

      <main className="flex-1 p-4 md:p-8 ml-0 lg:ml-64 transition-all duration-300 z-10 min-h-screen flex flex-col pt-18 lg:pt-8 pb-32 md:pb-12 relative">
        <div className="max-w-7xl mx-auto w-full flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-fade-in">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <FolderOpen className="w-3.5 h-3.5" />
                Asset Library
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                Marketing <span className="text-transparent bg-clip-text">Hub</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                Browse, search, and access marketing materials, videos, designs, and Google Drive links.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {canUpload ? (
                <Button 
                  onClick={() => setIsAdding(true)}
                  className="bg-primary hover:bg-primary text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Asset</span>
                </Button>
              ) : (
                <div className="px-3 py-1.5 rounded-lg bg-card/80 border border-border text-xs font-semibold text-muted-foreground">
                  Read-Only Mode
                </div>
              )}
            </div>
          </div>

          {/* Search & Categories Bar */}
          <Card variant="glass" className="mb-6 p-4 border-border animate-fade-in-up space-y-4">
            {/* Real-time Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
              <input 
                type="text" 
                placeholder="Search by company name, asset title, category, or keyword..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card/80 border border-primary rounded-md pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-[var(--ring)] transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
 activeCategory === cat 
 ? 'bg-primary text-foreground ring-1 ring-[var(--ring)]' 
 : 'bg-muted-2 text-muted-foreground hover:text-white hover:bg-muted border border-border'
 }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Card>

          {/* Asset Data Table Container */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : dbError ? (
            <div className="bg-danger-soft border border-danger/20 rounded-md p-6 text-center text-danger">
              {dbError}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-20 bg-muted-2 rounded-lg border border-border border-dashed">
              <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">No marketing assets found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery ? `No assets matching "${searchQuery}". Try clearing your search filters.` : 'Upload videos, graphics, or branding materials to populate the hub.'}
              </p>
            </div>
          ) : (
            <Card variant="glass" className="border-border p-0 overflow-hidden shadow-2xl animate-fade-in-up">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-card/80 border-b border-border text-[11px] font-black text-muted-foreground uppercase tracking-wider">
                      <th className="py-4 px-5">Company / Client</th>
                      <th className="py-4 px-5">Asset Title & Category</th>
                      <th className="py-4 px-5 max-w-xs">Description / Specs</th>
                      <th className="py-4 px-5">Uploaded By & Date</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {filteredAssets.map((asset) => {
                      const companyTag = getDisplayCompany(asset);
                      const cleanDesc = getCleanDescription(asset);
                      const userCanManage = canManageAsset(asset);

                      return (
                        <tr key={asset.id} className="hover:bg-primary-soft transition-colors group">
                          {/* Company Name */}
                          <td className="py-4 px-5 align-top">
                            {companyTag ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-soft border border-primary/20 text-primary text-xs font-extrabold whitespace-nowrap">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{companyTag}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">General / Unspecified</span>
                            )}
                          </td>

                          {/* Title & Category */}
                          <td className="py-4 px-5 align-top">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-md bg-card border border-border shrink-0 mt-0.5">
                                {getCategoryIcon(asset.category)}
                              </div>
                              <div>
                                <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors leading-snug">
                                  {asset.title}
                                </h4>
                                <span className="inline-block text-[10px] text-primary font-extrabold uppercase tracking-wider mt-1 px-2 py-0.5 rounded bg-primary-soft border border-primary/20">
                                  {asset.category}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="py-4 px-5 align-top max-w-xs">
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {cleanDesc || <span className="italic text-muted-foreground">No notes provided</span>}
                            </p>
                          </td>

                          {/* Uploaded By & Date */}
                          <td className="py-4 px-5 align-top whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-foreground">{asset.staff?.full_name || 'Team Member'}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold">{new Date(asset.asset_date).toLocaleDateString()}</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCopyLink(asset.drive_link, asset.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted text-secondary-foreground hover:text-white text-xs font-bold transition-all border border-border flex items-center gap-1"
                                title="Copy Drive Link"
                              >
                                {copiedId === asset.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-success" />
                                    <span className="text-success text-[11px]">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Copy</span>
                                  </>
                                )}
                              </button>

                              <a 
                                href={asset.drive_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-primary-soft hover:bg-primary-soft text-primary border border-primary/30 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                title="Open Google Drive Link"
                              >
                                <span className="text-[11px]">Drive</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              {userCanManage && (
                                <button
                                  onClick={() => handleOpenEdit(asset)}
                                  className="p-1.5 rounded-lg bg-warning-soft hover:bg-warning-soft text-warning border border-warning/20 transition-colors"
                                  title="Edit Asset"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {userCanManage && (
                                <button
                                  onClick={() => handleDeleteAsset(asset)}
                                  className="p-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger border border-danger/20 transition-colors"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Upload Asset Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in p-4">
          <Card variant="glass" className="w-full max-w-md border-border p-6 animate-scale-up relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Upload Asset Link</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Role: <span className="text-primary font-bold">{userDesignation || 'Admin'}</span>
                </p>
              </div>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-card rounded-lg text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Asset Title</label>
                <input 
                  type="text" 
                  required
                  value={assetTitle}
                  onChange={e => setAssetTitle(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. SMM Reel Promo Q3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Company / Client Name</label>
                <input 
                  type="text" 
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  placeholder="e.g. TechAds, Apex Real Estate, ABC Brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={assetCategory}
                  onChange={e => setAssetCategory(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  {allowedUploadCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
                <input 
                  type="date" 
                  required
                  value={assetDate}
                  onChange={e => setAssetDate(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Google Drive File / Folder Link</label>
                <input 
                  type="url" 
                  required
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Description / Notes</label>
                <textarea 
                  value={assetDescription}
                  onChange={e => setAssetDescription(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[70px]"
                  placeholder="Notes on resolution, variations, specs..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} className="flex-1 bg-primary hover:bg-primary">
                  Save Asset
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in p-4">
          <Card variant="glass" className="w-full max-w-md border-border p-6 animate-scale-up relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Edit Asset</h3>
                <p className="text-xs text-muted-foreground mt-1">Update asset information & Google Drive link</p>
              </div>
              <button onClick={() => setEditingAsset(null)} className="p-2 bg-card rounded-lg text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Asset Title</label>
                <input 
                  type="text" 
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Company / Client Name</label>
                <input 
                  type="text" 
                  required
                  value={editCompanyName}
                  onChange={e => setEditCompanyName(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  {ALL_CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
                <input 
                  type="date" 
                  required
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Google Drive Link</label>
                <input 
                  type="url" 
                  required
                  value={editDriveLink}
                  onChange={e => setEditDriveLink(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Description / Notes</label>
                <textarea 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full bg-muted-2 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 min-h-[70px]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="button" variant="secondary" onClick={() => setEditingAsset(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isUpdating} className="flex-1 bg-primary hover:bg-primary">
                  Update Asset
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
