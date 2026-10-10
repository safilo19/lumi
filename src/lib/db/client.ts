import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Neon Postgres client. One shared pool per process, cached on globalThis so
// Next's dev HMR (which re-evaluates modules) doesn't leak a new pool each
// reload. App query traffic uses the POOLED connection (DATABASE_URL, the
// `-pooler` host) — PgBouncer transaction mode, which is fine for our one-shot
// queries and short BEGIN/COMMIT transactions. `pg` is auto-externalized from
// the server bundle by Next, so no next.config entry is needed.

const globalForPg = globalThis as unknown as { _lumiPgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg._lumiPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set — cannot connect to Postgres.");
    }
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    // On Vercel Fluid compute this drains the pool on instance suspend; it is a
    // harmless no-op elsewhere.
    try {
      attachDatabasePool(pool);
    } catch {
      // not on Vercel — ignore
    }
    globalForPg._lumiPgPool = pool;
  }
  return globalForPg._lumiPgPool;
}

/** Run a parameterized query against the shared pool. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never[]);
}

/**
 * Run `fn` inside a single checked-out client wrapped in BEGIN/COMMIT (ROLLBACK
 * on throw). Use for read-modify-write that must be atomic.
 */
export async function withTransaction<R>(
  fn: (client: import("pg").PoolClient) => Promise<R>,
): Promise<R> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
