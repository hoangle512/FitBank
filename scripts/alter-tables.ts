import { sql } from '@vercel/postgres';

async function alterTables() {
  try {
    await sql`
      ALTER TABLE heart_rate_data
      DROP COLUMN IF EXISTS user_id;
    `;

    await sql`
      ALTER TABLE heart_rate_data
      ADD COLUMN IF NOT EXISTS username VARCHAR(255);
    `;

    await sql`
      ALTER TABLE heart_rate_data
      ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;
    `;

    console.log('Tables altered successfully.');
  } catch (error) {
    console.error('Error altering tables:', error);
  }
}

alterTables();