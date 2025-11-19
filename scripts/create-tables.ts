import { sql } from '@vercel/postgres';

async function createTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS heart_rate_data (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        bpm INT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL
      );
    `;

    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();