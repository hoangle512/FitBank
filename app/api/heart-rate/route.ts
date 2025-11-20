import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';

// Define the expected data structure for a single heart rate entry using Zod
const HeartRateDataSchema = z.object({
  bpm: z.number().int().positive(),
  timestamp: z.string().datetime(), // ISO 8601 format
  username: z.string().min(1),
});

// Define the schema for an array of heart rate entries
const HeartRateDataArraySchema = z.array(HeartRateDataSchema);

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const json = await request.json();
    // Check if the incoming data is an array, if not, wrap it in an array
    const dataArray = Array.isArray(json) ? json : [json];
    const data = HeartRateDataArraySchema.safeParse(dataArray);

    if (!data.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: data.error.errors },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    for (const entry of data.data) {
      const { bpm, username, timestamp } = entry;
      const points = calculatePointsForBpm(bpm); // Assumes default age

      // Insert heart rate data
      await client.query(
        'INSERT INTO heart_rate_data (username, bpm, timestamp, points) VALUES ($1, $2, $3, $4)',
        [username, bpm, timestamp, points]
      );
    }

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