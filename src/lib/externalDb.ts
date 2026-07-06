import { Pool } from 'pg';

const connectionString = process.env.EXTERNAL_DATABASE_URL;

const globalForExternalDb = global as unknown as { externalPool?: Pool | null };

export const externalPool: Pool | null = connectionString
  ? globalForExternalDb.externalPool ||
    new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

if (connectionString && process.env.NODE_ENV !== 'production') {
  globalForExternalDb.externalPool = externalPool;
}
