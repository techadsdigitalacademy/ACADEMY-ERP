const fs = require('fs');

let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

const rsStartIdx = ad.indexOf('  const renderStudents = () => {');
const rsEndIdx = ad.indexOf('  const renderAttendance = () => {');
const rsContent = ad.substring(rsStartIdx, rsEndIdx);

const sidePanelStartStr = '{selectedStudentView && (';
const spStartIdx = rsContent.indexOf(sidePanelStartStr);

const spEndStr = '        </div>';
let spEndIdx = rsContent.lastIndexOf(spEndStr);

// To ensure we get the right closing div for the side panel, we can count the closing div just before the end of the function block.
// `        </div>\n      );\n    };`
// The very last '        </div>' is the container end. The one before it is the side panel end? No, the side panel ends with `          )}\n        </div>`.
spEndIdx = rsContent.lastIndexOf('          )}');
if (spEndIdx !== -1) {
    // Add the length of '          )}' to get the full string
    spEndIdx += '          )}'.length;
}

if (spStartIdx === -1 || spEndIdx === -1) {
  console.log("Could not find side panel strings!");
  process.exit(1);
}

// Ensure proper spacing for the side panel html
const sidePanelHtml = '        ' + rsContent.substring(spStartIdx, spEndIdx).trim();

const newRenderStudents = `  const renderStudents = () => {
    return (
      <div className="animate-fade-in flex flex-col md:flex-row">
        <div className={\`flex-1 transition-all duration-300 \${selectedStudentView ? 'md:pr-4 md:border-r border-white/5' : ''}\`}>
          <BatchStudentsView 
            batches={batches}
            students={students}
            installments={installments}
            onRegisterStudent={() => setIsStudentModalOpen(true)}
            onViewPaymentHistory={(s) => setSelectedStudentView(s)}
            onViewAttendanceHistory={(s) => {
              setAttBatchId(s.batch_id);
              setActiveTab('academy_attendance');
            }}
          />
        </div>
${sidePanelHtml}
      </div>
    );
  };

`;

ad = ad.substring(0, rsStartIdx) + newRenderStudents + ad.substring(rsEndIdx);

const rcStartIdx = ad.indexOf('  const renderCounselorFeeCollection = () => {');
const rcEndIdx = ad.indexOf('  const renderFinances = () => {');

const newRenderCounselor = `  const renderCounselorFeeCollection = () => {
    return (
      <div className="animate-fade-in flex flex-col md:flex-row">
        <div className={\`flex-1 transition-all duration-300 \${selectedStudentView ? 'md:pr-4 md:border-r border-white/5' : ''}\`}>
          <BatchFinancesView 
            batches={batches}
            students={students}
            installments={installments}
            onCollectPayment={(s) => {
              setSelectedStudentForFee(s);
              setIsInstallmentModalOpen(true);
            }}
            onViewPaymentHistory={(s) => setSelectedStudentView(s)}
          />
        </div>
${sidePanelHtml}
      </div>
    );
  };

`;

ad = ad.substring(0, rcStartIdx) + newRenderCounselor + ad.substring(rcEndIdx);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Successfully completely overhauled AcademyDashboard students and finances!');
