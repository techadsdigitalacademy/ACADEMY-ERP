const fs = require('fs');
let code = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

const start = code.indexOf('My Sales History Log (Read-Only)');
if (start !== -1) {
    const blockStart = code.lastIndexOf('<div className=" space-y-4\>', start);
 const endMarker = '</div>\n )}';
 const blockEnd = code.indexOf(endMarker, start);
 
 if (blockStart !== -1 && blockEnd !== -1) {
 const replacement = '<SalesHistoryLog \n sales={filteredSales}\n targetAmount={targetAmount}\n isAdmin={false}\n onViewSlip={handleViewSlip}\n />';
 code = code.slice(0, blockStart) + replacement + code.slice(blockEnd + endMarker.length - 2);
 fs.writeFileSync('src/pages/SalesDashboard.tsx', code);
 console.log('Replaced successfully');
 } else {
 console.log('Block start or end not found');
 }
} else {
 console.log('Start string not found');
}
