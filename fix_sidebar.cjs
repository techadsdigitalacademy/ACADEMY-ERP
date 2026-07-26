const fs = require('fs');

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Hide history for tutors
if (!sidebar.includes('{!isTutor && !isCounselor && (\\n            <button \\n              onClick={() => setActiveTab(\\'history\\')}')) {
  sidebar = sidebar.replace(
    /            <button \r?\n              onClick=\{\(\) => setActiveTab\('history'\)\}\r?\n              className=\{`flex items-center gap-3 w-full px-3\.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 \$\{activeTab === 'history' \? 'text-indigo-400 bg-indigo-500\/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800\/40'\}`\}\r?\n            >\r?\n              \{isCreativeRole \? \(\r?\n                <>\r?\n                  <Edit2 className="w-4\.5 h-4\.5" \/>\r?\n                  <span>Daily Reports<\/span>\r?\n                <\/>\r?\n              \) : \(\r?\n                <>\r?\n                  <DollarSign className="w-4\.5 h-4\.5" \/>\r?\n                  <span>\{\(isAdminView && !isOwner\) \? 'Staff History' : 'Sales History'\}<\/span>\r?\n                <\/>\r?\n              \)\}\r?\n            <\/button>/m,
    `            {!isTutor && !isCounselor && (
            <button 
              onClick={() => setActiveTab('history')}
              className={\`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 \${activeTab === 'history' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}\`}
            >
              {isCreativeRole ? (
                <>
                  <Edit2 className="w-4.5 h-4.5" />
                  <span>Daily Reports</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4.5 h-4.5" />
                  <span>{(isAdminView && !isOwner) ? 'Staff History' : 'Sales History'}</span>
                </>
              )}
            </button>
            )}`
  );
}

// Sidebar CSS Fix for profile block:
// In Sidebar.tsx, find the profile block at the bottom:
// <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl relative z-20 shrink-0">
// We need to add mt-auto to it.
sidebar = sidebar.replace(
  /<div className="p-4 border-t border-white\/5 bg-slate-900\/50 backdrop-blur-xl relative z-20 shrink-0">/g,
  `<div className="mt-auto p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl relative z-20 shrink-0">`
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log('Sidebar fixed');
