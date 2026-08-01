import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from './Button';

interface EditSaleModalProps {
  sale: any;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onSave }) => {
  const [clientName, setClientName] = useState('');
  const [packageCost, setPackageCost] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sale) {
      setClientName(sale.client_name || '');
      setPackageCost(sale.package_cost?.toString() || '0');
      setAmount(sale.amount?.toString() || '0');
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSave(sale.id, {
        client_name: clientName,
        package_cost: parseFloat(packageCost),
        amount: parseFloat(amount)
      });
      onClose();
    } catch (err) {
      console.error('Error saving sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/50">
          <h2 className="text-lg font-bold text-white">Edit Sale</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Name</label>
            <input 
              type="text" 
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Price (₹)</label>
              <input 
                type="number" 
                required
                min="0"
                value={packageCost}
                onChange={(e) => setPackageCost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Received (₹)</label>
              <input 
                type="number" 
                required
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
