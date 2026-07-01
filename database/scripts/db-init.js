const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { PROJECT_ROOT, assertSafeEnvironment, loadDatabaseEnv } = require('./env');

const MIGRATIONS_DIR = path.resolve(PROJECT_ROOT, 'migrations');

function checksumSql(sql) {
  let hash = 0;
  for (let i = 0; i < sql.length; i += 1) {
    hash = (hash * 31 + sql.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort((a, b) => a.localeCompare(b));
}

async function markBaselineMigrationsApplied(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of listMigrationFiles()) {
    const version = file.slice(0, 4);
    const name = file.slice(5, -4);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query(
      `INSERT INTO schema_migrations (version, name, checksum)
       VALUES ($1, $2, $3)
       ON CONFLICT (version) DO NOTHING`,
      [version, name, checksumSql(sql)],
    );
  }
}

async function main() {
  loadDatabaseEnv();
  assertSafeEnvironment('database init');

  const shouldReset = process.argv.includes('--reset');
  const initSqlPath = path.resolve(PROJECT_ROOT, 'init.sql');
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

    console.log(`Applying ${path.relative(PROJECT_ROOT, initSqlPath)}...`);
    await client.query(initSql);
    await markBaselineMigrationsApplied(client);
    console.log(shouldReset ? 'Database reset complete.' : 'Database init complete.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
