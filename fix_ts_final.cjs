const fs = require('fs');

let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// Fix missing Trash2 import if not present
if (!ad.includes('Trash2')) {
  // It should be imported from 'lucide-react'
  // I will just add it
}
// Actually, let me just add it manually in the file via regex
ad = ad.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Trash2} from 'lucide-react';");

// Remove unused variables to please tsc
ad = ad.replace(/UserPlus,?\s*/g, '');
ad = ad.replace(/Search,?\s*/g, '');

// Since these might be hard to clean up via regex properly, I will just add // @ts-nocheck to the top of the file or use @ts-ignore on the lines, but easier is to just let tsc complain?
// Wait, `tsc -b && vite build` means if `tsc` fails, it doesn't build!
// I must fix them.
ad = ad.replace(/const \[searchQuery, setSearchQuery\] = useState\(''\);/, '');
ad = ad.replace(/const regNo = `\$\{batch\.batch_code\}-\$\{String\(students\.length \+ 1\)\.padStart\(3, '0'\)\}`;/, '');
ad = ad.replace(/const handleDeleteStudent = async \(id: string\) => \{\};/, 'const handleDeleteStudent = async (_id: string) => {};');

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');
console.log('Fixed Trash2 and unused variables');
