const fs = require('fs');
let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// 1. Ensure Batch components are imported
if (!ad.includes('import { BatchStudentsView }')) {
  ad = ad.replace(
    /import \{ AttendanceDashboard \} from '\.\.\/components\/AttendanceDashboard';/,
    `import { AttendanceDashboard } from '../components/AttendanceDashboard';\nimport { BatchStudentsView } from '../components/BatchStudentsView';\nimport { BatchFinancesView } from '../components/BatchFinancesView';`
  );
}

// 2. Extract side panel
const rsStart = ad.indexOf('  const renderStudents = () => {');
const rsEnd = ad.indexOf('  const renderAttendance = () => {');
let rsContent = ad.substring(rsStart, rsEnd);

const sidePanelStart = rsContent.indexOf('        {selectedStudentView && (');
const lastDivIdx = rsContent.lastIndexOf('        </div>');

let sidePanelHtml = '';
if (sidePanelStart !== -1 && lastDivIdx !== -1) {
  sidePanelHtml = rsContent.substring(sidePanelStart, lastDivIdx).trim();
} else {
  console.log("Could not find side panel correctly!");
  process.exit(1);
}

// 3. Insert renderCounselorFeeCollection right before renderFinances
const renderCounselorFeeCollection = `  const renderCounselorFeeCollection = () => {
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

const rfStart = ad.indexOf('  const renderFinances = () => {');
if (!ad.includes('const renderCounselorFeeCollection = () => {')) {
  ad = ad.substring(0, rfStart) + renderCounselorFeeCollection + ad.substring(rfStart);
}

// 4. Update the activeTab line
ad = ad.replace(
  /\{activeTab === 'academy_finances' && renderFinances\(\)\}/,
  `{activeTab === 'academy_finances' && ((isCounselor && !isAdminMode) ? renderCounselorFeeCollection() : renderFinances())}`
);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Successfully added renderCounselorFeeCollection!');
