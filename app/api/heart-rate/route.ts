import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Define the expected data structure for a single entry
const HeartRateDataSchema = z.object({
  bpm: z.number().int(),
  timestamp: z.string().datetime({ offset: true }),
  username: z.string().min(1),
});

// The payload now expects a 'data' field that is a string (NDJSON)
const HeartRatePayloadSchema = z.object({
  data: z.string(),
});

interface HeartRateEntry {
  bpm: number;
  timestamp: string;
  username: string;
}

interface InsertPayload {
  username: string;
  bpm: number;
  timestamp: string;
  points: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const json = await request.json();
    const parsedPayload = HeartRatePayloadSchema.safeParse(json);

    if (!parsedPayload.success) {
      const validationError = fromZodError(parsedPayload.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

      // Original logic for processing NDJSON
      const incomingDataStrings = parsedPayload.data.data.trim().split('\n').filter(s => s !== '');
    
          const incomingData: HeartRateEntry[] = [];
          for (const str of incomingDataStrings) {
            try {
              const entryJson = JSON.parse(str);
              const validatedEntry = HeartRateDataSchema.parse(entryJson);
              incomingData.push(validatedEntry);
            } catch (e) {
              console.warn('Skipping invalid heart rate data entry:', str, e);
              return NextResponse.json(
                { 
                  error: 'Error processing heart rate data', 
                  details: `JSON parse failed for entry: ${e instanceof Error ? e.message : 'Unknown error'}`,
                  problematic_string: str 
                },
                { status: 500 }
              );
            }
          }
    if (incomingData.length === 0) {
      return NextResponse.json({ message: 'No valid data to process', records_processed: 0 });
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value, key');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      // Fallback to default values if settings can't be fetched
    }

    const settings = settingsData?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>) || {};

    const z1 = parseInt(settings.z1 || "125", 10);
    const z2 = parseInt(settings.z2 || "150", 10);
    const z3 = parseInt(settings.z3 || "165", 10);
    const uniqueUsernames = [...new Set(incomingData.map((d) => d.username))];

    // 1. Fetch latest timestamps for these users from Supabase
    const latestTimestampMap = new Map<string, number>();
    
    const { data: existingLatest } = await supabase
      .from('heart_rate_data')
      .select('username, timestamp')
      .in('username', uniqueUsernames)
      .order('timestamp', { ascending: false });

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
      console.log(`User: ${entry.username}, Latest Time in DB: ${latestTime}, Entry Time: ${new Date(entry.timestamp).getTime()}`);
      if (!latestTime) return true; // New user
      return new Date(entry.timestamp).getTime() > latestTime;
    });

    if (newRecordsToProcess.length === 0) {
      return NextResponse.json({ message: 'No new data to process', records_processed: 0 });
    }

    // 3. Group data by User BEFORE interpolating
    const recordsByUser: Record<string, HeartRateEntry[]> = {};
    
    newRecordsToProcess.forEach((record) => {
      if (!recordsByUser[record.username]) recordsByUser[record.username] = [];
      recordsByUser[record.username].push(record);
    });

    const finalInsertPayload: InsertPayload[] = [];

    // 4. Process each user separately
    for (const username of Object.keys(recordsByUser)) {
      const userEntries = recordsByUser[username].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      let previousEntry: HeartRateEntry | null = null;

      for (const currentEntry of userEntries) {
        const currentTimestamp = new Date(currentEntry.timestamp);

        if (previousEntry) {
          const prevTimestamp = new Date(previousEntry.timestamp);
          const timeDiff = currentTimestamp.getTime() - prevTimestamp.getTime();

          const minuteIterator = new Date(prevTimestamp);
          minuteIterator.setSeconds(0, 0);
          minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);

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
              points: calculatePointsForBpm(interpolatedBpm, z1, z2, z3),
            });

            minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
          }
        }

        finalInsertPayload.push({
          username: username,
          bpm: currentEntry.bpm,
          timestamp: currentEntry.timestamp,
          points: calculatePointsForBpm(currentEntry.bpm, z1, z2, z3),
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