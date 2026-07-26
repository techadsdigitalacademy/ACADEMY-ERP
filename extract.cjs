const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:\\Users\\SHIBILI\\.gemini\\antigravity\\brain\\c9248528-08c5-4f71-9768-30bf574affc7\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let bestContent = null;

  for await (const line of rl) {
    if (line.includes('import React')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.function && tc.function.arguments) {
              const args = JSON.parse(tc.function.arguments);
              
              if (args.CodeContent && args.TargetFile && args.TargetFile.includes('SalesDashboard.tsx')) {
                 if (!args.CodeContent.includes('TutorDashboard')) {
                    bestContent = args.CodeContent;
                 }
              }
            }
          }
        }
      } catch (e) {}
    }
  }

  if (bestContent) {
    fs.writeFileSync('src/pages/SalesDashboard.tsx', bestContent, 'utf8');
    console.log('Restored SalesDashboard from transcript.');
  } else {
    console.log('SalesDashboard not found in transcript.');
  }
}
extract();
