const fs = require('fs');
let text = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

text = text.replace(/\{activeTab === 'sales' && \(\s*\/\* sales OR admin dashboard \*\/\s*<>/, "{activeTab === 'sales' && (\n /* sales OR admin dashboard */\n <div>");
text = text.replace(/<\/>\n\s*\)\}\n\n\s*\{\/\* EXPENSE HISTORY TAB MODULE \*\/\}/, "</div>\n        )}\n\n          {/* EXPENSE HISTORY TAB MODULE */}");

fs.writeFileSync('src/pages/SalesDashboard.tsx', text, 'utf8');
console.log('Replaced <> with <div>');
