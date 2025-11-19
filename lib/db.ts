import { createPool } from '@vercel/postgres';

// IMPORTANT: Replace with your Vercel Postgres connection string
// You can get this from your Vercel project settings.
// It should look like: postgres://...
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const db = createPool({
  connectionString: POSTGRES_URL,
});
