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
      const email = `${profile.username.trim().toLowerCase()}@agency.com`;
      let pass = profile.password;
      if (pass.length < 6) {
        pass = pass.padEnd(6, '0');
        console.log(`Padded password to ${pass}`);
      }
      
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true
      });
      
      if (authErr) {
        console.error(`Failed to create auth for ${profile.username}:`, authErr.message);
      } else if (authUser?.user) {
        await supabaseAdmin.from('staff_profiles').update({ 
          auth_user_id: authUser.user.id,
          password: pass 
        }).eq('id', profile.id);
        console.log(`Successfully linked auth for ${profile.username}`);
      }
    }
  }
};

run();
