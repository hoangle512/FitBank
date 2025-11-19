import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calculatePointsForBpm } from '../../../lib/scoring';

// Define the expected data structure
type HeartRateData = {
  bpm: number;
  timestamp: string; // ISO 8601 format
  deviceId: string;
};

export async function POST(request: Request) {
  try {
    const data: HeartRateData = await request.json();

    if (!data.bpm || !data.deviceId || !data.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: bpm, deviceId, or timestamp' },
        { status: 400 }
      );
    }

    const points = calculatePointsForBpm(data.bpm); // Assumes default age

    // Using a transaction to ensure both queries succeed or fail together
    const result = await sql.transaction(async (sql) => {
      const userResult = await sql`SELECT id FROM users WHERE id = ${data.deviceId}`;
      if (userResult.rowCount === 0) {
        await sql`INSERT INTO users (id, display_name) VALUES (${data.deviceId}, ${data.deviceId})`;
      }
      await sql`
        INSERT INTO heart_rate_data (user_id, bpm, timestamp, points)
        VALUES (${data.deviceId}, ${data.bpm}, ${data.timestamp}, ${points})
      `;
      return true;
    });


    return NextResponse.json(
      { message: 'Heart rate data saved successfully.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    );
  }
}
