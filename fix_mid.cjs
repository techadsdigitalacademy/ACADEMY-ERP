const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const startStr = `                        </Card>
                      </div>
                    )}

                  </div>`;

const endStr = `<div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">`;

const startIndex = text.indexOf(startStr);
const endIndex = text.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = startStr + `

                  <div className="space-y-3 mt-4">
                    {isOwner && (
                      <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                        {['All Sales', 'My Sales'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
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

                  ` + endStr;
                  
  text = text.substring(0, startIndex) + replacement + text.substring(endIndex + endStr.length);
  fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
  console.log("Successfully replaced the middle section!");
} else {
  console.log("Could not find start or end strings.", startIndex, endIndex);
}
