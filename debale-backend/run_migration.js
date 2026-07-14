// Migration runner for Supabase
// Requires a SUPABASE_ACCESS_TOKEN (management token) from https://app.supabase.com/account/tokens
// Usage: SUPABASE_ACCESS_TOKEN=xxx node run_migration.js

const fs = require('fs');

const PROJECT_REF = 'kdogvssmlimarlunnjpr';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const sql = fs.readFileSync('migration_housemate.sql', 'utf8');

async function run() {
  if (ACCESS_TOKEN) {
    // Management API approach — uses Supabase Management API
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log('Migration complete via Management API');
    } else {
      const err = await res.json();
      console.error('Management API failed:', err);
      process.exit(1);
    }
  } else {
    console.log(`
No SUPABASE_ACCESS_TOKEN found.

Option 1: Run the SQL manually in the Supabase dashboard SQL editor:
  1. Go to https://app.supabase.com/project/${PROJECT_REF}/sql/new
  2. Copy the contents of migration_housemate.sql
  3. Paste and run

Option 2: Set SUPABASE_ACCESS_TOKEN and re-run:
  $env:SUPABASE_ACCESS_TOKEN="your_token_here"; node run_migration.js
  Get a token at https://app.supabase.com/account/tokens
`);
  }
}

run().catch(console.error);
