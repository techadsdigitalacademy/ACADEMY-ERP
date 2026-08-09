import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sidebar } from '../components/Sidebar';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import { 
  AlertCircle, 
  Search, 
  Plus, 
  X,
  Trash2,
  Calendar,
  Star,
  Download,
  FileText
} from 'lucide-react';

interface PartnerWithdrawal {
  id: string;
  partner_name: string;
  amount: number;
  withdrawal_date: string;
  description: string;
  created_at: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const PartnerWithdrawals: React.FC = () => {
  const { activeStaff, isAdminMode } = useApp();

  // State
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Modal state
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [partnerName, setPartnerName] = useState('SHIBILI');
  const [witAmount, setWitAmount] = useState('');
  const [witDate, setWitDate] = useState(new Date().toISOString().split('T')[0]);
  const [witDescription, setWitDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeStaff) return null;

  const isOwner = activeStaff.full_name === 'SHIBILI' || activeStaff.full_name === 'ASHIF' || activeStaff.designation?.toLowerCase().includes('owner');
  const isAdminView = isAdminMode && !isOwner;
  
  
  // Default the partner name to the current active staff if they are MD
  useEffect(() => {
    if (activeStaff.full_name?.toUpperCase().includes('SHIBILI')) {
      setPartnerName('SHIBILI');
    } else if (activeStaff.full_name?.toUpperCase().includes('ASHIF')) {
      setPartnerName('ASHIF');
    }
  }, [activeStaff]);

  const loadWithdrawals = async () => {
    setLoading(true);
    setDbError(null);
    try {
      let query = supabase.from('partner_withdrawals').select('*').order('withdrawal_date', { ascending: false });
      
      // If not admin, restrict view to only their own withdrawals
        if (!isAdminView) {
        if (activeStaff.full_name?.toUpperCase().includes('SHIBILI')) {
          query = query.eq('partner_name', 'SHIBILI');
        } else if (activeStaff.full_name?.toUpperCase().includes('ASHIF')) {
          query = query.eq('partner_name', 'ASHIF');
        } else {
          // Normal staff shouldn't be here, but just in case, return nothing
          query = query.eq('partner_name', 'NONE');
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setWithdrawals(data || []);
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setDbError(err.message || 'Failed to fetch withdrawals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [activeStaff, isOwner]);

  const handleExportExcel = () => {
    try {
      const csvRows: any[][] = [];

      csvRows.push([`Tech Ads ERP - Partner Withdrawals Ledger Report`]);
      csvRows.push([`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, `Total Items: ${filteredWithdrawals.length}`, `Total Withdrawn: ₹${totalWithdrawn.toLocaleString()}`]);
      csvRows.push([]);
      csvRows.push(['Date', 'Partner', 'Description', 'Amount (₹)']);

      filteredWithdrawals.forEach(w => {
        csvRows.push([
          w.withdrawal_date || '-',
          w.partner_name || '-',
          w.description || '-',
          Number(w.amount || 0)
        ]);
      });

      csvRows.push([]);
      csvRows.push(['Total Withdrawn Summary', '', '', totalWithdrawn]);

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Partner_Withdrawals_Ledger_${new Date().toISOString().substring(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export Partner Withdrawals to Excel: ' + err.message);
    }
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const rowsHtml = filteredWithdrawals.map(w => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; color: #475569;">${w.withdrawal_date || '-'}</td>
          <td style="padding: 8px; font-weight: bold; color: #9333ea;">${w.partner_name || '-'}</td>
          <td style="padding: 8px;">${w.description || '-'}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold; color: #9333ea;">₹${Number(w.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('');

      const shibiliTotal = withdrawals.filter(w => w.partner_name === 'SHIBILI').reduce((sum, w) => sum + Number(w.amount || 0), 0);
      const ashifTotal = withdrawals.filter(w => w.partner_name === 'ASHIF').reduce((sum, w) => sum + Number(w.amount || 0), 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Partner Withdrawals Ledger Report</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
              .metrics { display: flex; gap: 12px; margin-bottom: 20px; background: #faf5ff; padding: 12px; border-radius: 8px; border: 1px solid #e9d5ff; }
              .metric-item { flex: 1; }
              .metric-label { font-size: 10px; font-weight: 700; color: #7e22ce; text-transform: uppercase; }
              .metric-val { font-size: 16px; font-weight: 800; color: #9333ea; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
              th.right { text-align: right; }
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Partner Withdrawals Ledger Report</h1>
            <p>Generated: <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong> &bull; Total Items: <strong>${filteredWithdrawals.length}</strong></p>

            <div class="metrics">
              <div class="metric-item">
                <div class="metric-label">Total Withdrawn</div>
                <div class="metric-val">₹${totalWithdrawn.toLocaleString()}</div>
              </div>
              ${isAdminView ? `
                <div class="metric-item">
                  <div class="metric-label">SHIBILI Withdrawn</div>
                  <div class="metric-val" style="color: #6b21a8;">₹${shibiliTotal.toLocaleString()}</div>
                </div>
                <div class="metric-item">
                  <div class="metric-label">ASHIF Withdrawn</div>
                  <div class="metric-val" style="color: #4338ca;">₹${ashifTotal.toLocaleString()}</div>
                </div>
              ` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Partner</th>
                  <th>Description</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #94a3b8;">No withdrawal records found.</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="font-weight: bold; border-top: 2px solid #cbd5e1;">
                  <td colspan="3" style="padding: 10px; text-align: right; text-transform: uppercase;">Total Withdrawn:</td>
                  <td style="padding: 10px; text-align: right; color: #9333ea; font-size: 13px;">₹${totalWithdrawn.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      alert('Failed to export Partner Withdrawals to PDF: ' + err.message);
    }
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!witAmount || !witDate) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('partner_withdrawals')
        .insert({
          partner_name: partnerName,
          amount: Number(witAmount),
          withdrawal_date: witDate,
          description: witDescription.trim() || null
        });

      if (error) throw error;

      // Reset
      setWitAmount('');
      setWitDescription('');
      setWitDate(new Date().toISOString().split('T')[0]);
      setIsAdding(false);

      alert('Withdrawal logged successfully!');
      await loadWithdrawals();
    } catch (err: any) {
      alert('Failed to log withdrawal: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWithdrawal = async (id: string, partner: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete ${partner}'s withdrawal of ${formatCurrency(amount)}?`)) return;

    try {
      const { error } = await supabase
        .from('partner_withdrawals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadWithdrawals();
    } catch (err: any) {
      alert('Failed to delete withdrawal: ' + err.message);
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => 
    w.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalWithdrawn = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="min-h-screen bg-[#020817] text-slate-200 font-sans flex flex-col lg:flex-row relative w-full overflow-x-clip selection:bg-indigo-500/30">
      {/* Global Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-14 lg:pt-0 pb-24 md:pb-8">
        {/* Header */}
        <header className="flex-shrink-0 px-4 md:px-8 py-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-14 lg:top-0 z-20 flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Star className="w-6 h-6 text-purple-400" />
              Partner Withdrawals
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">Manage and review MD profit withdrawals.</p>
          </div>
          {!isOwner && (
            <Button 
              onClick={() => setIsAdding(true)} 
              variant="primary" 
              className="flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Log Withdrawal
            </Button>
          )}
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {dbError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center gap-3 text-rose-450 text-xs">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold">Database Error:</span> {dbError}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="glass" className="p-5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Withdrawn</span>
                <p className="text-2xl font-black text-purple-400 mt-2">{formatCurrency(totalWithdrawn)}</p>
              </Card>

              {isAdminView && (
                <>
                  <Card variant="glass" className="p-5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SHIBILI's Withdrawals</span>
                    <p className="text-xl font-bold text-slate-200 mt-2">
                      {formatCurrency(withdrawals.filter(w => w.partner_name === 'SHIBILI').reduce((sum, w) => sum + w.amount, 0))}
                    </p>
                  </Card>
                  <Card variant="glass" className="p-5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ASHIF's Withdrawals</span>
                    <p className="text-xl font-bold text-slate-200 mt-2">
                      {formatCurrency(withdrawals.filter(w => w.partner_name === 'ASHIF').reduce((sum, w) => sum + w.amount, 0))}
                    </p>
                  </Card>
                </>
              )}
            </div>

            {/* Ledger Table */}
            <Card variant="glass" className="border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Withdrawal Ledger
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap"
                      title="Export Withdrawal Ledger to Excel / CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Excel</span>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer shadow-sm whitespace-nowrap"
                      title="Export Withdrawal Ledger to PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search by name or description..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-64 pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-wider">Loading withdrawals...</div>
                ) : filteredWithdrawals.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm font-bold uppercase tracking-wider">No withdrawals found.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Partner</th>
                        <th className="py-3 px-5">Description</th>
                        <th className="py-3 px-5 text-right">Amount</th>
                        {!isOwner && <th className="py-3 px-5 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredWithdrawals.map(w => (
                        <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-5 text-slate-400 font-medium whitespace-nowrap">{w.withdrawal_date}</td>
                          <td className="py-3 px-5">
                            <Badge variant={w.partner_name === 'SHIBILI' ? 'purple' : 'indigo'} className="text-[10px] py-1">
                              {w.partner_name}
                            </Badge>
                          </td>
                          <td className="py-3 px-5 text-slate-300 font-medium max-w-xs truncate" title={w.description}>
                            {w.description || 'N/A'}
                          </td>
                          <td className="py-3 px-5 text-right font-black text-purple-400">
                            {formatCurrency(w.amount)}
                          </td>
                          {!isOwner && (
                            <td className="py-3 px-5 text-center">
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id, w.partner_name, w.amount)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 transition-all"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* ADD WITHDRAWAL MODAL */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setIsAdding(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
              Log Partner Withdrawal
            </h3>

            <form onSubmit={handleAddWithdrawal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Partner Name</label>
                <select
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  disabled={isOwner}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="SHIBILI">SHIBILI</option>
                  <option value="ASHIF">ASHIF</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  placeholder="e.g. 25000"
                  value={witAmount}
                  onChange={(e) => setWitAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Date</label>
                <input 
                  type="date" 
                  required
                  value={witDate}
                  onChange={(e) => setWitDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Monthly withdrawal"
                  value={witDescription}
                  onChange={(e) => setWitDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
                  {isSubmitting ? 'Logging...' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
