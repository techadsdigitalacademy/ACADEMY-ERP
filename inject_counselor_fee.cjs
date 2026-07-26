const fs = require('fs');
let dash = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

const counselorRenderStr = `  const renderCounselorFeeCollection = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Balance Fee Collection</h3>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4 text-right">Total Fee</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {students.map(student => {
                const paid = installments.filter(i => i.student_id === student.id).reduce((s, i) => s + Number(i.amount_paid), 0);
                const balance = Number(student.total_fees) - paid;
                if (balance <= 0) return null; // Only show pending

                return (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200 text-sm">{student.student_name}</div>
                      <div className="text-xs text-slate-500">{student.registration_number}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-300">
                      {batches.find(b => b.id === student.batch_id)?.batch_code || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-white">{formatCurrency(student.total_fees)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-400">{formatCurrency(paid)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-rose-400">{formatCurrency(balance)}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => {
                          setSelectedStudentForFee(student);
                          setIsInstallmentModalOpen(true);
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Collect Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
              {students.filter(s => {
                  const p = installments.filter(i => i.student_id === s.id).reduce((sum, i) => sum + Number(i.amount_paid), 0);
                  return (Number(s.total_fees) - p) > 0;
              }).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm italic">No students with pending fees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };`;

dash = dash.replace(
  '  const renderFinances = () => {',
  counselorRenderStr + '\n\n  const renderFinances = () => {'
);

dash = dash.replace(
  /\{activeTab === 'academy_finances' && renderFinances\(\)\}/g,
  "{activeTab === 'academy_finances' && ((isCounselor && !isAdminMode) ? renderCounselorFeeCollection() : renderFinances())}"
);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', dash);
console.log('Counselor fee collection UI added');
