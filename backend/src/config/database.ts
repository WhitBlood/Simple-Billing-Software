import { Pool } from 'pg';
import { AppSecrets } from './types';

let pool: Pool | null = null;
let dbAvailable = false;

// SSL for the DB connection is controlled by the DB_SSL env var:
//   DB_SSL=false → no SSL   (in-cluster Postgres pod / local Postgres)
//   DB_SSL=true  → SSL      (AWS RDS)
//   not set      → SSL for any host except "localhost" (previous behaviour)
export function getSslConfig(host: string): { rejectUnauthorized: boolean } | undefined {
  const flag = (process.env.DB_SSL || '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  if (flag === 'true' || flag === '1') return { rejectUnauthorized: false };
  return host !== 'localhost' ? { rejectUnauthorized: false } : undefined;
}

export async function initDatabase(secrets: AppSecrets): Promise<boolean> {
  try {
    pool = new Pool({
      host: secrets.DB_HOST,
      port: secrets.DB_PORT,
      database: secrets.DB_NAME,
      user: secrets.DB_USER,
      password: secrets.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: getSslConfig(secrets.DB_HOST),
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbAvailable = true;
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.warn('⚠️  Database connection failed — running without DB');
    console.warn(`   Reason: ${(err as Error).message}`);
    pool = null;
    dbAvailable = false;
    return false;
  }
}

export function getPool(): Pool | null {
  return pool;
}

export function isDbAvailable(): boolean {
  return dbAvailable;
}

export async function query(text: string, params?: unknown[]) {
  if (!pool) throw new Error('Database not available');
  return pool.query(text, params);
}
