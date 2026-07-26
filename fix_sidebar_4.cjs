const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Add flex-col and h-full to the aside
sidebar = sidebar.replace(
  /<aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block overflow-y-auto custom-scrollbar relative z-10">/,
  '<aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex md:flex-col h-full overflow-y-auto custom-scrollbar relative z-10">'
);

// We must also fix the wrapper div around the nav items so it flex-1s
sidebar = sidebar.replace(
  /<div className="p-4 pb-32">/,
  '<div className="p-4 flex-1 overflow-y-auto custom-scrollbar">'
);

// Fix the leads button condition
sidebar = sidebar.replace(
  /&& !isTutor && \(/g,
  '&& !isTutor && !isCounselor && ('
);

// Fix the daily reports log (Call logs) for Counselor
sidebar = sidebar.replace(
  /\{isAdminMode && !isOwner && \(/g,
  '{isAdminMode && !isOwner && !isCounselor && ('
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log('Sidebar patched!');
