const fs = require('fs');

let staff = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf8');

staff = staff.replace(
  /    <\/div>\r?\n  \);\r?\n\};\r?\n\r?\nexport default StaffManagement;/m,
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

fs.writeFileSync('src/pages/StaffManagement.tsx', staff, 'utf8');

let sdm = fs.readFileSync('src/components/StaffDrilldownModal.tsx', 'utf8');
sdm = sdm.replace(/Calendar, /, '').replace(/DollarSign, /, '');
// Wait, I need to check what the staff type is in src/types/index.ts
// It might just be 'Staff'
console.log('Fixed EOF of StaffManagement');
