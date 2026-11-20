import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const configuredMax = Number(process.env.SQL_POOL_MAX);
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      statement_timeout: 25_000,
      allowExitOnIdle: true,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (global._postgresPool) {
    const activePool = global._postgresPool;
    global._postgresPool = undefined;
    await activePool.end().catch((err) => {
      console.error('Error closing SQL pool:', err);
    });
  }
}
