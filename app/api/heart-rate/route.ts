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

// The payload now expects a JSON array of HeartRateDataSchema
const HeartRatePayloadSchema = z.array(HeartRateDataSchema);

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
    let json: any;

    try {
      json = await request.json();
      console.log("Raw JSON received:", JSON.stringify(json, null, 2));
    } catch (e: any) {
      if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json(
          { error: 'Invalid JSON payload', details: e.message },
          { status: 400 }
        );
      }
      throw e; // Re-throw other errors to be caught by the outer catch
    }

    const parsedPayload = HeartRatePayloadSchema.safeParse(json);

    if (!parsedPayload.success) {
      const validationError = fromZodError(parsedPayload.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const incomingData: HeartRateEntry[] = parsedPayload.data;
    console.log("Incoming Data (parsed as array):", JSON.stringify(incomingData, null, 2));

    if (incomingData.length === 0) {
      return NextResponse.json({ message: 'No valid data to process', records_processed: 0 });
    }

    // --- The rest of the logic remains unchanged for now ---
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

    // New logic: Calculate average BPM per minute
    const minuteBpmAggregates = new Map<string, Map<string, { sumBpm: number; count: number; firstTimestamp: string }>>();

    for (const entry of newRecordsToProcess) {
      const date = new Date(entry.timestamp);
      // Normalize timestamp to the start of the minute
      date.setSeconds(0, 0);
      const minuteTimestampString = date.toISOString();

      if (!minuteBpmAggregates.has(entry.username)) {
        minuteBpmAggregates.set(entry.username, new Map());
      }
      const userMinuteMap = minuteBpmAggregates.get(entry.username)!;

      if (!userMinuteMap.has(minuteTimestampString)) {
        userMinuteMap.set(minuteTimestampString, { sumBpm: 0, count: 0, firstTimestamp: entry.timestamp });
      }
      const minuteAggregate = userMinuteMap.get(minuteTimestampString)!;
      minuteAggregate.sumBpm += entry.bpm;
      minuteAggregate.count += 1;
      // Keep the earliest timestamp for the minute to maintain accuracy if original timestamps within a minute vary
      if (new Date(entry.timestamp).getTime() < new Date(minuteAggregate.firstTimestamp).getTime()) {
        minuteAggregate.firstTimestamp = entry.timestamp;
      }
    }

    const processedMinuteEntries: HeartRateEntry[] = [];
    for (const [username, userMinuteMap] of minuteBpmAggregates.entries()) {
      for (const [minuteTimestampString, aggregate] of userMinuteMap.entries()) {
        const averageBpm = Math.round(aggregate.sumBpm / aggregate.count);
        processedMinuteEntries.push({
          username: username,
          bpm: averageBpm,
          timestamp: aggregate.firstTimestamp, // Use the earliest timestamp from the minute
        });
      }
    }

    // Replace newRecordsToProcess with the minute-averaged entries
    newRecordsToProcess = processedMinuteEntries;
    
    if (newRecordsToProcess.length === 0) { // Check again after processing
      return NextResponse.json({ message: 'No new data to process after averaging', records_processed: 0 });
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
    console.error('Outer error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process request (outer)', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}