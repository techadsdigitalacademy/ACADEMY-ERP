const fs = require('fs');
let lines = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8').split('\n');

const fixedLines = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('className="w-full max-h-[85vh] object-contain rounded-xl"')) {
    fixedLines.push(lines[i]);
    fixedLines.push('            />');
    fixedLines.push('          </div>');
    fixedLines.push('        </div>');
    fixedLines.push('      )}');
    fixedLines.push('      </main>');
    fixedLines.push('    </div>');
    fixedLines.push('  );');
    fixedLines.push('};');
    fixedLines.push('');
    fixedLines.push('export default SalesDashboard;');
    break;
  }
  fixedLines.push(lines[i]);
}

fs.writeFileSync('src/pages/SalesDashboard.tsx', fixedLines.join('\n'), 'utf8');
console.log('Fixed EOF');
