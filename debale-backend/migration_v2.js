require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sql = `
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 2;
ALTER TABLE housemate_groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);
CREATE TABLE IF NOT EXISTS housemate_group_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES housemate_groups(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, requester_id)
);
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('RPC error:', error.message);
    // Fallback: try direct SQL endpoint
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    console.log('RESULT:', text);
  } else {
    console.log('Migration ok:', data);
  }
}
run().catch(console.error);
