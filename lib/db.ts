import { createPool, sql } from '@vercel/postgres';

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const db = createPool({
  connectionString: POSTGRES_URL,
});

export { sql };
