const { Client } = require('pg');
require('dotenv').config();

const PROJECT_REF = 'kdogvssmlimarlunnjpr';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function run() {
  const sql = `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS rooms_used INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS applies_used INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS groups_used INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS group_applies_used INTEGER DEFAULT 0;
  `;

  // Try direct connection first, fallback to pooler
  for (const host of [
    `db.${PROJECT_REF}.supabase.co`,
  ]) {
    for (const port of [5432, 6543]) {
      try {
        const client = new Client({
          host,
          port,
          database: 'postgres',
          user: 'postgres',
          password: SERVICE_KEY,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });
        await client.connect();
        console.log(`Connected to ${host}:${port}`);
        await client.query(sql);
        console.log('Migration ran successfully');
        await client.end();
        process.exit(0);
      } catch (e) {
        console.log(`${host}:${port} failed — ${e.message}`);
      }
    }
  }

  // Try pooler format
  for (const host of [
    `aws-0-eu-west-1.pooler.supabase.com`,
    `aws-0-eu-west-2.pooler.supabase.com`,
    `aws-0-us-east-1.pooler.supabase.com`,
  ]) {
    for (const port of [5432, 6543]) {
      try {
        const client = new Client({
          host,
          port,
          database: 'postgres',
          user: `postgres.${PROJECT_REF}`,
          password: SERVICE_KEY,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });
        await client.connect();
        console.log(`Connected via pooler ${host}:${port}`);
        await client.query(sql);
        console.log('Migration ran successfully');
        await client.end();
        process.exit(0);
      } catch (e) {
        console.log(`Pooler ${host}:${port} failed — ${e.message}`);
      }
    }
  }

  console.log('All connection attempts failed');
  process.exit(1);
}

run();
