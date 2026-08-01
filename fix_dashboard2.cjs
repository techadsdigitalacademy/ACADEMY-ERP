const fs = require('fs');
let code = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const startStr = '/* STAFF MODE - READ-ONLY SALES HISTORY */';
const startIndex = code.indexOf(startStr);

if (startIndex !== -1) {
    const divStart = code.indexOf('<div className=" space-y-4\>', startIndex);
 const endStr = '{/* EXPENSE HISTORY TAB MODULE */}';
 const endIndexMarker = code.indexOf(endStr, divStart);
 
 const endBlock = code.lastIndexOf(')}', endIndexMarker);
 const endDiv = code.lastIndexOf('</div>', endBlock);
 
 if (divStart !== -1 && endDiv !== -1) {
 const replacement = '<SalesHistoryLog \n sales={filteredSales}\n targetAmount={targetAmount}\n isAdmin={false}\n onViewSlip={handleViewSlip}\n />';
 code = code.slice(0, divStart) + replacement + code.slice(endDiv + 6); // +6 to skip </div>
 fs.writeFileSync('src/pages/SalesDashboard.tsx', code);
 console.log('Successfully replaced Staff Mode table!');
 }
}
