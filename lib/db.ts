import { sql } from '@vercel/postgres';

// This file is now a re-exporter for the `sql` tag from @vercel/postgres.
// All database access should go through this `sql` tag.

export { sql };