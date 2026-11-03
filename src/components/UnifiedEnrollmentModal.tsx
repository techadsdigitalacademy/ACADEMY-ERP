import React, { useState, useEffect } from 'react';
import { X, UserPlus, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { compressSlipFile, extensionForBlob } from '../utils/imageUtils';
import { formatCurrency } from '../services/mockData';

export interface UnifiedEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBatch?: any;
  allBatches?: any[];
  counselorsList?: any[];
  staffList?: any[];
  activeStaff?: any;
  isAdminMode?: boolean;
  onSuccess?: () => void;
}

export const UnifiedEnrollmentModal: React.FC<UnifiedEnrollmentModalProps> = ({
  isOpen,
  onClose,
  targetBatch,
  allBatches = [],
  counselorsList = [],
  staffList = [],
  activeStaff,
  onSuccess
}) => {
  const isCounselor = (activeStaff?.designation || '').toLowerCase().includes('counselor');

  // Form states
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [totalFee, setTotalFee] = useState<string>('25000');
  const [paidFee, setPaidFee] = useState<string>('0');
  const [paymentMode, setPaymentMode] = useState<'online' | 'cash' | 'bank_transfer'>('online');
  const [counselorId, setCounselorId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Slip upload states
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(null);

  // Status & error states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [enrollmentDate, setEnrollmentDate] = useState<string>(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [customStudentCode, setCustomStudentCode] = useState<string>('');

  // Initialize batch and counselor when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialBatch = targetBatch || allBatches[0] || null;
      const bId = initialBatch?.id || '';
      setSelectedBatchId(bId);

      const fee = initialBatch?.fee_amount ? String(initialBatch.fee_amount) : '25000';
      setTotalFee(fee);
      setPaidFee('0');
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setPaymentMode('online');
      setSlipFile(null);
      setSlipPreviewUrl(null);
      setFormError(null);
      setEnrollmentDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
      setCustomStudentCode('');

      // Counselor resolution: if counselor user, assign to activeStaff; else default counselor
      if (isCounselor && activeStaff?.id) {
        setCounselorId(activeStaff.id);
      } else if (initialBatch?.assigned_counselors && initialBatch.assigned_counselors[0]) {
        setCounselorId(initialBatch.assigned_counselors[0]);
      } else if (counselorsList.length > 0) {
        setCounselorId(counselorsList[0].id);
      } else if (staffList.length > 0) {
        const firstCounselor = staffList.find(s => (s.designation || '').toLowerCase().includes('counselor'));
        setCounselorId(firstCounselor?.id || '');
      } else {
        setCounselorId('');
      }
    }
  }, [isOpen, targetBatch, allBatches, counselorsList, staffList, activeStaff, isCounselor]);

  // Clean up preview object url
  useEffect(() => {
    return () => {
      if (slipPreviewUrl && slipPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(slipPreviewUrl);
      }
    };
  }, [slipPreviewUrl]);

  if (!isOpen) return null;

  // Active batch object
  
  // Effective counselor list
  const availableCounselors = counselorsList.length > 0
    ? counselorsList
    : staffList.filter(s => (s.designation || '').toLowerCase().includes('counselor'));

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const matched = allBatches.find(b => b.id === batchId);
    if (matched?.fee_amount) {
      setTotalFee(String(matched.fee_amount));
    }
    if (!isCounselor && matched?.assigned_counselors && matched.assigned_counselors.length > 0) {
      setCounselorId(matched.assigned_counselors[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlipFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setSlipPreviewUrl(url);
    } else {
      setSlipPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    if (slipPreviewUrl && slipPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(slipPreviewUrl);
    }
    setSlipFile(null);
    setSlipPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setFormError('Student Full Name is required.');
      return;
    }
    if (!trimmedPhone) {
      setFormError('Contact Phone Number is required.');
      return;
    }
    if (!selectedBatchId) {
      setFormError('Please select a course batch for admission.');
      return;
    }

    const numTotalFee = parseFloat(totalFee) || 0;
    const numPaidFee = parseFloat(paidFee) || 0;

    if (numPaidFee > numTotalFee && numTotalFee > 0) {
      setFormError('Initial deposit cannot exceed the total package fee.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Determine Counselor ID attribution
      const effectiveCounselorId = isCounselor
        ? (activeStaff?.id || counselorId || null)
        : (counselorId || null);

      // 2. Generate Student Code
      const studentCode = customStudentCode.trim() || `STU-${Date.now().toString().slice(-5)}`;
      const effectiveEnrollmentDate = enrollmentDate && enrollmentDate.trim() 
        ? enrollmentDate.trim() 
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const studentPayload = {
        student_id_code: studentCode,
        name: trimmedName,
        phone: trimmedPhone,
        email: email.trim() || null,
        batch_id: selectedBatchId,
        counselor_id: effectiveCounselorId,
        total_fee: numTotalFee,
        paid_fee: numPaidFee,
        enrollment_date: effectiveEnrollmentDate
      };

      // 3. Insert student record (try anon then admin proxy)
      let createdStudent: any = null;
      const { data: stuData, error: stuErr } = await supabase
        .from('students')
        .insert([studentPayload])
        .select()
        .single();

      if (!stuErr && stuData) {
        createdStudent = stuData;
      } else {
        const proxyRes = await fetch('/supabase-admin/rest/v1/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([studentPayload])
        });

        if (!proxyRes.ok) {
          const errData = await proxyRes.json().catch(() => ({}));
          throw new Error(errData.message || stuErr?.message || 'Failed to save student admission record.');
        }

        const resArr = await proxyRes.json();
        createdStudent = resArr[0];
      }

      const studentId = createdStudent?.id;

      // 4. Handle initial deposit fee and slip upload
      if (numPaidFee > 0 && studentId) {
        let uploadedSlipUrl = '';

        if (slipFile) {
          try {
            const compressedSlip = await compressSlipFile(slipFile);
            const ext = extensionForBlob(compressedSlip);
            const fileName = `fee_${studentId.slice(0, 8)}_${Date.now()}.${ext}`;

            let uploadRes = await supabase.storage.from('academy_slips').upload(fileName, compressedSlip, {
              contentType: compressedSlip.type,
              cacheControl: '31536000'
            });

            if (uploadRes.error) {
              uploadRes = await supabase.storage.from('payment_slips').upload(fileName, compressedSlip, {
                contentType: compressedSlip.type,
                cacheControl: '31536000'
              });
            }

            if (!uploadRes.error) {
              const bucketUsed = uploadRes.data?.path?.includes('academy_slips') ? 'academy_slips' : 'payment_slips';
              const { data: pubData } = supabase.storage.from(bucketUsed).getPublicUrl(fileName);
              uploadedSlipUrl = pubData?.publicUrl || '';
            }
          } catch (uploadErr) {
            console.warn('Slip upload warning (continuing with fee collection):', uploadErr);
          }
        }

        // Clean notes formatting with slip url
        let finalNotes = notes.trim() || 'Initial admission fee payment';
        if (uploadedSlipUrl) {
          finalNotes = `${finalNotes} [Slip: ${uploadedSlipUrl}]`;
        }

        const curMonth = effectiveEnrollmentDate 
          ? new Date(effectiveEnrollmentDate).toLocaleString('default', { month: 'long', year: 'numeric' })
          : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const feePayload = {
          student_id: studentId,
          batch_id: selectedBatchId,
          collected_by: effectiveCounselorId || activeStaff?.id || null,
          amount: numPaidFee,
          payment_mode: paymentMode, // Strictly 'online' | 'cash' | 'bank_transfer'
          installment_month: curMonth,
          notes: finalNotes
        };

        const { error: feeErr } = await supabase.from('fee_collections').insert([feePayload]);
        if (feeErr) {
          await fetch('/supabase-admin/rest/v1/fee_collections', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify([feePayload])
          });
        }
      }

      // 5. Broadcast synchronized events
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Admission submit error:', err);
      setFormError(err.message || 'An unexpected error occurred during admission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedBalance = Math.max(0, (parseFloat(totalFee) || 0) - (parseFloat(paidFee) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 my-auto relative">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">
                Academy Student Admission
              </h2>
              <p className="text-xs text-muted-foreground font-semibold">
                Unified enrollment with counselor attribution & fee confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Batch Selection */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Target Batch <span className="text-rose-400">*</span>
            </label>
            {targetBatch ? (
              <div className="p-3 rounded-xl bg-muted/70 border border-border flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-foreground text-sm block">
                    {targetBatch.batch_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {targetBatch.course_name || targetBatch.batch_name} &bull; {targetBatch.mode === 'online' ? '🌐 Online' : '🏢 Offline'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/25">
                  Selected
                </span>
              </div>
            ) : (
              <select
                value={selectedBatchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                required
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">-- Choose a Course Batch --</option>
                {allBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name} ({b.course_name || b.batch_name}) • {b.status === 'completed' ? '🎓 Completed' : b.status === 'running' ? '⚡ Active' : '📅 Upcoming'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Admission Date & Custom Reg No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Admission Date</span>
                <span className="text-[10px] text-primary font-semibold">Supports Backfilling</span>
              </label>
              <input
                type="date"
                required
                value={enrollmentDate}
                onChange={(e) => setEnrollmentDate(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Student / Reg. Code</span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </label>
              <input
                type="text"
                placeholder="Auto-generated if blank (e.g. STU-102)"
                value={customStudentCode}
                onChange={(e) => setCustomStudentCode(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 2. Student Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Student Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mohammed Farhan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* 3. Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 4. Total Package Fee & Initial Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Total Package Fee (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                placeholder="25000"
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Initial Deposit Paid (₹)</span>
                {parseFloat(paidFee) > 0 && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Bal: {formatCurrency(calculatedBalance)}
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={paidFee}
                onChange={(e) => setPaidFee(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* 5. Payment Mode (Strictly normalized for DB) */}
          {parseFloat(paidFee) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Deposit Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="online">Online / UPI (GPay / PhonePe / QR)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                </select>
              </div>

              {/* Enrolling Counselor Selection / Attribution */}
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Enrolling Counselor
                </label>
                {isCounselor ? (
                  <div className="bg-primary/10 border border-primary/25 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-primary block leading-tight">
                        {activeStaff?.full_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {activeStaff?.designation || 'Academic Counselor'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-primary/20 text-primary uppercase">
                      Assigned to You
                    </span>
                  </div>
                ) : (
                  <select
                    value={counselorId}
                    onChange={(e) => setCounselorId(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">-- Direct / Admin Admission --</option>
                    {availableCounselors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.designation || 'Counselor'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Counselor display when paidFee is 0 */}
          {parseFloat(paidFee) <= 0 && (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Enrolling Counselor
              </label>
              {isCounselor ? (
                <div className="bg-primary/10 border border-primary/25 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-primary block leading-tight">
                      {activeStaff?.full_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {activeStaff?.designation || 'Academic Counselor'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-primary/20 text-primary uppercase">
                    Assigned to You
                  </span>
                </div>
              ) : (
                <select
                  value={counselorId}
                  onChange={(e) => setCounselorId(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">-- Direct / Admin Admission --</option>
                  {availableCounselors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.designation || 'Counselor'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 6. Payment Slip Upload Section */}
          {parseFloat(paidFee) > 0 && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-dashed border-border space-y-2.5">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  Payment Slip / Proof of Transfer
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  PNG, JPG or PDF
                </span>
              </label>

              {slipFile ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {slipPreviewUrl ? (
                      <img
                        src={slipPreviewUrl}
                        alt="Slip preview"
                        className="w-10 h-10 rounded object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-xs truncate">
                        {slipFile.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {(slipFile.size / 1024).toFixed(1)} KB &bull; Attached
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="font-bold text-primary text-xs">Click to upload deposit slip</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Auto-compresses and attaches to student record</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* 7. Admission Notes */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Admission Remarks / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Batch shift request, initial deposit confirmed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Enrolling Student...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Admission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
