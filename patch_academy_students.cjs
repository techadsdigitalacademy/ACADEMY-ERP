const fs = require('fs');
let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// 1. Extract side panel
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

// 2. Replace renderStudents
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
fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Successfully patched renderStudents!');
