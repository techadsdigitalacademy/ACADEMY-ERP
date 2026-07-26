const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const regex = /<\/Card>\s*<\/div>\s*\)\}\s*<\/div>\s*className=\`px-3 py-1\.5 rounded-xl text-\[9px\] font-bold uppercase tracking-wider border transition-all duration-300 \$\{\s*activeFilter === filter\s*\?\s*'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500\/20'\s*:\s*'bg-slate-900\/60 border-white\/5 text-slate-455 hover:text-slate-200 hover:bg-slate-800'\s*\}\`\}\s*>\s*\{filter\}\s*<\/button>\s*\)\)\}\s*<\/div>\s*<\/div>\s*<div className="overflow-x-auto rounded-2xl border border-white\/5 bg-slate-950\/20">/;

const replacement = `                        </Card>
                      </div>
                    )}
                  </div>

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

                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">`;

// Wait, the regex might be slightly off.
// Let's just use string operations on indexes carefully.
const idx1 = text.indexOf('</Card>\\n                      </div>\\n                    )}\\n\\n                  </div>');
// if that doesn't work, let's just find `</Card>` and search forward.
