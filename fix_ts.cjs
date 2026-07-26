const fs = require('fs');

// 1. Sidebar.tsx
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if (!sidebar.includes("const isCounselor = userDesignation === 'Academic Counselor';")) {
  sidebar = sidebar.replace(
    /const isTutor = userDesignation === 'Tutor';/,
    `const isTutor = userDesignation === 'Tutor';\n  const isCounselor = userDesignation === 'Academic Counselor';`
  );
}
fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');

// 2. SalesDashboard.tsx
let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
if (!sd.includes('GraduationCap')) {
  sd = sd.replace(
    /import \{([^{}]+)\} from 'lucide-react';/,
    (match, imports) => `import { ${imports.trim()}, GraduationCap } from 'lucide-react';`
  );
}
fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');

// 3. AcademyDashboard.tsx
let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');
ad = ad.replace(
  /const renderCounselorPortal = \(\) => \{([\s\S]*?)\};\s*(?:\/\/.*\s*)*\s*(?:const|function)/g,
  match => match.replace(/^const renderCounselorPortal = [\s\S]*?\};\s*/m, '')
);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');

console.log('Fixed simple TS errors');
