import React, { useState } from 'react';
import { X, Upload, RotateCcw } from 'lucide-react';
import { Button } from '../Button';
import { supabase } from '../../services/supabase';

interface LogRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStaff: any;
  onRefundLogged?: () => void;
}

export const LogRefundModal: React.FC<LogRefundModalProps> = ({
  isOpen,
  onClose,
  activeStaff,
  onRefundLogged
}) => {
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque'>('UPI');
  const [refundAmount, setRefundAmount] = useState('');
  const [description, setDescription] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !refundAmount || !activeStaff) return;
    
    const amountVal = Number(refundAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Please enter a valid refund amount greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      let slipUrl: string | null = null;
      if (slipFile) {
        const fileExt = slipFile.name.split('.').pop();
        const fileName = `refund_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `slips/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('payment_slips')
          .upload(filePath, slipFile, { cacheControl: '31536000' });

        if (uploadErr) {
          console.error('Refund slip upload failed:', uploadErr);
          alert('Refund slip upload failed: ' + uploadErr.message + '. Please try again.');
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('payment_slips')
          .getPublicUrl(filePath);
        slipUrl = publicUrlData.publicUrl;
      }

      const currentMonthStr = new Date().toISOString().substring(0, 7);

      const refundPayload: any = {
        staff_id: activeStaff.id,
        staff_name: activeStaff.full_name,
        client_name: clientName.trim(),
        service_package: 'Refund',
        package_amount: 0,
        received_amount: amountVal,
        balance_amount: 0,
        sale_month: currentMonthStr,
        payment_method: paymentMethod,
        payment_type: 'Refund',
        work_description: description.trim(),
        payment_proof_url: slipUrl,
        created_at: new Date().toISOString()
      };

      let { data: insertedData, error } = await supabase
        .from('sales')
        .insert(refundPayload)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Initial refund insert info:', error.message);
        const fallbackPayload = { ...refundPayload };
        delete fallbackPayload.work_description;
        delete fallbackPayload.staff_name;

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('sales')
          .insert(fallbackPayload)
          .select()
          .maybeSingle();

        if (fallbackError) {
          console.error('Supabase refund insert error:', fallbackError);
          throw new Error(fallbackError.message || 'Failed to save refund to database');
        }
        insertedData = fallbackData;
      }

      const localPayload = {
        ...(insertedData || {}),
        ...refundPayload,
        id: insertedData?.id || 'refund-' + Date.now(),
        payment_proof_url: insertedData?.payment_proof_url || refundPayload.payment_proof_url || slipUrl
      };

      // Multi-key local sync fallback for sales
      try {
        const keys = ['company_sales_local_store', 'sales'];
        keys.forEach(k => {
          const stored = localStorage.getItem(k);
          const list = stored ? JSON.parse(stored) : [];
          if (Array.isArray(list)) {
            list.unshift(localPayload);
            localStorage.setItem(k, JSON.stringify(list));
          }
        });
      } catch (err) {
        console.warn('LocalStorage refund save info:', err);
      }

      // Automatically register sales refund in Admin Finance Control Center (Monthly Expenses)
      try {
        const todayISODate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const dbExpPayload: any = {
          category: 'Sales Refund',
          description: `Sales Refund - ${clientName.trim()}${description.trim() ? ' (' + description.trim() + ')' : ''}`,
          amount: amountVal,
          expense_date: todayISODate,
          staff_id: activeStaff.id,
          staff_name: activeStaff.full_name,
          logged_by_name: activeStaff.full_name,
          sale_id: localPayload.id,
          created_at: new Date().toISOString()
        };

        let insertedExp: any = null;
        const { data: expData, error: expErr } = await supabase
          .from('expenses')
          .insert(dbExpPayload)
          .select()
          .maybeSingle();

        if (expErr) {
          console.warn('Initial refund expense insert info:', expErr.message);
          const fallbackPayload = { ...dbExpPayload };
          delete fallbackPayload.logged_by_name;
          delete fallbackPayload.staff_name;
          const { data: fbData } = await supabase.from('expenses').insert(fallbackPayload).select().maybeSingle();
          insertedExp = fbData;
        } else {
          insertedExp = expData;
        }

        const localExpPayload = insertedExp || { ...dbExpPayload, id: 'exp-refund-' + Date.now() };

        const expKeys = ['company_expenses_local_store', 'expenses', 'owner_expenses'];
        expKeys.forEach(k => {
          const stored = localStorage.getItem(k);
          const list = stored ? JSON.parse(stored) : [];
          if (Array.isArray(list)) {
            list.unshift(localExpPayload);
            localStorage.setItem(k, JSON.stringify(list));
          }
        });

        window.dispatchEvent(new CustomEvent('company_expenses_changed'));
      } catch (expErr) {
        console.warn('Automated refund expense sync info:', expErr);
      }

      // Notify application of sales change
      window.dispatchEvent(new CustomEvent('company_sales_changed', { detail: localPayload }));

      alert(`Refund of ₹${amountVal.toLocaleString('en-IN')} for ${clientName} logged successfully!`);
      
      // Reset form
      setClientName('');
      setRefundAmount('');
      setDescription('');
      setSlipFile(null);
      
      if (onRefundLogged) onRefundLogged();
      onClose();
    } catch (err: any) {
      alert('Failed to log refund: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-rose-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-rose-950/40">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-rose-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Log Refund Transaction</h3>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Direct Monetary Return</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company / Client Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500 transition-all"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refund Amount (₹)</label>
              <input
                type="number"
                required
                placeholder="e.g. 5000"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-rose-400 font-extrabold placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Slip (Optional)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 cursor-pointer flex items-center justify-between transition-all">
                <span className="truncate">{slipFile ? slipFile.name : 'Choose slip file...'}</span>
                <Upload className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-2" />
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reason / Description</label>
            <textarea
              rows={2}
              placeholder="Reason for processing this refund..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-all resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-white/5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="!py-2 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="!py-2 !px-5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 rounded-xl"
            >
              {isSubmitting ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
};
