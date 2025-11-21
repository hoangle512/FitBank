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

        // Calculate points for the minute *after* previousEntry's timestamp up to currentEntry's timestamp
        // This includes the current entry's points in the sum.
        const startMinuteToProcess = new Date(previousTimestamp.getTime());
        // Move to the next full minute after previous entry's timestamp or keep it if it's already a full minute.
        startMinuteToProcess.setSeconds(0, 0);
        if (startMinuteToProcess.getTime() < previousTimestamp.getTime()) {
            startMinuteToProcess.setMinutes(startMinuteToProcess.getMinutes() + 1);
        }

        const endMinuteToProcess = new Date(currentTimestamp.getTime());
        endMinuteToProcess.setSeconds(0, 0);

        for (let timeIter = startMinuteToProcess.getTime(); timeIter <= currentTimestamp.getTime(); timeIter += (1000 * 60)) {
            // Ensure we don't go past the current timestamp's exact time if it's not a full minute mark
            const interpolationTargetTime = Math.min(timeIter, currentTimestamp.getTime());
            
            const minuteFraction = (interpolationTargetTime - previousTimestamp.getTime()) / timeDiffMilliseconds;
            
            // If previous and current timestamps are the same, this fraction will be 0/0, handle that.
            // Or if timeDiffMilliseconds is 0 (shouldn't happen with sortedData and distinct timestamps, but defensive)
            let interpolatedBpm: number;
            if (timeDiffMilliseconds === 0) {
                interpolatedBpm = previousEntry.bpm; // Or currentEntry.bpm, they should be the same
            } else {
                interpolatedBpm = Math.round(
                    previousEntry.bpm + minuteFraction * (currentEntry.bpm - previousEntry.bpm)
                );
            }
            pointsToAssign += calculatePointsForBpm(interpolatedBpm);
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