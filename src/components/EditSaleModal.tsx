import React, { useState, useEffect } from 'react';
import { X, Save, Edit3 } from 'lucide-react';
import { Button } from './Button';

interface EditSaleModalProps {
  sale: any;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose, onSave }) => {
  const [clientName, setClientName] = useState('');
  const [servicePackage, setServicePackage] = useState('');
  const [paymentType, setPaymentType] = useState<'Full' | 'Advance' | 'Clearance'>('Advance');
  const [packageAmount, setPackageAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [workDescription, setWorkDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sale) {
      setClientName(sale.client_name || '');
      setServicePackage(sale.service_package || sale.project_name || '');
      setPaymentType(sale.payment_type || 'Advance');
      setPackageAmount(sale.package_amount?.toString() || sale.package_cost?.toString() || '0');
      setReceivedAmount(sale.received_amount?.toString() || sale.amount?.toString() || '0');
      setPaymentMethod(sale.payment_method || 'UPI');
      setWorkDescription(sale.work_description || sale.description || '');
    }
  }, [sale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isClearance = paymentType === 'Clearance';
    if (!clientName.trim() || !servicePackage.trim() || (!isClearance && !packageAmount) || !receivedAmount) return;

    setIsSubmitting(true);
    try {
      const pCost = isClearance ? 0 : (parseFloat(packageAmount) || 0);
      const rAmount = parseFloat(receivedAmount) || 0;
      const bAmount = isClearance ? 0 : Math.max(0, pCost - rAmount);

      await onSave(sale.id, {
        client_name: clientName.trim(),
        service_package: servicePackage.trim(),
        payment_type: paymentType,
        package_amount: pCost,
        received_amount: rAmount,
        balance_amount: bAmount,
        payment_method: paymentMethod,
        work_description: workDescription.trim()
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving sale:', err);
      alert('Failed to update sale: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden animate-scale-up my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/80">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            Edit Sale Record
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Client / Company Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client / Company Name *</label>
            <input 
              type="text" 
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Service Package */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Service Package *</label>
            <select
              value={servicePackage}
              onChange={(e) => setServicePackage(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Select Package</option>
              <option value="CEO Pack">CEO Pack</option>
              <option value="SMM">SMM</option>
              <option value="SEO">SEO</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Website">Website</option>
              <option value="Logo">Logo</option>
              <option value="Poster">Poster</option>
              <option value="E-Commerce">E-Commerce</option>
            </select>
          </div>

          {/* Payment Status / Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Status / Type *</label>
            <select
              value={paymentType}
              onChange={(e) => {
                const val = e.target.value as any;
                setPaymentType(val);
                if (val === 'Clearance') {
                  setPackageAmount('0');
                } else if (val === 'Full') {
                  setReceivedAmount(packageAmount);
                }
              }}
              className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="Advance">Advance Deposit</option>
              <option value="Full">Full Payment</option>
              <option value="Clearance">Balance Clearing</option>
            </select>
          </div>

          {/* Package Price & Received Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Package Price (₹) {paymentType === 'Clearance' ? '(N/A)' : '*'}</label>
              <input 
                type="number" 
                required={paymentType !== 'Clearance'}
                disabled={paymentType === 'Clearance'}
                min="0"
                value={paymentType === 'Clearance' ? '0' : packageAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setPackageAmount(val);
                  if (paymentType === 'Full') {
                    setReceivedAmount(val);
                  }
                }}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Received Amount (₹) *</label>
              <input 
                type="number" 
                required
                min="0"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-success font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          {/* Work Description / Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Work Description / Notes (Optional)</label>
            <textarea
              rows={2}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Additional project scope or transaction notes..."
              className="w-full px-3 py-2 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3 border-t border-border">
            <Button 
              type="button" 
              variant="secondary" 
              className="flex-1 text-xs"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1 text-xs font-bold uppercase tracking-wider"
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
