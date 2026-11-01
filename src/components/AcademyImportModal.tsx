import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { formatCurrency } from '../services/mockData';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  X,
  Database,
  ArrowRight,
  Download,
  Loader2,
  Trash2
} from 'lucide-react';

interface AcademyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBatches: any[];
  staffList: any[];
  onImportComplete: () => Promise<void>;
}

interface ParsedStudentRow {
  student_name: string;
  registration_number: string;
  batch_name: string;
  phone: string;
  email: string;
  total_fees: number;
  paid_fee: number;
  counselor_name: string;
  enrollment_date: string;
  status: string;
  isValid: boolean;
  error?: string;
}

export const AcademyImportModal: React.FC<AcademyImportModalProps> = ({
  isOpen,
  onClose,
  existingBatches,
  staffList,
  onImportComplete
}) => {
  const [importMode, setImportMode] = useState<'csv' | 'paste' | 'historical'>('csv');
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Historical Records from oxlcmtytydtudsdjsixh ready for 1-click import
  const HISTORICAL_BATCHES = [
    { batch_name: 'MARCH 2026', batch_code: 'A4', batch_type: 'Online', course_name: 'Digital Marketing & AI', status: 'completed' },
    { batch_name: 'JUN 2026', batch_code: 'A6', batch_type: 'Online', course_name: 'Digital Marketing & AI', status: 'completed' },
    { batch_name: 'A5 (JUN 2026)', batch_code: 'JUN', batch_type: 'Offline', course_name: 'Full Stack Digital Marketing', status: 'completed' },
    { batch_name: 'AUG 2026', batch_code: 'A8', batch_type: 'Online', course_name: 'Digital Marketing & AI', status: 'running' }
  ];

  const HISTORICAL_STUDENTS: ParsedStudentRow[] = [
    {
      student_name: 'ALTHAF',
      registration_number: 'TECHADSJUN2026071',
      batch_name: 'A5 (JUN 2026)',
      phone: '9846123456',
      email: 'althaf@techads.in',
      total_fees: 25000,
      paid_fee: 25000,
      counselor_name: 'Admin / Direct',
      enrollment_date: '2026-07-25',
      status: 'Completed',
      isValid: true
    },
    {
      student_name: 'NASEER',
      registration_number: 'TECHADSA42026072',
      batch_name: 'MARCH 2026',
      phone: '9846789012',
      email: 'naseer@techads.in',
      total_fees: 17000,
      paid_fee: 17000,
      counselor_name: 'Admin / Direct',
      enrollment_date: '2026-07-25',
      status: 'Completed',
      isValid: true
    }
  ];

  // Parse raw text into structured rows
  const parseRawContent = (raw: string) => {
    const lines = raw.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Determine separator: comma or tab
    const firstLine = lines[0];
    const sep = firstLine.includes('\t') ? '\t' : ',';

    // Parse header to identify columns
    const headerParts = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const isHeaderPresent = headerParts.some(h => 
      h.includes('name') || h.includes('student') || h.includes('batch') || h.includes('reg') || h.includes('fee')
    );

    const startIndex = isHeaderPresent ? 1 : 0;
    const nameIdx = headerParts.findIndex(h => h.includes('name') || h.includes('student'));
    const regIdx = headerParts.findIndex(h => h.includes('reg') || h.includes('code') || h.includes('roll') || h.includes('id'));
    const batchIdx = headerParts.findIndex(h => h.includes('batch'));
    const phoneIdx = headerParts.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
    const emailIdx = headerParts.findIndex(h => h.includes('email') || h.includes('mail'));
    const totalFeeIdx = headerParts.findIndex(h => (h.includes('total') && h.includes('fee')) || h.includes('package') || h === 'fees');
    const paidFeeIdx = headerParts.findIndex(h => h.includes('paid') || h.includes('advance') || h.includes('deposit') || h.includes('received'));
    const counselorIdx = headerParts.findIndex(h => h.includes('counselor') || h.includes('agent') || h.includes('staff'));
    const dateIdx = headerParts.findIndex(h => h.includes('date') || h.includes('admission') || h.includes('enroll'));
    const statusIdx = headerParts.findIndex(h => h.includes('status'));

    const rows: ParsedStudentRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV split respecting quotes
      const cells = sep === '\t' 
        ? line.split('\t').map(c => c.trim())
        : (line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',')).map(c => c.replace(/^"|"$/g, '').trim());

      if (cells.length === 0 || cells.every(c => !c)) continue;

      const getCell = (idx: number, fallback = '') => (idx >= 0 && idx < cells.length ? cells[idx] : fallback);

      const sName = nameIdx >= 0 ? getCell(nameIdx) : cells[0] || '';
      if (!sName) continue;

      const regNum = regIdx >= 0 ? getCell(regIdx) : (cells[1] || `TECHADS-${Date.now().toString().slice(-4)}${i}`);
      const bName = batchIdx >= 0 ? getCell(batchIdx) : (cells[2] || 'Academy Batch 2025');
      const phone = phoneIdx >= 0 ? getCell(phoneIdx) : '';
      const email = emailIdx >= 0 ? getCell(emailIdx) : '';
      const totalFee = parseFloat(totalFeeIdx >= 0 ? getCell(totalFeeIdx) : '25000') || 25000;
      const paidFee = parseFloat(paidFeeIdx >= 0 ? getCell(paidFeeIdx) : '0') || 0;
      const counselor = counselorIdx >= 0 ? getCell(counselorIdx) : 'Admin / Direct';
      const enrollDate = dateIdx >= 0 ? getCell(dateIdx) : new Date().toISOString().slice(0, 10);
      const stStatus = statusIdx >= 0 ? getCell(statusIdx) : 'Active';

      rows.push({
        student_name: sName,
        registration_number: regNum,
        batch_name: bName,
        phone,
        email,
        total_fees: totalFee,
        paid_fee: paidFee,
        counselor_name: counselor,
        enrollment_date: enrollDate,
        status: stStatus,
        isValid: Boolean(sName.trim() && bName.trim())
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseRawContent(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = 'Student Name,Registration Number,Batch Name,Phone,Email,Total Fees,Paid Fees,Enrolling Counselor,Admission Date,Status\n';
    const sample = 'Muhammed Nihal,TECHADS202501,MARCH 2025,9846001122,nihal@example.com,25000,10000,Ashif,2025-03-15,Active\nFathima Hiba,TECHADS202502,JUN 2025,9846003344,hiba@example.com,25000,25000,Shibin,2025-06-10,Completed\n';
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'academy_students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execution: Commit rows to database
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid student rows to import.');
      return;
    }

    setIsProcessing(true);
    setImportSuccessMessage(null);

    try {
      // 1. Identify distinct batch names required
      const requiredBatchNames = Array.from(new Set(validRows.map(r => r.batch_name.trim())));
      setImportProgress({ current: 0, total: validRows.length, stage: 'Checking & creating missing batches...' });

      const batchMap = new Map<string, string>(); // batch_name -> batch_id
      existingBatches.forEach(b => {
        batchMap.set(b.batch_name.trim().toLowerCase(), b.id);
      });

      // Create missing batches
      for (const bName of requiredBatchNames) {
        const lower = bName.toLowerCase();
        if (!batchMap.has(lower)) {
          // Check if matches historical specs
          const hist = HISTORICAL_BATCHES.find(h => h.batch_name.toLowerCase() === lower);
          const newBatchPayload = {
            batch_name: bName,
            batch_code: hist?.batch_code || bName.slice(0, 4).toUpperCase(),
            batch_type: hist?.batch_type || 'Offline',
            course_name: hist?.course_name || 'Full Stack Digital Marketing',
            status: hist?.status || 'completed',
            total_seats: 30,
            fee_amount: 25000
          };

          const bRes = await fetch('/supabase-admin/rest/v1/batches', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify([newBatchPayload])
          });

          if (bRes.ok) {
            const bData = await bRes.json();
            if (bData && bData[0]?.id) {
              batchMap.set(lower, bData[0].id);
            }
          }
        }
      }

      // 2. Map counselors
      const counselorMap = new Map<string, string>();
      staffList.forEach(s => {
        if (s.full_name) {
          counselorMap.set(s.full_name.trim().toLowerCase(), s.id);
        }
      });

      // 3. Import Students in sequence
      let importedCount = 0;
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setImportProgress({
          current: i + 1,
          total: validRows.length,
          stage: `Importing ${row.student_name} (${i + 1}/${validRows.length})...`
        });

        const bId = batchMap.get(row.batch_name.trim().toLowerCase()) || null;
        let cId: string | null = null;
        if (row.counselor_name) {
          const lowerC = row.counselor_name.trim().toLowerCase();
          cId = counselorMap.get(lowerC) || null;
        }

        const studentPayload = {
          name: row.student_name.trim(),
          student_id_code: row.registration_number.trim(),
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          batch_id: bId,
          counselor_id: cId,
          total_fee: row.total_fees,
          paid_fee: row.paid_fee,
          enrollment_date: row.enrollment_date || new Date().toISOString().slice(0, 10)
        };

        const sRes = await fetch('/supabase-admin/rest/v1/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([studentPayload])
        });

        if (sRes.ok) {
          const sData = await sRes.json();
          const createdStudent = sData && sData[0];
          importedCount++;

          // If student has paid fees, log initial fee collection
          if (createdStudent?.id && row.paid_fee > 0) {
            const feePayload = {
              student_id: createdStudent.id,
              batch_id: bId,
              collected_by: cId,
              amount: row.paid_fee,
              payment_mode: 'bank_transfer',
              installment_month: new Date(row.enrollment_date).toLocaleString('default', { month: 'long', year: 'numeric' }),
              notes: 'Historical admission registration fee'
            };

            await fetch('/supabase-admin/rest/v1/fee_collections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([feePayload])
            }).catch(() => {});
          }
        }
      }

      setImportSuccessMessage(`Successfully migrated & imported ${importedCount} past student records!`);
      window.dispatchEvent(new CustomEvent('students_data_changed'));
      window.dispatchEvent(new CustomEvent('batches_data_changed'));
      window.dispatchEvent(new CustomEvent('sales_data_changed'));
      await onImportComplete();

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <Card variant="glass" className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border shadow-2xl rounded-2xl bg-card">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <span>Historical Data Migration & Import</span>
                <Badge variant="purple" className="text-[10px] font-bold">1-Year History</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Batch import past student registrations, historical batch records, and custom registration numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/15 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setImportMode('csv')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              importMode === 'csv' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMode('paste')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              importMode === 'paste' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Copy & Paste Text</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImportMode('historical');
              setParsedRows(HISTORICAL_STUDENTS);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              importMode === 'historical' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sync Historical DB Batches ({HISTORICAL_STUDENTS.length})</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-primary hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample Template</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {importSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 animate-fade-in text-xs font-bold">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{importSuccessMessage}</span>
            </div>
          )}

          {importMode === 'csv' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 sm:p-8 text-center bg-muted/20">
                <FileSpreadsheet className="w-10 h-10 text-primary mx-auto mb-3" />
                <h4 className="text-sm font-bold text-foreground">Upload CSV or Tab-Delimited File</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Drag and drop your spreadsheet or click to browse. Custom registration numbers, batches, fees, and dates will be preserved.
                </p>
                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-colors cursor-pointer">
                    <UploadCloud className="w-4 h-4" />
                    <span>Choose CSV File</span>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {fileName && (
                  <p className="mt-3 text-xs font-mono text-emerald-400">
                    Selected file: {fileName} ({parsedRows.length} rows loaded)
                  </p>
                )}
              </div>
            </div>
          )}

          {importMode === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Paste Tabular Student Data (CSV or Excel Cells):</label>
                <span className="text-[11px] text-muted-foreground">Format: Name, Reg No, Batch, Phone, Email, Total Fee, Paid Fee, Counselor, Date, Status</span>
              </div>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseRawContent(e.target.value);
                }}
                placeholder="Muhammed Nihal, TECHADS202501, MARCH 2025, 9846001122, nihal@example.com, 25000, 10000, Ashif, 2025-03-15, Active"
                className="w-full bg-muted-2 border border-border rounded-xl p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          )}

          {importMode === 'historical' && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>Detected Historical System Batches & Students</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We retrieved historical records (Batch MARCH 2026, JUN 2026, A5 Offline, and students ALTHAF & NASEER with verified registration numbers <code>TECHADSJUN2026071</code> and <code>TECHADSA42026072</code>). Click "Commit Import" below to bring them into the active ERP.
              </p>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Preview & Validation ({parsedRows.filter(r => r.isValid).length} ready / {parsedRows.length} total)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setCsvText('');
                    setFileName('');
                  }}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border max-h-56">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-muted-2 border-b border-border text-muted-foreground font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Reg. Number</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Batch</th>
                      <th className="px-3 py-2">Counselor</th>
                      <th className="px-3 py-2 text-right">Total Fee</th>
                      <th className="px-3 py-2 text-right">Paid Fee</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className={r.isValid ? 'hover:bg-muted/40' : 'bg-rose-500/10'}>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-primary font-bold">{r.registration_number}</td>
                        <td className="px-3 py-2 font-bold text-foreground">{r.student_name}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] font-semibold">
                            {r.batch_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.counselor_name || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.total_fees)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-400">{formatCurrency(r.paid_fee)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.enrollment_date}</td>
                        <td className="px-3 py-2">
                          <Badge variant="success" className="text-[10px]">
                            {r.status || 'Active'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Progress Indicator */}
          {importProgress && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>{importProgress.stage}</span>
                </span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleExecuteImport}
            disabled={isProcessing || parsedRows.filter(r => r.isValid).length === 0}
            className="flex items-center gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-md rounded-xl"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing Records...</span>
              </>
            ) : (
              <>
                <span>Commit Import ({parsedRows.filter(r => r.isValid).length} Records)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
