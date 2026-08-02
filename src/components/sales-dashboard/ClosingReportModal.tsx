import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Card } from '../Card';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { X, Download, Eye } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface ClosingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClosingReportModal: React.FC<ClosingReportModalProps> = ({ isOpen, onClose }) => {
  const [todaySummary, setTodaySummary] = useState({
    agencySalesAmount: 0,
    agencySalesCount: 0,
    academyFeesAmount: 0,
    academyFeesCount: 0,
    loading: false
  });

  const [todaySalesLogs, setTodaySalesLogs] = useState<any[]>([]);
  const [showTodayTransactions, setShowTodayTransactions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTodayClosingData = async () => {
      setTodaySummary(prev => ({ ...prev, loading: true }));
      try {
        const localTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // 1. Fetch today's agency sales with staff details
        const { data: salesData, error: salesErr } = await supabase
          .from('sales')
          .select('*, staff:staff_id(full_name)')
          .order('created_at', { ascending: false })
          .limit(300);

        let agencySalesAmount = 0;
        let agencySalesCount = 0;
        let todaySales: any[] = [];

        if (!salesErr && salesData) {
          todaySales = salesData.filter(s => {
            if (!s.created_at) return false;
            const saleLocalDate = new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return saleLocalDate === localTodayStr;
          });

          agencySalesCount = todaySales.length;
          agencySalesAmount = todaySales.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
        }

        setTodaySalesLogs(todaySales);

        // 2. Fetch today's academy payments
        const { data: feesData, error: feesErr } = await supabase
          .from('academy_installments')
          .select('amount_paid, created_at')
          .order('created_at', { ascending: false })
          .limit(300);

        let academyFeesAmount = 0;
        let academyFeesCount = 0;

        if (!feesErr && feesData) {
          const todayFees = feesData.filter(f => {
            if (!f.created_at) return false;
            const feeLocalDate = new Date(f.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return feeLocalDate === localTodayStr;
          });

          academyFeesCount = todayFees.length;
          academyFeesAmount = todayFees.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
        }

        setTodaySummary({
          agencySalesAmount,
          agencySalesCount,
          academyFeesAmount,
          academyFeesCount,
          loading: false
        });
      } catch (err) {
        console.error('Failed to fetch today closing data:', err);
        setTodaySummary(prev => ({ ...prev, loading: false }));
      }
    };

    fetchTodayClosingData();
  }, [isOpen]);

  const formatToISTDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      const datePart = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const timePart = dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart} ${timePart}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleDownloadAgencyReport = async () => {
    try {
      const localTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const { data: salesData, error } = await supabase
        .from('sales')
        .select('*, staff:staff_id(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const headers = [
        'Today Entry',
        'Staff / Sales Executive',
        'Client Name',
        'Service Package',
        'Payment Type',
        'Package Amount',
        'Received Amount',
        'Payment Method',
        'UTR / Transaction ID',
        'Month',
        'Logged Date (IST)',
        'Logged Time (IST)'
      ];

      const rows = (salesData || []).map(s => {
        const saleLocalDate = s.created_at ? new Date(s.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
        const isToday = saleLocalDate === localTodayStr;
        const staffName = s.staff?.full_name || s.staff_name || 'Safwana';

        // Extract UTR / Transaction ID from fields or parse from work_description tag
        let utrNum = s.utr_number || s.utr || s.transaction_id || s.payment_ref;
        if (!utrNum && s.work_description) {
          const match = s.work_description.match(/(?:Txn Ref|UTR|Txn ID):\s*([^\s)]+)/i);
          if (match) utrNum = match[1];
        }
        utrNum = utrNum || '-';

        const dateObj = s.created_at ? new Date(s.created_at) : null;
        const dateIST = dateObj ? dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
        const timeIST = dateObj ? dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

        return [
          isToday ? '⭐️ TODAY' : '-',
          staffName,
          s.client_name,
          s.service_package,
          s.payment_type,
          s.payment_type === 'Clearance' ? '-' : s.package_amount,
          s.received_amount,
          s.payment_method || 'UPI',
          utrNum,
          s.sale_month,
          dateIST,
          timeIST
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val ?? ''}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Master_Agency_Sales_Report_${localTodayStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message);
    }
  };

  const handleDownloadAcademyReport = async () => {
    try {
      const localTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const { data: payData, error } = await supabase
        .from('academy_installments')
        .select('student_id, amount_paid, payment_date, payment_method, transaction_slip_url, notes, created_at, academy_students(student_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const headers = ['Student Name', 'Amount Paid', 'Payment Date', 'Payment Method', 'Notes', 'Slip URL', 'Logged Date (IST)', 'Logged Time (IST)'];
      const rows = (payData || []).map(p => {
        const name = p.academy_students 
          ? (Array.isArray(p.academy_students) ? (p.academy_students[0] as any)?.student_name : (p.academy_students as any).student_name)
          : 'Enrolled Student';

        const dateObj = p.created_at ? new Date(p.created_at) : null;
        const dateIST = dateObj ? dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
        const timeIST = dateObj ? dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '';

        return [
          name,
          p.amount_paid,
          formatToISTDateTime(p.payment_date || p.created_at),
          p.payment_method,
          p.notes || '',
          p.transaction_slip_url || '',
          dateIST,
          timeIST
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val ?? ''}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Master_Academy_Payments_Report_${localTodayStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <Card variant="solid" className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-450 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-400" />
          Daily Closing Reports
        </h3>
        <p className="text-xs text-slate-400 mb-6">Review today's financial summary before downloading report logs.</p>
        
        {todaySummary.loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-450 gap-2 text-xs">
            <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading today's summary...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Tech Ads Agency */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Tech Ads Agency</span>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase">Today</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Total Sales Amount</span>
                  <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(todaySummary.agencySalesAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Sales Logs Tally</span>
                  <span className="text-sm font-extrabold text-slate-200">{todaySummary.agencySalesCount} logs</span>
                </div>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowTodayTransactions(true)}
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-indigo-300 border-indigo-500/20 hover:border-indigo-500/40"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Today's Logs</span>
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleDownloadAgencyReport}
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 font-bold text-[10px] uppercase tracking-wider animate-scale-up"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sales</span>
                </Button>
              </div>
            </div>

            {/* Section 2: Techads Academy */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-3.5">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Techads Academy</span>
                <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-extrabold uppercase">Today</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Tuition Collected</span>
                  <span className="text-sm font-extrabold text-indigo-400">{formatCurrency(todaySummary.academyFeesAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase block">Fee Logs Tally</span>
                  <span className="text-sm font-extrabold text-slate-200">{todaySummary.academyFeesCount} logs</span>
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  variant="success" 
                  fullWidth 
                  onClick={handleDownloadAcademyReport}
                  className="py-2.5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider animate-scale-up"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Academy Fees Log</span>
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-2 border-t border-slate-800">
          <Button variant="secondary" fullWidth onClick={onClose}>Close Modal</Button>
        </div>
      </Card>

      {/* Today's Transactions Breakdown Popup Modal */}
      {showTodayTransactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <Card variant="glass" className="w-full max-w-2xl p-6 bg-slate-900 border border-indigo-500/30 relative animate-scale-up max-h-[85vh] flex flex-col">
            <button 
              onClick={() => setShowTodayTransactions(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 shrink-0">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  Today's Sales Transactions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Breakdown of sales logged on <span className="text-indigo-300 font-semibold">{new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Today</span>
                <span className="text-base font-extrabold text-emerald-400">{formatCurrency(todaySummary.agencySalesAmount)}</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {todaySalesLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                  No sales transactions logged today yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/80 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Staff Executive</th>
                        <th className="py-2.5 px-3">Client & Package</th>
                        <th className="py-2.5 px-3 text-center">Type</th>
                        <th className="py-2.5 px-3 text-right">Received</th>
                        <th className="py-2.5 px-3">UTR / Ref #</th>
                        <th className="py-2.5 px-3 text-right">Time (IST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                      {todaySalesLogs.map(sale => {
                        const staffName = sale.staff?.full_name || sale.staff_name || 'Safwana';
                        let utrNum = sale.utr_number || sale.utr || sale.transaction_id || sale.payment_ref;
                        if (!utrNum && sale.work_description) {
                          const match = sale.work_description.match(/(?:Txn Ref|UTR|Txn ID):\s*([^\s)]+)/i);
                          if (match) utrNum = match[1];
                        }
                        utrNum = utrNum || '-';
                        const timeFormatted = sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';

                        return (
                          <tr key={sale.id} className="hover:bg-slate-900/30">
                            <td className="py-2.5 px-3 font-bold text-indigo-300">{staffName}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white">{sale.client_name}</div>
                              <div className="text-[10px] text-slate-450">{sale.service_package}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'info' : 'purple'}>
                                {sale.payment_type}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">
                              {formatCurrency(sale.received_amount)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{utrNum}</td>
                            <td className="py-2.5 px-3 text-right text-[10px] text-slate-450">{timeFormatted}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-400 font-semibold">{todaySalesLogs.length} Records Found</span>
              <Button variant="secondary" onClick={() => setShowTodayTransactions(false)} className="py-1.5 px-4 text-xs font-bold">
                Back to Reports
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
