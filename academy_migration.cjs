const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const connectionString = 'postgresql://postgres:Techadsdigital098@@db.oxlcmtytydtudsdjsixh.supabase.co:5432/postgres';

const supabaseUrl = 'https://oxlcmtytydtudsdjsixh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bGNtdHl0eWR0dWRzZGpzaXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkyNjI2MSwiZXhwIjoyMDk4NTAyMjYxfQ.7eUOKeCNgj0jqrVOYGldSCxQEZUl64mzHz-TlkoneB4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to DB.');
    
    // 1. Add transaction_slip_url to academy_installments
    await client.query(`
      ALTER TABLE academy_installments
      ADD COLUMN IF NOT EXISTS transaction_slip_url TEXT;
    `);
    console.log('Added transaction_slip_url column.');

    // 3. Create storage bucket for academy_slips
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) throw bucketError;
    
    if (!buckets.some(b => b.name === 'academy_slips')) {
      const { error: createError } = await supabase.storage.createBucket('academy_slips', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
      });
      if (createError) throw createError;
      console.log('Created academy_slips bucket.');
    } else {
      console.log('Bucket academy_slips already exists.');
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
