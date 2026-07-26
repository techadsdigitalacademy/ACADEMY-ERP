const fs = require('fs');
let content = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// The replacement logic for Attendance Dropdown
const oldDropdown = '{batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}';
const newDropdown = '{(isTutor ? batches.filter(b => b.tutor_id === activeStaff?.id) : batches).map(b => <option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code}) - {b.batch_type || "Offline"}</option>)}';

content = content.replace(oldDropdown, newDropdown);

fs.writeFileSync('src/pages/AcademyDashboard.tsx', content, 'utf8');
console.log('Patched AcademyDashboard attendance dropdown');
