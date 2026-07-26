const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const brokenStr = `                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">`;

const fixedStr = `                                  </button>
                                ))}
                              </div>
                            )}
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">`;

text = text.replace(brokenStr, fixedStr);
fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
