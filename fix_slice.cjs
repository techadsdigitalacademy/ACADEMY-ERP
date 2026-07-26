const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const marker1 = `                          <span className="text-[9px] font-semibold text-amber-455 uppercase">Balance Total</span>
                          <p className="text-sm font-extrabold text-amber-400">{formatCurrency(totalBalance)}</p>
                        </Card>
                      </div>
                    )}

                  </div>`;

const marker2 = `<div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">`;

const idx1 = text.indexOf(marker1);
const idx2 = text.indexOf(marker2, idx1);

if (idx1 !== -1 && idx2 !== -1) {
  const replacement = marker1 + `

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
                  
  text = text.substring(0, idx1) + replacement + text.substring(idx2 + marker2.length);
  fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find markers.", idx1, idx2);
}
