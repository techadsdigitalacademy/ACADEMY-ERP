import re

with open('src/pages/SalesDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken section
broken_section = r'''                          ownerHistoryTab === 'Income' 
                            \? 'bg-indigo-500 text-white shadow-lg' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5''''

replacement = r'''                  {/* Filters & Quick Buttons */}
                  {!(isTutor || isCounselor) && (
                    <>
                      <div className="space-y-3 mt-4">
                      {isOwner && (
                        <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/5 w-full sm:w-auto shrink-0 mb-4 sm:mb-0">
                          <button
                            onClick={() => setOwnerHistoryTab('Income')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                              ownerHistoryTab === 'Income' 
                                ? 'bg-indigo-500 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Incomes
                          </button>
                          <button
                            onClick={() => setOwnerHistoryTab('Expense')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                              ownerHistoryTab === 'Expense' 
                                ? 'bg-rose-500 text-white shadow-lg' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}'''

content = re.sub(broken_section, replacement, content, flags=re.MULTILINE)

# Close the wrapper
close_target = r'''                  </div>
                </div>
              )}

            </section>'''

close_replacement = r'''                  </div>
                </div>
              )}
              </>
            )}

            </section>'''

content = content.replace(close_target, close_replacement)

with open('src/pages/SalesDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated properly.')
