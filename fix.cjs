const fs = require('fs');

let sbText = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sbText = sbText.split('\n').filter(line => !line.includes('SettingsModal') && !line.includes('updateAvatar,')).join('\n');
sbText = sbText.replace(/staff\.name/g, 'staff.full_name');
sbText = sbText.replace(/member\.name/g, 'member.full_name');
sbText = sbText.replace(/setActiveTab\('academy'\)/g, "setActiveTab('academy_overview')");
sbText = sbText.replace(/activeTab === 'academy'/g, "activeTab === 'academy_overview'");
fs.writeFileSync('src/components/Sidebar.tsx', sbText, 'utf8');

let aText = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');
aText = aText.split('\n').filter(line => !line.includes('const year =') && !line.includes('const sequence =')).join('\n');
fs.writeFileSync('src/pages/AcademyDashboard.tsx', aText, 'utf8');

let sText = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
sText = sText.split('\n').filter(line => !line.includes('const [selectedAttMonth') && !line.includes('const monthProfileReports')).join('\n');
fs.writeFileSync('src/pages/SalesDashboard.tsx', sText, 'utf8');

console.log('Fixed final TS errors');
