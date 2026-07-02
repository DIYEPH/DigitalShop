import { Pool } from 'pg';

let pool: Pool | null = null;

/** Process-wide pool for infrastructure that lives outside repositories (guards, credential lookups, runner manager). */
export function getSharedPgPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}
