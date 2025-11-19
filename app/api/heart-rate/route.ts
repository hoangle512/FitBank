import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { calculatePointsForBpm } from '../../../lib/scoring';

// Define the expected data structure
type HeartRateData = {
  bpm: number;
  timestamp: string; // ISO 8601 format
  deviceId: string;
};

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const data: HeartRateData = await request.json();

    if (!data.bpm || !data.deviceId || !data.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: bpm, deviceId, or timestamp' },
        { status: 400 }
      );
    }

    const points = calculatePointsForBpm(data.bpm); // Assumes default age

    await client.query('BEGIN');

    // Find or create user
    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [data.deviceId]);
    if (userResult.rowCount === 0) {
      // For simplicity, using the deviceId as the initial display name
      await client.query('INSERT INTO users (id, display_name) VALUES ($1, $1)', [data.deviceId]);
    }

    // Insert heart rate data
    await client.query(
      'INSERT INTO heart_rate_data (user_id, bpm, timestamp, points) VALUES ($1, $2, $3, $4)',
      [data.deviceId, data.bpm, data.timestamp, points]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Heart rate data saved successfully.' },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}