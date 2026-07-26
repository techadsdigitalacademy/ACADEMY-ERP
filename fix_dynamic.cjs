const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const marker1 = 'formatCurrency(totalBalance)';
const idx1 = text.indexOf(marker1);

const marker2 = '<div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">';
let idx2 = text.indexOf(marker2, idx1);

let afterTotalBalance = text.indexOf('</div>', idx1);
afterTotalBalance = text.indexOf(')}', afterTotalBalance) + 2;
afterTotalBalance = text.indexOf('</div>', afterTotalBalance) + 6;

const replacement = `
                  <div className="space-y-3 mt-4">
                    {isOwner && (
                      <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                        {['All Sales', 'My Sales'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={\`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 \${
                              activeFilter === filter
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                : 'bg-slate-900/60 border-white/5 text-slate-455 hover:text-slate-200 hover:bg-slate-800'
                            }\`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  ` + marker2;

text = text.substring(0, afterTotalBalance) + replacement + text.substring(idx2 + marker2.length);
fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
console.log('Done');
