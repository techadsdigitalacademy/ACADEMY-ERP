const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const run = async () => {
  const envFile = fs.readFileSync('.env', 'utf8');
  let supabaseUrl = '';
  let supabaseKey = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_SERVICE_KEY=')) supabaseKey = line.split('=')[1].trim();
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { data: profiles } = await supabaseAdmin.from('staff_profiles').select('*');
  
  for (const profile of profiles) {
    if (!profile.auth_user_id) {
      console.log(`Fixing auth for ${profile.username} with password ${profile.password}`);
      const cleanUsername = profile.username.trim().toLowerCase().replace(/\s+/g, '');
      const email = `${cleanUsername}@agency.com`;
      let pass = profile.password;
      if (pass.length < 6) {
        pass = pass.padEnd(6, '0');
        console.log(`Padded password to ${pass}`);
      }
      
      let authUserId = null;
      
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true
      });
      
      if (authErr) {
        if (authErr.message.includes('already been registered')) {
          // Fetch user id
          const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = users.users.find(u => u.email === email);
          if (existingUser) {
            authUserId = existingUser.id;
            await supabaseAdmin.auth.admin.updateUserById(authUserId, { password: pass });
            console.log(`Updated existing auth user for ${email}`);
          }
        } else {
          console.error(`Failed to create auth for ${profile.username}:`, authErr.message);
        }
      } else if (authUser?.user) {
        authUserId = authUser.user.id;
      }
      
      if (authUserId) {
        await supabaseAdmin.from('staff_profiles').update({ 
          auth_user_id: authUserId,
          password: pass,
          username: cleanUsername
        }).eq('id', profile.id);
        console.log(`Successfully linked auth for ${cleanUsername}`);
      }
    }
  }
};

run();
