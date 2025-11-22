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
        username VARCHAR(255),
        bpm INT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        points INT NOT NULL DEFAULT 0
      );
    `;

    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

createTables();