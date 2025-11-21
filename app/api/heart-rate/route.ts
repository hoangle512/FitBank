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
      
                  // Always add points for the previous entry's BPM at its timestamp
                  pointsToAssign += calculatePointsForBpm(previousEntry.bpm);
      
                  // Calculate interpolated BPM and add points for each full minute interval between entries
                  let minuteIterator = new Date(previousTimestamp);
                  minuteIterator.setSeconds(0, 0);
                  minuteIterator.setMilliseconds(0);
      
                  // Move to the start of the next full minute after previousTimestamp
                  // If previousTimestamp was 10:00:30, minuteIterator becomes 10:01:00
                  // If previousTimestamp was 10:00:00, minuteIterator becomes 10:01:00
                  minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
      
                  const currentEntryMinuteStart = new Date(currentTimestamp);
                  currentEntryMinuteStart.setSeconds(0, 0);
                  currentEntryMinuteStart.setMilliseconds(0);
      
                  while (minuteIterator.getTime() < currentEntryMinuteStart.getTime()) {
                      // Calculate interpolation factor at the start of this minute (minuteIterator)
                      let interpolationFactor = 0;
                      if (timeDiffMilliseconds > 0) {
                          interpolationFactor = (minuteIterator.getTime() - previousTimestamp.getTime()) / timeDiffMilliseconds;
                      }
                      // Clamp factor to ensure it's between 0 and 1 (inclusive)
                      interpolationFactor = Math.max(0, Math.min(1, interpolationFactor));
      
                      const interpolatedBpm = Math.round(
                          previousEntry.bpm + interpolationFactor * (currentEntry.bpm - previousEntry.bpm)
                      );
                      pointsToAssign += calculatePointsForBpm(interpolatedBpm);
      
                      // Move to the next minute
                      minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
                  }
                  // Add points for the current entry's BPM
                  pointsToAssign += calculatePointsForBpm(currentEntry.bpm);
      
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