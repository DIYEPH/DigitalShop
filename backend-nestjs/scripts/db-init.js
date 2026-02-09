const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_DB_SCRIPTS !== 'true') {
    throw new Error('Refusing to run DB init in production without ALLOW_PROD_DB_SCRIPTS=true');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
}

async function main() {
  assertSafeEnvironment();

  const shouldReset = process.argv.includes('--reset');
  const initSqlPath = path.resolve(__dirname, '../init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    if (shouldReset) {
      console.log('Resetting public schema...');
      await client.query('DROP SCHEMA IF EXISTS public CASCADE');
      await client.query('CREATE SCHEMA public');
      await client.query('GRANT ALL ON SCHEMA public TO public');
    }

    console.log(`Applying ${path.basename(initSqlPath)}...`);
    await client.query(initSql);
    console.log(shouldReset ? 'Database reset complete.' : 'Database init complete.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
