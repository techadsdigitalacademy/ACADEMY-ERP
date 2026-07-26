const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const brokenSection = `                  </div>

                  

                  
                                    className=\`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 \${`;

const fixedSection = `                  </div>

                        <div className="space-y-3 mt-4">
                        {isOwner && (
                          <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                            {['All Sales', 'My Sales'].map((filter) => (
                              <button
                                key={filter}
                                onClick={() => setActiveFilter(filter as any)}
                                className=\`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 \${`;

text = text.replace(brokenSection, fixedSection);
fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
