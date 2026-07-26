const fs = require('fs');

let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

// Add import if missing
if (!sd.includes('import { CounselorDashboard }')) {
  sd = sd.replace(
    /import \{ TutorDashboard \} from '\.\.\/components\/TutorDashboard';/,
    `import { TutorDashboard } from '../components/TutorDashboard';\nimport { CounselorDashboard } from '../components/CounselorDashboard';`
  );
}

// Replace the old Counselor block
sd = sd.replace(
  /                  \{isCounselor && \([\s\S]*?<\!-- END COUNSELOR BLOCK -->\s*\)\}/m,
  // Note: Since I don't know the exact end block, I will replace using regex up to the Attendance Tab section.
  ''
);

// Wait, I can just replace the old Counselor code block explicitly.
// It starts with `{isCounselor && (` and ends right before `{/* ATTENDANCE TAB`
const counselorRegex = /                  \{isCounselor && \([\s\S]*?\}\)[\s\S]*?\{!isAdminView && !isOwner && !isTutor && !isCounselor && \(/;

// Actually, I should use indexOf and slice to be safe.
const startStr = '                  {isCounselor && (';
const endStr = '                  {/* ATTENDANCE TAB';

const startIdx = sd.indexOf(startStr);
const endIdx = sd.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  sd = sd.substring(0, startIdx) + 
       `                  {isCounselor && (
                    <CounselorDashboard activeStaff={activeStaff} />
                  )}

` + sd.substring(endIdx);
}

fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');
console.log('Injected CounselorDashboard');
