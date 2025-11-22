import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Make sure this path is correct
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';

// Define the expected data structure
const HeartRateDataSchema = z.object({
  bpm: z.number().int(),
  timestamp: z.string().datetime(),
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
  const supabase = await createClient();

  try {
    const json = await request.json();
    const parsedPayload = HeartRatePayloadSchema.safeParse(json);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsedPayload.error.errors },
        { status: 400 }
      );
    }

    const incomingData = parsedPayload.data.data;
    const uniqueUsernames = [...new Set(incomingData.map((d) => d.username))];

    // 1. Fetch latest timestamps for these users from Supabase
    // We use a raw RPC call or a specific query to get max timestamp per user.
    // Since Supabase simple client doesn't do "GROUP BY" easily on SELECT, 
    // we will fetch the latest record for each user.
    
    const latestTimestampMap = new Map<string, number>();
    
    // Note: For efficiency in production, you might want a separate 'user_stats' table 
    // that tracks the last_sync_timestamp, but this works for now.
    const { data: existingLatest } = await supabase
      .from('heart_rate_data')
      .select('username, timestamp')
      .in('username', uniqueUsernames)
      .order('timestamp', { ascending: false });

    // Process the list to find the absolute latest per user (since the query returns all rows)
    // A better way in raw SQL is simpler, but with JS client:
    if (existingLatest) {
      for (const row of existingLatest) {
        if (!latestTimestampMap.has(row.username)) {
          latestTimestampMap.set(row.username, new Date(row.timestamp).getTime());
        }
      }
    }

    // 2. Filter out data that is already in the DB
    const newRecordsToProcess = incomingData.filter((entry) => {
      const latestTime = latestTimestampMap.get(entry.username);
      if (!latestTime) return true; // New user
      return new Date(entry.timestamp).getTime() > latestTime;
    });

    if (newRecordsToProcess.length === 0) {
      return NextResponse.json({ message: 'No new data to process', records_processed: 0 });
    }

    // 3. CRITICAL FIX: Group data by User BEFORE interpolating
    const recordsByUser: Record<string, HeartRateEntry[]> = {};
    
    newRecordsToProcess.forEach((record) => {
      if (!recordsByUser[record.username]) recordsByUser[record.username] = [];
      recordsByUser[record.username].push(record);
    });

    const finalInsertPayload: any[] = [];

    // 4. Process each user separately
    for (const username of Object.keys(recordsByUser)) {
      // Sort this specific user's data chronologically
      const userEntries = recordsByUser[username].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let previousEntry: HeartRateEntry | null = null;

      for (const currentEntry of userEntries) {
        const currentTimestamp = new Date(currentEntry.timestamp);

        if (previousEntry) {
          const prevTimestamp = new Date(previousEntry.timestamp);
          const timeDiff = currentTimestamp.getTime() - prevTimestamp.getTime();

          // Interpolation Logic
          const minuteIterator = new Date(prevTimestamp);
          minuteIterator.setSeconds(0, 0);
          minuteIterator.setMinutes(minuteIterator.getMinutes() + 1); // Move to next full minute

          const currentMinuteStart = new Date(currentTimestamp);
          currentMinuteStart.setSeconds(0, 0);

          while (minuteIterator.getTime() < currentMinuteStart.getTime()) {
            let factor = 0;
            if (timeDiff > 0) {
              factor = (minuteIterator.getTime() - prevTimestamp.getTime()) / timeDiff;
            }
            const interpolatedBpm = Math.round(
              previousEntry.bpm + factor * (currentEntry.bpm - previousEntry.bpm)
            );

            finalInsertPayload.push({
              username: username,
              bpm: interpolatedBpm,
              timestamp: minuteIterator.toISOString(),
              points: calculatePointsForBpm(interpolatedBpm),
            });

            minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
          }
        }

        // Add the actual current entry
        finalInsertPayload.push({
          username: username,
          bpm: currentEntry.bpm,
          timestamp: currentEntry.timestamp,
          points: calculatePointsForBpm(currentEntry.bpm),
        });

        previousEntry = currentEntry;
      }
    }

    // 5. Bulk Insert into Supabase
    if (finalInsertPayload.length > 0) {
      const { error } = await supabase
        .from('heart_rate_data')
        .insert(finalInsertPayload);

      if (error) throw error;
    }

    return NextResponse.json(
      {
        message: 'Heart rate data saved successfully.',
        records_processed: finalInsertPayload.length,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}