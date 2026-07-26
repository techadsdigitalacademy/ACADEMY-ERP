const fs = require('fs');

let staff = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf8');

// 1. Imports
if (!staff.includes('StaffDrilldownModal')) {
  staff = staff.replace(
    /import \{ Card \} from '\.\.\/components\/Card';/,
    `import { Card } from '../components/Card';\nimport { StaffDrilldownModal } from '../components/StaffDrilldownModal';\nimport { NoticeBoardAdminModal } from '../components/NoticeBoardAdminModal';\nimport { Megaphone } from 'lucide-react';`
  );
}

// 2. States
if (!staff.includes('drilldownProfile')) {
  staff = staff.replace(
    /const \[isEditModalOpen, setIsEditModalOpen\] = useState\(false\);/,
    `const [drilldownProfile, setDrilldownProfile] = useState<StaffProfile | null>(null);\n  const [isNoticeBoardModalOpen, setIsNoticeBoardModalOpen] = useState(false);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);`
  );
}

// 3. Card click handler (Line 891 - 900 area, where openEditModal is called)
// The card is rendered as: <Card key={profile.id} variant="glass" className="p-5 border-white/5 relative group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => openEditModal(profile)}>
staff = staff.replace(
  /onClick=\{\(\) => openEditModal\(profile\)\}/g,
  `onClick={() => setDrilldownProfile(profile)}`
);

// 4. Header Button
// <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">{profiles.length} Staff Registry</span>
staff = staff.replace(
  /<span className="text-xs bg-slate-800 text-slate-400 px-2\.5 py-1 rounded-lg border border-slate-700 font-bold">\{profiles\.length\} Staff Registry<\/span>/,
  `<div className="flex items-center gap-3">
              <button 
                onClick={() => setIsNoticeBoardModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" /> Notice Board
              </button>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">{profiles.length} Staff Registry</span>
            </div>`
);

// 5. Render Modals at EOF (before final </div>)
// Find the last {isEditModalOpen && ...} block and insert ours after it
if (!staff.includes('<StaffDrilldownModal')) {
  staff = staff.replace(
    /      \{isEditModalOpen && editingProfile && \([\s\S]*?<\/div>\r?\n      \)\}\r?\n\r?\n    <\/div>\r?\n  \);\r?\n\};\r?\n\r?\nexport default StaffManagement;/m,
    match => match.replace(
      /    <\/div>\r?\n  \);\r?\n\};\r?\n\r?\nexport default StaffManagement;/m,
      `
      {drilldownProfile && (
        <StaffDrilldownModal
          profile={drilldownProfile}
          onClose={() => setDrilldownProfile(null)}
          onEdit={() => {
            setDrilldownProfile(null);
            openEditModal(drilldownProfile);
          }}
        />
      )}
      
      {isNoticeBoardModalOpen && (
        <NoticeBoardAdminModal
          onClose={() => setIsNoticeBoardModalOpen(false)}
          staffId={activeStaff?.id}
        />
      )}
    </div>
  );
};

export default StaffManagement;`
    )
  );
}

fs.writeFileSync('src/pages/StaffManagement.tsx', staff, 'utf8');
console.log('StaffManagement updated with Modals!');
