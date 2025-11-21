import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';

// Define the expected data structure for a single heart rate entry using Zod
const HeartRateDataSchema = z.object({
  bpm: z.number().int(),
  timestamp: z.string().datetime(), // ISO 8601 format
  username: z.string().min(1),
});

const HeartRatePayloadSchema = z.object({
  data: z.array(HeartRateDataSchema),
});

import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';

// Define the expected data structure for a single heart rate entry using Zod
const HeartRateDataSchema = z.object({
  bpm: z.number().int(),
  timestamp: z.string().datetime(), // ISO 8601 format
  username: z.string().min(1),
});

const HeartRatePayloadSchema = z.object({
  data: z.array(HeartRateDataSchema),
});

interface HeartRateEntry {
  bpm: number;
  timestamp: string;
  username: string;
}

export async function POST(request: Request) {
  const client = await db.connect();
  try {
    const json = await request.json();
    const parsedPayload = HeartRatePayloadSchema.safeParse(json);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsedPayload.error.errors },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Sort data by timestamp to ensure correct chronological processing
    const sortedData = parsedPayload.data.data.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let previousEntry: HeartRateEntry | null = null;
    const recordsToInsert: {
      username: string;
      bpm: number;
      timestamp: string;
      points: number;
    }[] = [];

    for (const currentEntry of sortedData) {
      let pointsToAssign = 0;
      const currentTimestamp = new Date(currentEntry.timestamp);

      if (previousEntry) {
        const previousTimestamp = new Date(previousEntry.timestamp);
        const timeDiffMilliseconds = currentTimestamp.getTime() - previousTimestamp.getTime();
        const timeDiffMinutes = timeDiffMilliseconds / (1000 * 60);

        if (timeDiffMinutes <= 1) {
          // If <= 1 minute apart, just assign points for the current BPM
          pointsToAssign = calculatePointsForBpm(currentEntry.bpm);
        } else {
          // If > 1 minute apart, interpolate BPMs and sum points
          const numberOfIntermediateMinutes = Math.floor(timeDiffMinutes); // Number of full minutes between
          
          // Points for the minute of the previous entry, assuming it covers the minute *before* the current interpolation
          // This ensures continuity. We'll add it to the 'current' record.
          
          // Interpolate BPM for each minute segment
          for (let i = 0; i < numberOfIntermediateMinutes; i++) {
              const fraction = (i + 1) / timeDiffMinutes;
              const interpolatedBpm = Math.round(
                  previousEntry.bpm + fraction * (currentEntry.bpm - previousEntry.bpm)
              );
              pointsToAssign += calculatePointsForBpm(interpolatedBpm);
          }
           // Add points for the current entry's BPM
          pointsToAssign += calculatePointsForBpm(currentEntry.bpm);
        }
      } else {
        // First entry, assign points for its BPM
        pointsToAssign = calculatePointsForBpm(currentEntry.bpm);
      }

      recordsToInsert.push({
        username: currentEntry.username,
        bpm: currentEntry.bpm,
        timestamp: currentEntry.timestamp,
        points: pointsToAssign,
      });

      previousEntry = currentEntry;
    }

    // Batch insert all generated data
    if (recordsToInsert.length > 0) {
      const insertPromises = recordsToInsert.map((entry) =>
        client.query(
          'INSERT INTO heart_rate_data (username, bpm, timestamp, points) VALUES ($1, $2, $3, $4)',
          [entry.username, entry.bpm, entry.timestamp, entry.points]
        )
      );
      await Promise.all(insertPromises);
    }

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Heart rate data saved successfully.', records_processed: recordsToInsert.length },
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