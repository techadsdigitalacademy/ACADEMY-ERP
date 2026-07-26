const fs = require('fs');

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  /const isTutor = \(activeStaff\.designation \|\| ''\)\.toLowerCase\(\)\.includes\('tutor'\);/,
  `const isTutor = (activeStaff.designation || '').toLowerCase().includes('tutor');\n  const isCounselor = (activeStaff.designation || '').toLowerCase().includes('counselor');`
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');

let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
if (!sd.includes('GraduationCap')) {
  sd = sd.replace(
    /import \{([^}]+)\} from 'lucide-react';/,
    (match, imports) => {
       if (imports.includes('GraduationCap')) return match;
       return `import { ${imports.trim()}, GraduationCap } from 'lucide-react';`;
    }
  );
  fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');
}

let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');
ad = ad.replace(
  /const renderCounselorPortal = \(\) => \{[\s\S]*?\};\r?\n/g,
  ''
);
fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');

console.log('Fixed TS errors again');
