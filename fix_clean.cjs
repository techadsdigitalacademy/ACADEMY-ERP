const fs = require('fs');
const lines = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8').split('\n');

const newLines = [];

for (let i = 0; i <= 3576; i++) {
  newLines.push(lines[i]);
}

newLines.push('                  {/* Filters & Quick Buttons */}');
newLines.push('                  {!(isTutor || isCounselor) && (');
newLines.push('                    <>');
newLines.push('                      <div className="space-y-3 mt-4">');
newLines.push('                      {isOwner && (');
newLines.push('                        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">');
newLines.push('                          <button');
newLines.push('                            onClick={() => setOwnerHistoryTab(\'Income\')}');
newLines.push('                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${');
newLines.push('                              ownerHistoryTab === \'Income\' ');
newLines.push('                                ? \'bg-indigo-500 text-white shadow-lg\' ');
newLines.push('                                : \'text-slate-400 hover:text-white hover:bg-white/5\'');
newLines.push('                            }`}');
newLines.push('                          >');
newLines.push('                            Incomes');
newLines.push('                          </button>');
newLines.push('                          <button');
newLines.push('                            onClick={() => setOwnerHistoryTab(\'Expense\')}');
newLines.push('                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${');
newLines.push('                              ownerHistoryTab === \'Expense\' ');
newLines.push('                                ? \'bg-rose-500 text-white shadow-lg\' ');
newLines.push('                                : \'text-slate-400 hover:text-white hover:bg-white/5\'');
newLines.push('                            }`}');
newLines.push('                          >');
newLines.push('                            Expenses');
newLines.push('                          </button>');
newLines.push('                        </div>');
newLines.push('                      )}');

// We skip to 3589. Let's make sure 3589 is where it continues safely.
// Let's print out what is at 3589 first.
for (let i = 3589; i <= 4558; i++) {
  // If we reach the end of the original file early, break
  if (i >= lines.length) break;
  newLines.push(lines[i]);
}

newLines.push('      </main>');
newLines.push('    </div>');
newLines.push('  );');
newLines.push('};');
newLines.push('');
newLines.push('export default SalesDashboard;');

fs.writeFileSync('src/pages/SalesDashboard.tsx', newLines.join('\n'));
console.log('Done!');
