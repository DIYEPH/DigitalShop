import { Pool } from "pg";

let pool: Pool | null = null;

/** Shared pg pool (same pattern as backend-nestjs repositories). */
export function getPgPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}
