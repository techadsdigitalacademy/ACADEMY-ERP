const fs = require('fs');

let types = fs.readFileSync('src/types/index.ts', 'utf8');
if (!types.includes('StaffProfile')) {
  types += `\n\nexport interface StaffProfile {
  id: string;
  auth_user_id?: string;
  avatar_url?: string;
  full_name: string;
  designation: string;
  username: string;
  gender: string;
  shift_start_time: string;
  shift_end_time: string;
  weekly_off_day: string;
  created_at: string;
  base_salary?: number;
}\n`;
  fs.writeFileSync('src/types/index.ts', types, 'utf8');
}

let sdm = fs.readFileSync('src/components/StaffDrilldownModal.tsx', 'utf8');
sdm = sdm.replace(/Calendar, /, '').replace(/DollarSign, /, '');
fs.writeFileSync('src/components/StaffDrilldownModal.tsx', sdm, 'utf8');

let staff = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf8');
// Fix the EOF injection
if (staff.includes('<nav className="md:hidden')) {
  staff = staff.replace(
    /      <nav className="md:hidden/g,
    `      {drilldownProfile && (
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
      <nav className="md:hidden`
  );
} else {
  // Try finding the last div before export default
  staff = staff.replace(
    /    <\/div>\r?\n  \);\r?\n\};\r?\n\r?\nexport default StaffManagement;/g,
    `      {drilldownProfile && (
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
  );
}
fs.writeFileSync('src/pages/StaffManagement.tsx', staff, 'utf8');
console.log('Fixed StaffManagement issues');
