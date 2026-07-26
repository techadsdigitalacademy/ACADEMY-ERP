const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\SHIBILI\\.gemini\\antigravity\\brain\\c9248528-08c5-4f71-9768-30bf574affc7\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bestContent = '';
  let bestLength = 0;

  for await (const line of rl) {
    if (line.includes('export const SalesDashboard')) {
      try {
        const obj = JSON.parse(line);
        let text = '';
        if (obj.content) text += obj.content;
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if (tc.function && tc.function.arguments) text += tc.function.arguments;
          });
        }
        
        // Try to find the code block
        const match = text.match(/import React.*?export default SalesDashboard;/s);
        if (match && match[0].length > bestLength) {
           if (!match[0].includes('TutorDashboard') && !match[0].includes('CounselorDashboard')) {
              bestContent = match[0];
              bestLength = match[0].length;
           }
        }
        
      } catch (e) {}
    }
  }

  if (bestContent) {
    fs.writeFileSync('src/pages/SalesDashboard.tsx', bestContent, 'utf8');
    console.log('Restored SalesDashboard from transcript! Length:', bestLength);
  } else {
    console.log('Not found in transcript.');
  }
}
extract();
