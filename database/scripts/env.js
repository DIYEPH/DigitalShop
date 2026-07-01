const path = require('node:path');
const dotenv = require('dotenv');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PROJECT_ROOT, '..');

const ENV_PATHS = [
  path.join(PROJECT_ROOT, '.env'),
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'backend-bot', '.env'),
  path.join(REPO_ROOT, 'admin-backend', '.env'),
  path.join(REPO_ROOT, 'backend-web', '.env'),
];

function loadDatabaseEnv() {
  for (const envPath of ENV_PATHS) {
    dotenv.config({ path: envPath, override: false });
  }
}

function assertSafeEnvironment(scriptName) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_DB_SCRIPTS !== 'true') {
    throw new Error(`Refusing to run ${scriptName} in production without ALLOW_PROD_DB_SCRIPTS=true`);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
}

module.exports = {
  PROJECT_ROOT,
  REPO_ROOT,
  assertSafeEnvironment,
  loadDatabaseEnv,
};
