import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';

// Define the expected data structure using Zod
const HeartRateDataSchema = z.object({
  bpm: z.number().int().positive(),
  timestamp: z.string().datetime(), // ISO 8601 format
  username: z.string().min(1),
});

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const json = await request.json();
    const data = HeartRateDataSchema.safeParse(json);

    if (!data.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: data.error.errors },
        { status: 400 }
      );
    }

    const { bpm, username, timestamp } = data.data;

    const points = calculatePointsForBpm(bpm); // Assumes default age

    await client.query('BEGIN');

    // Insert heart rate data
    await client.query(
      'INSERT INTO heart_rate_data (username, bpm, timestamp, points) VALUES ($1, $2, $3, $4)',
      [username, bpm, timestamp, points]
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