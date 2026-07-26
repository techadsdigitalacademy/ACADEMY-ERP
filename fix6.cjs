const fs = require('fs');
let dash = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
dash = dash.replace(
  '                  </div>\r\n                </div>\r\n              )}\r\n              </>\r\n            )}\r\n\r\n            </section>',
  `                  </div>
                </>
              )}
                </div>
              )}

            </section>`
);
dash = dash.replace(
  '                  </div>\n                </div>\n              )}\n              </>\n            )}\n\n            </section>',
  `                  </div>
                </>
              )}
                </div>
              )}

            </section>`
);
fs.writeFileSync('src/pages/SalesDashboard.tsx', dash);
console.log('Fixed tags');
