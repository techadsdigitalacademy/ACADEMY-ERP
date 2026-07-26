const fs = require('fs');

// AcademyDashboard fixes
let ad = fs.readFileSync('src/pages/AcademyDashboard.tsx', 'utf8');

// Add imports
if (!ad.includes('import { BatchStudentsView }')) {
  ad = ad.replace(
    /import \{ Card \} from '\.\.\/components\/Card';/,
    `import { Card } from '../components/Card';\nimport { BatchStudentsView } from '../components/BatchStudentsView';\nimport { BatchFinancesView } from '../components/BatchFinancesView';`
  );
}

if (!ad.includes('Trash2')) {
  ad = ad.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Trash2, Wallet, ArrowUpRight, X} from 'lucide-react';");
}

// Add types
ad = ad.replace(/onViewPaymentHistory=\{\(s\) =>/g, "onViewPaymentHistory={(s: any) =>");
ad = ad.replace(/onViewAttendanceHistory=\{\(s\) =>/g, "onViewAttendanceHistory={(s: any) =>");
ad = ad.replace(/onCollectPayment=\{\(s\) =>/g, "onCollectPayment={(s: any) =>");

fs.writeFileSync('src/pages/AcademyDashboard.tsx', ad, 'utf8');

// SalesDashboard fixes
let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');
if (!sd.includes('<CounselorDashboard')) {
    // If not used, delete import to fix TS error
    sd = sd.replace(/import \{ CounselorDashboard \} from '\.\.\/components\/CounselorDashboard';\r?\n/, "");
}
fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');

console.log('Fixed remaining TS errors');
