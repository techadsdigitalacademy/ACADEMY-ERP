const fs = require('fs');
const { Client } = require('pg');

const runMigration = async () => {
  const envFile = fs.readFileSync('.env', 'utf8');
  let supabaseUrl = '';
  let dbPassword = '';
  
  envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace('https://', '').split('.')[0];
    if (line.startsWith('DB_PASSWORD=')) dbPassword = line.substring(line.indexOf('=') + 1).trim();
  });
  
  if (!supabaseUrl || !dbPassword) {
    console.error('Missing env vars');
    return;
  }
  
  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${supabaseUrl}.supabase.co:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS tutor_notices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID REFERENCES staff_profiles(id)
      );

      ALTER TABLE tutor_notices ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Public access to tutor notices" ON tutor_notices;
      CREATE POLICY "Public access to tutor notices" ON tutor_notices FOR ALL USING (true) WITH CHECK (true);
    `);

    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
};

runMigration();
