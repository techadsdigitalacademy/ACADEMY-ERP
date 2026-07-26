const fs = require('fs');

// First restore to original
fs.copyFileSync('C:\\Users\\SHIBILI\\.gemini\\antigravity\\brain\\c9248528-08c5-4f71-9768-30bf574affc7\\scratch\\AcademyDashboard.txt', 'src/pages/AcademyDashboard.tsx');

let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

if (!ad.includes('import { BatchStudentsView }')) {
  ad = ad.replace(
    /import \{ AttendanceDashboard \} from '\.\.\/components\/AttendanceDashboard';/,
    `import { AttendanceDashboard } from '../components/AttendanceDashboard';\nimport { BatchStudentsView } from '../components/BatchStudentsView';\nimport { BatchFinancesView } from '../components/BatchFinancesView';`
  );
}

// 2. Patch Attendance dropdown for Tutors
const oldDropdown = '{batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}';
const newDropdown = '{(isTutor ? batches.filter(b => b.tutor_id === activeStaff?.id) : batches).map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code}) - {b.batch_type || "Offline"}</option>)}';
if (ad.includes(oldDropdown)) {
  ad = ad.replace(oldDropdown, newDropdown);
}

const sidePanelCode = `        {selectedStudentView && (
          <div className="w-full md:w-[400px] md:ml-4 flex flex-col space-y-4 mt-6 md:mt-0 animate-fade-in">
            <Card variant="glass" className="p-5 border-white/5 relative bg-slate-900/80">
              <button onClick={() => setSelectedStudentView(null)} className="absolute top-4 right-12 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              {isAdminMode && (
                <button onClick={() => handleDeleteStudent(selectedStudentView.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              )}
              
              <h3 className="text-xl font-bold text-white pr-16">{selectedStudentView.student_name}</h3>
              <p className="text-sm font-mono text-indigo-400 mt-1">{selectedStudentView.registration_number}</p>
              
              <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Fees</p>
                  <p className="text-lg font-bold text-slate-300">{formatCurrency(selectedStudentView.total_fees)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Balance Due</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatCurrency(selectedStudentView.total_fees - installments.filter(i => i.student_id === selectedStudentView.id).reduce((sum, i) => sum + Number(i.amount_paid), 0))}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-400"/> Payment History</h4>
                  {(isAdminMode || isCounselor) && (
                    <button onClick={() => { setSelectedStudentForFee(selectedStudentView); setIsInstallmentModalOpen(true); }} className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg font-bold transition-colors">
                      + Add Payment
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {installments.filter(i => i.student_id === selectedStudentView.id).map(inst => (
                    <div key={inst.id} className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-emerald-400">+{formatCurrency(inst.amount_paid)}</p>
                          <p className="text-[10px] text-slate-400">{new Date(inst.payment_date).toLocaleDateString()} • {inst.payment_method}</p>
                        </div>
                        {inst.transaction_slip_url && (
                          <a href={inst.transaction_slip_url} target="_blank" rel="noreferrer" className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2 py-1 rounded flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3"/> Slip
                          </a>
                        )}
                      </div>
                      {inst.notes && <p className="text-xs text-slate-500 italic bg-white/5 p-2 rounded">{inst.notes}</p>}
                    </div>
                  ))}
                  {installments.filter(i => i.student_id === selectedStudentView.id).length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4">No payments logged yet.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };
`;


const newRenderStudents = `  const renderStudents = () => {
    return (
      <div className="animate-fade-in flex flex-col md:flex-row">
        <div className={\`flex-1 transition-all duration-300 \${selectedStudentView ? 'md:pr-4 md:border-r border-white/5' : ''}\`}>
          <BatchStudentsView 
            batches={batches}
            students={students}
            installments={installments}
            onRegisterStudent={() => setIsStudentModalOpen(true)}
            onViewPaymentHistory={(s) => setSelectedStudentView(s)}
            onViewAttendanceHistory={(s) => {
              setAttBatchId(s.batch_id);
              setActiveTab('academy_attendance');
            }}
          />
        </div>
${sidePanelCode}

`;

const rsStart = ad.indexOf('  const renderStudents = () => {');
const rsEnd = ad.indexOf('  const renderAttendance = () => {');

ad = ad.substring(0, rsStart) + newRenderStudents + ad.substring(rsEnd);

const newRenderCounselor = `  const renderCounselorFeeCollection = () => {
    return (
      <div className="animate-fade-in flex flex-col md:flex-row">
        <div className={\`flex-1 transition-all duration-300 \${selectedStudentView ? 'md:pr-4 md:border-r border-white/5' : ''}\`}>
          <BatchFinancesView 
            batches={batches}
            students={students}
            installments={installments}
            onCollectPayment={(s) => {
              setSelectedStudentForFee(s);
              setIsInstallmentModalOpen(true);
            }}
            onViewPaymentHistory={(s) => setSelectedStudentView(s)}
          />
        </div>
${sidePanelCode}

`;

const rfStart = ad.indexOf('  const renderFinances = () => {');
if (rfStart !== -1) {
  ad = ad.substring(0, rfStart) + newRenderCounselor + ad.substring(rfStart);
}

// 4. Update the activeTab line
ad = ad.replace(
  /\{activeTab === 'academy_finances' && renderFinances\(\)\}/,
  `{activeTab === 'academy_finances' && ((isCounselor && !isAdminMode) ? renderCounselorFeeCollection() : renderFinances())}`
);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Successfully completed final overhaul without regex matching!');
