const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
  });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    const sql = fs.readFileSync('tutor_notices.sql', 'utf8');
    await client.query(sql);
    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

run();
