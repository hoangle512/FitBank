import { db } from '../lib/db';
import { sql } from '@vercel/postgres';

async function alterTables() {
  const client = await db.connect();

  try {
    await client.query(sql`
      ALTER TABLE heart_rate_data
      ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;
    `);

    console.log('Tables altered successfully.');
  } catch (error) {
    console.error('Error altering tables:', error);
  } finally {
    client.release();
  }
}

alterTables();
