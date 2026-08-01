const fs = require('fs');

const code = fs.readFileSync('e:/CRM ERP ANTIGRAVITY/src/pages/SalesDashboard.tsx', 'utf8');
const lines = code.split('\n');

const stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Basic Regex for JSX tags. This is very rudimentary and won't handle all JSX cases, but should catch the main ones.
  // Let's use something simple for <> and </> and other main tags.
  // Actually, building a full JSX parser is hard. 
  // Let's just look at line 1630 and 1906.
}
