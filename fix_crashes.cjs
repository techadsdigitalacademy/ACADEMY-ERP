const fs = require('fs');

const filesToFix = [
  'src/components/TutorDashboard.tsx',
  'src/components/CounselorDashboard.tsx',
  'src/components/BatchStudentsView.tsx',
  'src/components/BatchFinancesView.tsx',
  'src/pages/AcademyDashboard.tsx',
  'src/pages/SalesDashboard.tsx'
];

for (const file of filesToFix) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix 'Active' status to 'Ongoing' for batches
  content = content.replace(/b\.status === 'Active'/g, "b.status === 'Ongoing'");
  
  // Safely map and filter for batches, students, installments, activeBatches, upcomingBatches, etc.
  content = content.replace(/batches\.map\(/g, "batches?.map(");
  content = content.replace(/batches\.filter\(/g, "batches?.filter(");
  content = content.replace(/students\.filter\(/g, "students?.filter(");
  content = content.replace(/students\.map\(/g, "students?.map(");
  content = content.replace(/installments\.filter\(/g, "installments?.filter(");
  content = content.replace(/batchStudents\.map\(/g, "batchStudents?.map(");
  content = content.replace(/activeBatches\.map\(/g, "activeBatches?.map(");
  content = content.replace(/upcomingBatches\.map\(/g, "upcomingBatches?.map(");

  // Fix b.tutor crashes in AcademyDashboard.tsx
  if (file.includes('AcademyDashboard.tsx')) {
    content = content.replace(/b\.tutor \? b\.tutor\.full_name/g, "b.tutor ? (b.tutor as any).full_name");
  }

  // Also in TutorDashboard fetch logic, it fetches where status='Active', it should be 'Ongoing' for students?
  // Wait, student status is 'Active'. Batch status is 'Ongoing'.
  if (file.includes('TutorDashboard.tsx')) {
     // I already replaced b.status === 'Active' to 'Ongoing'.
     // For students, the query says: .eq('status', 'Active'). This is correct for students.
  }

  fs.writeFileSync(file, content, 'utf8');
}

console.log('Fixed undefined mapping and batch statuses across all components');
