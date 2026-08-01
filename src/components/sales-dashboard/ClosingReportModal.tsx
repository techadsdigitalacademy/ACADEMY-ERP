import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Card } from '../Card';
import { Button } from '../Button';
import { X, Download } from 'lucide-react';
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

  useEffect(() => {
    if (!isOpen) return;

    const fetchTodayClosingData = async () => {
      setTodaySummary(prev => ({ ...prev, loading: true }));
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch today's agency sales
        const { data: salesData, error: salesErr } = await supabase
          .from('sales')
          .select('received_amount')
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59.999`);

        let agencySalesAmount = 0;
        let agencySalesCount = 0;

        if (!salesErr && salesData) {
          agencySalesCount = salesData.length;
          agencySalesAmount = salesData.reduce((sum, item) => sum + Number(item.received_amount || 0), 0);
        }

        // 2. Fetch today's academy payments
        const { data: feesData, error: feesErr } = await supabase
          .from('academy_installments')
          .select('amount_paid')
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59.999`);

        let academyFeesAmount = 0;
        let academyFeesCount = 0;

        if (!feesErr && feesData) {
          academyFeesCount = feesData.length;
          academyFeesAmount = feesData.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
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

  const handleDownloadAgencyReport = async () => {
    try {
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('client_name, service_package, payment_type, package_amount, received_amount, balance_amount, payment_method, sale_month, created_at');
      if (error) throw error;
      
      const headers = ['Client Name', 'Service Package', 'Payment Type', 'Package Amount', 'Received Amount', 'Balance', 'Payment Method', 'Month', 'Logged At'];
      const rows = (salesData || [])?.map(s => [
        s.client_name,
        s.service_package,
        s.payment_type,
        s.package_amount,
        s.received_amount,
        s.balance_amount,
        s.payment_method || 'UPI',
        s.sale_month,
        s.created_at
      ]);
      
      const csvContent = [headers.join(','), ...rows?.map(r => r?.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Closing_Agency_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
      const { data: payData, error } = await supabase
        .from('academy_installments')
        .select('student_id, amount_paid, payment_date, payment_method, transaction_slip_url, notes, created_at, academy_students(student_name)');
      if (error) throw error;
      
      const headers = ['Student Name', 'Amount Paid', 'Payment Date', 'Payment Method', 'Notes', 'Slip URL', 'Logged At'];
      const rows = (payData || [])?.map(p => {
        const name = p.academy_students 
          ? (Array.isArray(p.academy_students) ? (p.academy_students[0] as any)?.student_name : (p.academy_students as any).student_name)
          : 'Enrolled Student';
        return [
          name,
          p.amount_paid,
          p.payment_date,
          p.payment_method,
          p.notes || '',
          p.transaction_slip_url || '',
          p.created_at
        ];
      });
      
      const csvContent = [headers.join(','), ...rows?.map(r => r?.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Daily_Closing_Academy_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
              <div className="pt-2">
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={handleDownloadAgencyReport}
                  className="py-2.5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-wider animate-scale-up"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Agency Sales Log</span>
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
    </div>
  );
};
