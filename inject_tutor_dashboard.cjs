const fs = require('fs');

let sd = fs.readFileSync('src/pages/SalesDashboard.tsx', 'utf8');

if (!sd.includes('import { TutorDashboard }')) {
  sd = sd.replace(
    /import \{ TutorNoticeBoard \} from '\.\.\/components\/TutorNoticeBoard';/,
    `import { TutorNoticeBoard } from '../components/TutorNoticeBoard';\nimport { TutorDashboard } from '../components/TutorDashboard';`
  );
}

// Replace the entire isTutor block
// The block looks like:
//                   {isTutor && (
//                     <div className="mt-8 space-y-10">
//                       <TutorNoticeBoard />
//                       <div className="space-y-6">
//                         <div className="flex items-center gap-3">
//                           <GraduationCap className="w-6 h-6 text-indigo-400" />
//                           <h3 className="text-lg font-bold text-white">Assigned Batches (Overview)</h3>
//                         </div>
//                         <Card variant="glass" className="p-6 border-white/5">
//                           <p className="text-slate-400 text-sm">Please navigate to <strong>Student Attendance</strong> in the sidebar to mark daily attendance and manage your assigned students.</p>
//                         </Card>
//                       </div>
//                     </div>
//                   )}

sd = sd.replace(
  /                  \{isTutor && \(\r?\n                    <div className="mt-8 space-y-10">\r?\n                      <TutorNoticeBoard \/>\r?\n                      <div className="space-y-6">\r?\n                        <div className="flex items-center gap-3">\r?\n                          <GraduationCap className="w-6 h-6 text-indigo-400" \/>\r?\n                          <h3 className="text-lg font-bold text-white">Assigned Batches \(Overview\)<\/h3>\r?\n                        <\/div>\r?\n                        <Card variant="glass" className="p-6 border-white\/5">\r?\n                          <p className="text-slate-400 text-sm">Please navigate to <strong>Student Attendance<\/strong> in the sidebar to mark daily attendance and manage your assigned students\.<\/p>\r?\n                        <\/Card>\r?\n                      <\/div>\r?\n                    <\/div>\r?\n                  \)\}/m,
  `                  {isTutor && (
                    <TutorDashboard activeStaff={activeStaff} />
                  )}`
);

fs.writeFileSync('src/pages/SalesDashboard.tsx', sd, 'utf8');
console.log('Injected TutorDashboard');
