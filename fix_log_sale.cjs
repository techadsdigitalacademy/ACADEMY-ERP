const fs = require('fs');
let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

sd = sd.replace(
  /\{\!isAdminView && \!isOwner && activeStaff\.designation \!\=\= 'Graphic Designer' && activeStaff\.designation \!\=\= 'Digital Marketer' && \(/g,
  `{!isAdminView && !isOwner && !isTutor && !isCounselor && activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && (`
);

fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');
console.log('Fixed Log Sale button in SalesDashboard');
