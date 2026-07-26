const fs = require('fs');

let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// 1. Add imports
if (!ad.includes('import { BatchStudentsView }')) {
  ad = ad.replace(
    /import \{ AttendanceDashboard \} from '\.\.\/components\/AttendanceDashboard';/,
    `import { AttendanceDashboard } from '../components/AttendanceDashboard';\nimport { BatchStudentsView } from '../components/BatchStudentsView';\nimport { BatchFinancesView } from '../components/BatchFinancesView';`
  );
}

// 2. Patch Attendance dropdown for Tutors
const oldDropdown = '{batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}';
const newDropdown = '{(isTutor ? batches.filter(b => b.tutor_id === activeStaff?.id) : batches).map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code}) - {b.batch_type || "Offline"}</option>)}';
if (ad.includes(oldDropdown)) {
  ad = ad.replace(oldDropdown, newDropdown);
}

// 3. Extract side panel correctly
const rsStart = ad.indexOf('  const renderStudents = () => {');
const rsEnd = ad.indexOf('  const renderAttendance = () => {');
let rsContent = ad.substring(rsStart, rsEnd);

// Side panel starts at `        {selectedStudentView && (`
const sidePanelStart = rsContent.indexOf('        {selectedStudentView && (');

// We know the side panel ends right before the closing `        </div>\n      );\n    };` of `renderStudents`
// So we find the LAST `        </div>` in rsContent.
const lastDivIdx = rsContent.lastIndexOf('        </div>');

let sidePanelHtml = '';
if (sidePanelStart !== -1 && lastDivIdx !== -1) {
  sidePanelHtml = rsContent.substring(sidePanelStart, lastDivIdx).trim();
} else {
  console.log("Could not find side panel correctly!");
  process.exit(1);
}

// 4. Replace renderStudents
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
ad = ad.substring(0, rsStart) + newRenderStudents + ad.substring(rsEnd);


// 5. Replace renderCounselorFeeCollection
const rcStart = ad.indexOf('  const renderCounselorFeeCollection = () => {');
const rcEnd = ad.indexOf('  const renderFinances = () => {');

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

if (rcStart !== -1 && rcEnd !== -1) {
  ad = ad.substring(0, rcStart) + newRenderCounselor + ad.substring(rcEnd);
} else {
  console.log("Could not find renderCounselorFeeCollection!");
}

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Successfully completed!');
