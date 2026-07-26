const fs = require('fs');
let dash = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

dash = dash.replace(
  /: 'text-slate-400 hover:text-white hover:bg-white\/5'\r?\n                  \{\/\* Filters & Quick Buttons \*\/\}/g,
  '                  {/* Filters & Quick Buttons */}'
);

if (!dash.includes('export default SalesDashboard;')) {
  dash += '\r\n};\r\n\r\nexport default SalesDashboard;';
}

fs.writeFileSync('src/pages/SalesDashboard.tsx', dash, 'utf8');
console.log('Fixed line 3576 and EOF');
