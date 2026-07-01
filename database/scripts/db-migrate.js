const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { PROJECT_ROOT, assertSafeEnvironment, loadDatabaseEnv } = require('./env');

const MIGRATIONS_DIR = path.resolve(PROJECT_ROOT, 'migrations');

function listMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort((a, b) => a.localeCompare(b));
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function checksumSql(sql) {
  let hash = 0;
  for (let i = 0; i < sql.length; i += 1) {
    hash = (hash * 31 + sql.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

async function readAppliedMigrations(client) {
  const result = await client.query('SELECT version, checksum FROM schema_migrations ORDER BY version ASC');
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

async function printStatus(client, files) {
  const applied = await readAppliedMigrations(client);
  for (const file of files) {
    const version = file.slice(0, 4);
    const status = applied.has(version) ? 'applied' : 'pending';
    console.log(`${version} ${status} ${file}`);
  }
}

async function applyMigration(client, file) {
  const version = file.slice(0, 4);
  const name = file.slice(5, -4);
  const sqlPath = path.join(MIGRATIONS_DIR, file);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const checksum = checksumSql(sql);

  console.log(`Applying migration ${file}...`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (version, name, checksum)
       VALUES ($1, $2, $3)`,
      [version, name, checksum],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  loadDatabaseEnv();
  assertSafeEnvironment('database migrations');

  const showStatus = process.argv.includes('--status');
  const files = listMigrationFiles();
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await ensureMigrationTable(client);
    if (showStatus) {
      await printStatus(client, files);
      return;
    }

    const applied = await readAppliedMigrations(client);
    for (const file of files) {
      const version = file.slice(0, 4);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = checksumSql(sql);
      const appliedChecksum = applied.get(version);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(`Migration ${file} checksum changed after it was applied.`);
        }
        continue;
      }

      await applyMigration(client, file);
    }
    console.log('Database migrations complete.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
