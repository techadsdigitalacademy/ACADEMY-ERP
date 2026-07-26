const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const searchStr = `                            {todayAttendance.punch_out && (
                              <> &bull;  Out: <span className="text-white font-bold">{todayAttendance.punch_out}</span>
                          </p>`;

const replaceStr = `                            {todayAttendance.punch_out && (
                              <> &bull;  Out: <span className="text-white font-bold">{todayAttendance.punch_out}</span></>
                            )}
                          </p>`;

text = text.replace(searchStr, replaceStr);

// Also I'll just check if there are other mismatched <></> or {} that I can fix.
// E.g. search for `{!(isTutor || isCounselor) && (` and replace it completely if it's dangling
const searchStr2 = `{!(isTutor || isCounselor) && (`;
text = text.replace(searchStr2, "");

fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
