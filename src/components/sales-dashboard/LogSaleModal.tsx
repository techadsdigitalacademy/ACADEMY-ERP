import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Card } from '../Card';
import { Button } from '../Button';
import { X, Briefcase } from 'lucide-react';

interface LogSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  activeStaff: any;
  addSale: (saleData: any) => Promise<void>;
  onExpenseLogged: () => void;
}

export const LogSaleModal: React.FC<LogSaleModalProps> = ({ 
  isOpen, 
  onClose, 
  isOwner, 
  activeStaff, 
  addSale,
  onExpenseLogged
}) => {
  const [ownerTransactionType, setOwnerTransactionType] = useState<'Income' | 'Expense'>('Income');
  const [ownerExpCategory, setOwnerExpCategory] = useState('Salary');
  const [ownerExpAmount, setOwnerExpAmount] = useState('');
  const [ownerExpDescription, setOwnerExpDescription] = useState('');
  const [ownerExpDate, setOwnerExpDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [isSubmittingOwnerExp, setIsSubmittingOwnerExp] = useState(false);

  const [clientName, setClientName] = useState('');
  const [servicePackage, setServicePackage] = useState('');
  const [paymentType, setPaymentType] = useState<'Full' | 'Advance' | 'Clearance'>('Advance');
  const [packageAmount, setPackageAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isLoggingSale, setIsLoggingSale] = useState(false);

  // Form Validation State
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [shakeForm, setShakeForm] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be under 2MB.");
      return;
    }

    setUploadedFileName(file.name);
    setIsUploadingProof(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `slips/${fileName}`;

      let publicUrlStr: string | null = null;
      const bucketNames = ['payment_proofs', 'payment-slips', 'sales-documents'];

      for (const bName of bucketNames) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(bName)
            .upload(filePath, file);

          if (!uploadError) {
            const { data } = supabase.storage.from(bName).getPublicUrl(filePath);
            publicUrlStr = data?.publicUrl || null;
            if (publicUrlStr) break;
          }
        } catch (bErr) {
          console.warn(`Bucket ${bName} upload attempt info:`, bErr);
        }
      }

      if (publicUrlStr) {
        setPaymentProofUrl(publicUrlStr);
      } else {
        console.warn("Storage bucket not available. Fallback to base64 string.");
        const reader = new FileReader();
        reader.onloadend = () => {
          setPaymentProofUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('File upload error warning:', err);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const isClearance = paymentType === 'Clearance';
    
    // Strict Validation Check
    const newErrors: { [key: string]: boolean } = {};
    if (!clientName.trim()) newErrors.clientName = true;
    if (!servicePackage.trim()) newErrors.servicePackage = true;
    if (!isClearance && (!packageAmount || Number(packageAmount) <= 0)) newErrors.packageAmount = true;
    if (!receivedAmount || Number(receivedAmount) < 0) newErrors.receivedAmount = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    setErrors({});
    setIsLoggingSale(true);
    try {
      const currentISTDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      await addSale({
        clientName: clientName.trim(),
        servicePackage,
        paymentType,
        packageAmount: isClearance ? 0 : Number(packageAmount),
        receivedAmount: Number(receivedAmount),
        paymentMethod,
        paymentProofUrl,
        workDescription,
        utrNumber,
        date: currentISTDate,
        saleDate: currentISTDate
      });

      setClientName('');
      setServicePackage('');
      setPaymentType('Advance');
      setPackageAmount('');
      setReceivedAmount('');
      setPaymentMethod('UPI');
      setUtrNumber('');
      setPaymentProofUrl('');
      setUploadedFileName('');
      setWorkDescription('');
      alert('Sale registered successfully!');
      onClose(); 
    } catch (err: any) {
      alert('Sale registry failed: ' + err.message);
    } finally {
      setIsLoggingSale(false);
    }
  };

  const handleOwnerSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: boolean } = {};
    if (!ownerExpAmount || Number(ownerExpAmount) <= 0) newErrors.ownerExpAmount = true;
    if (!ownerExpDescription.trim()) newErrors.ownerExpDescription = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      return;
    }

    setErrors({});
    if (!activeStaff) return;
    setIsSubmittingOwnerExp(true);
    try {
      const dbExpPayload: any = {
        category: ownerExpCategory,
        description: ownerExpDescription.trim(),
        amount: Number(ownerExpAmount),
        expense_date: ownerExpDate,
        staff_id: activeStaff.id,
        staff_name: activeStaff.full_name,
        logged_by_name: activeStaff.full_name,
        created_at: new Date().toISOString()
      };

      let insertedData: any = null;
      const { data, error } = await supabase.from('expenses').insert(dbExpPayload).select().maybeSingle();
      if (error) {
        console.warn('Initial expense insert info:', error.message);
        const fallbackPayload = { ...dbExpPayload };
        delete fallbackPayload.logged_by_name;
        delete fallbackPayload.staff_name;

        const { data: fbData, error: fbErr } = await supabase.from('expenses').insert(fallbackPayload).select().maybeSingle();
        if (fbErr) {
          console.error('Supabase expense insert failed:', fbErr);
          throw new Error(fbErr.message || 'Failed to save expense to the cloud database. Check RLS policies.');
        }
        insertedData = fbData;
      } else {
        insertedData = data;
      }

      const localPayload = insertedData || { ...dbExpPayload, id: 'exp-' + Date.now() };

      // Dual-sync to shared company_expenses_local_store and expenses keys
      try {
        const keys = ['company_expenses_local_store', 'expenses', 'owner_expenses'];
        keys.forEach(k => {
          const stored = localStorage.getItem(k);
          const list = stored ? JSON.parse(stored) : [];
          if (Array.isArray(list)) {
            list.unshift(localPayload);
            localStorage.setItem(k, JSON.stringify(list));
          }
        });
      } catch (err) {
        console.warn('LocalStorage expense save info:', err);
      }

      // Dispatch custom window event for 0ms instant UI rendering
      window.dispatchEvent(new CustomEvent('company_expenses_changed', { detail: localPayload }));

      alert('Expense logged successfully!');
      
      setOwnerExpAmount('');
      setOwnerExpDescription('');
      onExpenseLogged();
      onClose();
    } catch (err: any) {
      alert('Failed to log expense: ' + err.message);
    } finally {
      setIsSubmittingOwnerExp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <style>{`
        @keyframes modalShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
      <Card 
        variant="solid" 
        className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up max-h-[90vh] overflow-y-auto"
        style={shakeForm ? { animation: 'modalShake 0.4s ease-in-out' } : {}}
      >
        <button 
          onClick={() => { setErrors({}); onClose(); }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold"
        >
          <X className="w-4.5 h-4.5" />
        </button>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-white text-sm uppercase">Log New Client Sale</h3>
        </div>

        {isOwner && (
          <div className="flex p-1 bg-slate-950/50 rounded-xl border border-white/5 w-full mb-4">
            <button
              type="button"
              onClick={() => { setErrors({}); setOwnerTransactionType('Expense'); }}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                ownerTransactionType === 'Expense' 
                  ? 'bg-rose-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Log Expense
            </button>
            <button
              type="button"
              onClick={() => { setErrors({}); setOwnerTransactionType('Income'); }}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                ownerTransactionType === 'Income' 
                  ? 'bg-indigo-500 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Log Sale
            </button>
          </div>
        )}

        {(!isOwner || ownerTransactionType === 'Income') ? (
          <form onSubmit={handleLogSale} noValidate className="space-y-3.5">
            {Object.keys(errors).length > 0 && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-400 font-bold flex items-center gap-1.5 animate-pulse">
                ⚠️ Please fill in all required fields highlighted in red below.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Client / Company Name</span>
                <span className="text-rose-400 font-extrabold">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Acme Tech Solutions"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (errors.clientName) setErrors(prev => ({ ...prev, clientName: false }));
                }}
                className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none transition-all ${
                  errors.clientName 
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
              />
              {errors.clientName && (
                <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                  ⚠️ Client / Company Name is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Service Package</span>
                <span className="text-rose-400 font-extrabold">*</span>
              </label>
              <select
                value={servicePackage}
                onChange={(e) => {
                  setServicePackage(e.target.value);
                  if (errors.servicePackage) setErrors(prev => ({ ...prev, servicePackage: false }));
                }}
                className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none transition-all ${
                  errors.servicePackage 
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                    : 'border-slate-800 focus:border-indigo-500'
                }`}
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
              {errors.servicePackage && (
                <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                  ⚠️ Service Package selection is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Status</label>
              <select
                value={paymentType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setPaymentType(val);
                  if (val === 'Clearance') {
                    setPackageAmount('0');
                    if (errors.packageAmount) setErrors(prev => ({ ...prev, packageAmount: false }));
                  } else if (val === 'Full') {
                    setReceivedAmount(packageAmount);
                    if (errors.receivedAmount) setErrors(prev => ({ ...prev, receivedAmount: false }));
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="Full">Full Payment</option>
                <option value="Advance">Advance Deposit</option>
                <option value="Clearance">Balance Clearing</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  <span>Package Price (₹)</span>
                  {paymentType !== 'Clearance' && <span className="text-rose-400 font-extrabold">*</span>}
                </label>
                <input 
                  type="number" 
                  disabled={paymentType === 'Clearance'}
                  placeholder="e.g. 50000"
                  value={paymentType === 'Clearance' ? '0' : packageAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPackageAmount(val);
                    if (paymentType === 'Full') {
                      setReceivedAmount(val);
                      if (errors.receivedAmount) setErrors(prev => ({ ...prev, receivedAmount: false }));
                    }
                    if (errors.packageAmount) setErrors(prev => ({ ...prev, packageAmount: false }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none disabled:opacity-50 transition-all ${
                    errors.packageAmount 
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                {errors.packageAmount && (
                  <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                    ⚠️ Price required
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  <span>Received Amount (₹)</span>
                  <span className="text-rose-400 font-extrabold">*</span>
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 20000"
                  value={receivedAmount}
                  onChange={(e) => {
                    setReceivedAmount(e.target.value);
                    if (errors.receivedAmount) setErrors(prev => ({ ...prev, receivedAmount: false }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none transition-all ${
                    errors.receivedAmount 
                      ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
                {errors.receivedAmount && (
                  <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                    ⚠️ Received required
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Payment Proof Slip</label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="slip-upload"
                />
                <label 
                  htmlFor="slip-upload"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 cursor-pointer font-bold hover:bg-slate-900 hover:text-white transition-colors"
                >
                  Select File
                </label>
                {paymentProofUrl && uploadedFileName && (
                  <span className="text-[10px] text-emerald-400 font-bold truncate max-w-[200px]">
                    ✔ Payment Slip Attached: {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Work Description</label>
              <textarea
                rows={2}
                placeholder="Notes on delivery specs..."
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button variant="secondary" fullWidth onClick={() => { setErrors({}); onClose(); }}>Cancel</Button>
              <Button type="submit" variant="primary" fullWidth disabled={isLoggingSale || isUploadingProof}>
                {isLoggingSale ? 'Saving...' : 'Register Sale'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOwnerSubmitExpense} noValidate className="space-y-4 mt-2">
            {Object.keys(errors).length > 0 && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] text-rose-400 font-bold flex items-center gap-1.5 animate-pulse">
                ⚠️ Please fill in all required fields highlighted in red below.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Expense Category</label>
              <select
                value={ownerExpCategory}
                onChange={(e) => setOwnerExpCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                {['Salary', 'Rent', 'Internet & Recharge', 'Food & Drinks', 'EMI', 'Repair & Maintenance', 'Stationery', 'Electricity', 'Transport', 'Fixed Asset', 'Outwork', 'Return Sales', 'Facebook Ads', 'Marketing & Ads', 'Office & Operations', 'Software & Cloud', 'Client Hospitality', 'Equipment & Hardware', 'Other Expense'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Amount (₹)</span>
                <span className="text-rose-400 font-extrabold">*</span>
              </label>
              <input 
                type="number" 
                placeholder="e.g. 5000"
                value={ownerExpAmount}
                onChange={(e) => {
                  setOwnerExpAmount(e.target.value);
                  if (errors.ownerExpAmount) setErrors(prev => ({ ...prev, ownerExpAmount: false }));
                }}
                className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none transition-all ${
                  errors.ownerExpAmount 
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                    : 'border-slate-800 focus:border-rose-500'
                }`}
              />
              {errors.ownerExpAmount && (
                <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                  ⚠️ Expense Amount is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Description</span>
                <span className="text-rose-400 font-extrabold">*</span>
              </label>
              <input 
                type="text" 
                placeholder="e.g. Office electricity bill"
                value={ownerExpDescription}
                onChange={(e) => {
                  setOwnerExpDescription(e.target.value);
                  if (errors.ownerExpDescription) setErrors(prev => ({ ...prev, ownerExpDescription: false }));
                }}
                className={`w-full px-3 py-2 rounded-xl bg-slate-950 border text-xs text-slate-200 focus:outline-none transition-all ${
                  errors.ownerExpDescription 
                    ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20' 
                    : 'border-slate-800 focus:border-rose-500'
                }`}
              />
              {errors.ownerExpDescription && (
                <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 animate-fade-in">
                  ⚠️ Description is required
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
              <input 
                type="date" 
                value={ownerExpDate}
                onChange={(e) => setOwnerExpDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button variant="secondary" fullWidth onClick={() => { setErrors({}); onClose(); }}>Cancel</Button>
              <Button type="submit" variant="primary" className="!bg-rose-500 hover:!bg-rose-600 border-rose-500" fullWidth disabled={isSubmittingOwnerExp}>
                {isSubmittingOwnerExp ? 'Logging...' : 'Log Expense'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
