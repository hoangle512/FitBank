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
    let recordsProcessed = 0; // Declare recordsProcessed here
    let existingEntriesCount = 0; // Declare for debugging
    let newRecordsToInsertCount = 0; // Declare for debugging
    const json = await request.json();
    const parsedPayload = HeartRatePayloadSchema.safeParse(json);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsedPayload.error.errors },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    // Temporarily clear previous heart rate data for Shaq for a clean test run


    // Fetch latest timestamps for all users in the payload
    const allUsernames = [...new Set(parsedPayload.data.data.map(d => d.username))];
    const latestTimestampsResult = await client.query(
      `SELECT username, MAX(timestamp) as latest_timestamp FROM heart_rate_data WHERE username = ANY($1::text[]) GROUP BY username`,
      [allUsernames]
    );
    const latestTimestampMap = new Map<string, Date>();
    latestTimestampsResult.rows.forEach(row => {
      latestTimestampMap.set(row.username, new Date(row.latest_timestamp));
    });
    existingEntriesCount = latestTimestampsResult.rows.length;

    // Filter out data that is not newer than the latest recorded timestamp
    const unsortedNewData = parsedPayload.data.data.filter(entry => {
      const latestDbTimestamp = latestTimestampMap.get(entry.username);
      if (!latestDbTimestamp) {
        return true; // No previous entry for this user, so it's new
      }
      return new Date(entry.timestamp).getTime() > latestDbTimestamp.getTime();
    });

    if (unsortedNewData.length === 0) {
      await client.query('COMMIT');
      return NextResponse.json(
        {
          message: 'No new heart rate data to process.',
          records_processed: 0,
        },
        { status: 200 }
      );
    }

    // Sort data by timestamp to ensure correct chronological processing
    const sortedData = unsortedNewData.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let previousEntry: HeartRateEntry | null = null;
    const allMinuteIntervalRecords: {
      username: string;
      bpm: number;
      timestamp: string;
      points: number;
    }[] = [];

    for (const currentEntry of sortedData) {
      const currentTimestamp = new Date(currentEntry.timestamp);
      
      if (previousEntry) {
        const safePreviousEntry = previousEntry; // Assign to a local const
        const previousTimestamp = new Date(safePreviousEntry.timestamp);
        const timeDiffMilliseconds = currentTimestamp.getTime() - previousTimestamp.getTime();

        // Calculate and add interpolated BPMs for each full minute interval between entries
        const minuteIterator = new Date(previousTimestamp);
        minuteIterator.setSeconds(0, 0);
        minuteIterator.setMilliseconds(0);

        // Move to the start of the next full minute after previousTimestamp
        minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);

        const currentEntryMinuteStart = new Date(currentTimestamp);
        currentEntryMinuteStart.setSeconds(0, 0);
        currentEntryMinuteStart.setMilliseconds(0);

        while (minuteIterator.getTime() < currentEntryMinuteStart.getTime()) {
          let interpolationFactor = 0;
          if (timeDiffMilliseconds > 0) {
            interpolationFactor = (minuteIterator.getTime() - previousTimestamp.getTime()) / timeDiffMilliseconds;
          }
          interpolationFactor = Math.max(0, Math.min(1, interpolationFactor));

          const interpolatedBpm = Math.round(
            safePreviousEntry.bpm + interpolationFactor * (currentEntry.bpm - safePreviousEntry.bpm)
          );
          allMinuteIntervalRecords.push({
            username: currentEntry.username,
            bpm: interpolatedBpm,
            timestamp: minuteIterator.toISOString(),
            points: calculatePointsForBpm(interpolatedBpm),
          });

          minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
        }
      }
      // Always add the current entry itself with its calculated points
      allMinuteIntervalRecords.push({
        username: currentEntry.username,
        bpm: currentEntry.bpm,
        timestamp: currentEntry.timestamp,
        points: calculatePointsForBpm(currentEntry.bpm),
      });

      previousEntry = currentEntry;
    }

    newRecordsToInsertCount = allMinuteIntervalRecords.length; // For debugging

    // Batch insert all new records
    if (allMinuteIntervalRecords.length > 0) {
      const insertPromises = allMinuteIntervalRecords.map((entry) =>
        client.query(
          'INSERT INTO heart_rate_data (username, bpm, timestamp, points) VALUES ($1, $2, $3, $4)',
          [entry.username, entry.bpm, entry.timestamp, entry.points]
        )
      );
      await Promise.all(insertPromises);
      recordsProcessed = allMinuteIntervalRecords.length;
    } else {
      recordsProcessed = 0;
    }

    await client.query('COMMIT');

          return NextResponse.json(
            {
              message: 'Heart rate data saved successfully.',
              records_processed: recordsProcessed,
              debug: {
                existingEntriesCount: existingEntriesCount,
                newRecordsToInsertCount: newRecordsToInsertCount,
              }
            },
            { status: 201 }
          );  } catch (error: unknown) {
    await client.query('ROLLBACK');
    console.error('Error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process request.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}