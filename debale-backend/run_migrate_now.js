require('dotenv').config();
const fs = require('fs');

const sql = [
  "ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS name TEXT;",
  "ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 2;",
  "ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);",
  "CREATE TABLE IF NOT EXISTS housemate_group_requests (",
  "  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),",
  "  group_id UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,",
  "  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,",
  "  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),",
  "  created_at TIMESTAMPTZ DEFAULT NOW(),",
  "  UNIQUE(group_id, requester_id)",
  ");",
].join('\n');

async function run() {
  // Try via REST API with Prefer header
  console.log('Attempting migration via REST API...');
  try {
    const res = await fetch(process.env.SUPABASE_URL + '/rest/v1/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    console.log('Status:', res.status, 'Response:', text.substring(0, 500));
    if (res.ok) {
      console.log('Migration succeeded via REST API!');
      return;
    }
  } catch (e) { console.log('REST API failed:', e.message); }

  // Try via auth admin API
  console.log('\nTrying auth admin API...');
  try {
    // Try signing in as admin to get elevated access
    const res = await fetch(process.env.SUPABASE_URL + '/auth/v1/admin/sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    console.log('Status:', res.status, 'Response:', text.substring(0, 500));
  } catch (e) { console.log('Auth admin API failed:', e.message); }

  console.log('\nNone of the automatic methods worked.');
  console.log('Please run the SQL manually in Supabase dashboard SQL editor.');
  console.log('SQL is in: migration_housemate.sql');
}
run();
