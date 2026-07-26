const fs = require('fs');

let staff = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf8');

// 1. Clean username for email
staff = staff.replace(
  /const email = \`\$\{username\.trim\(\)\}\@agency\.com\`;/,
  `const cleanUsername = username.trim().toLowerCase().replace(/\\s+/g, "");
        const email = \`\${cleanUsername}@agency.com\`;`
);

// 2. Pad password for Supabase Auth 
staff = staff.replace(
  /let createdAuthUserId: string \| null = null;/,
  `let createdAuthUserId: string | null = null;
      let finalPassword = password;
      if (finalPassword.length < 6) {
        finalPassword = finalPassword.padEnd(6, "0");
      }`
);

// Replace password reference in supabaseAdmin.auth.admin.createUser and insert statement
// Wait, the regex `/password: password,/g` might replace too much, or not match if spaces are different.
staff = staff.replace(/password: password,/g, 'password: finalPassword,');

// 3. Edit password padding
staff = staff.replace(
  /\{ password: newPassword\.trim\(\) \}/g,
  `newPassword.trim().length < 6 ? { password: newPassword.trim().padEnd(6, "0") } : { password: newPassword.trim() }`
);

fs.writeFileSync('src/pages/StaffManagement.tsx', staff, 'utf8');
console.log('Fixed StaffManagement auth bugs');
