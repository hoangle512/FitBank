import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// The payload now expects a single object with parallel arrays for timestamp and bpm
const IncomingHeartRateSchema = z.object({
  username: z.string().min(1),
  timestamp: z.string(),
  bpm: z.string(),
});

// Schema for the arrays after parsing the incoming strings
const ValidatedHeartRateData = z.object({
  username: z.string().min(1),
  timestamp: z.array(z.string().datetime({ offset: true })),
  bpm: z.array(z.number()),
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
    let json: unknown;

    try {
      json = await request.json();
    } catch (e: unknown) {
      if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json(
          { error: 'Invalid JSON payload', details: e.message },
          { status: 400 }
        );
      }
      throw e;
    }

    const initialParse = IncomingHeartRateSchema.safeParse(json);

    if (!initialParse.success) {
      const validationError = fromZodError(initialParse.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const { username, timestamp: timestampString, bpm: bpmString } = initialParse.data;

    // Split strings into arrays
    const timestamps = timestampString.split('\n').map((s) => s.trim()).filter(Boolean);
    const bpms = bpmString.split('\n').map((s) => s.trim()).filter(Boolean).map(Number);
    
    if (bpms.some(isNaN)) {
      return NextResponse.json(
        { error: 'Invalid BPM data', details: 'One or more BPM values are not valid numbers.' },
        { status: 400 }
      );
    }

    const revalidatedPayload = ValidatedHeartRateData.safeParse({ username, timestamp: timestamps, bpm: bpms });

    if (!revalidatedPayload.success) {
      const validationError = fromZodError(revalidatedPayload.error);
      console.error("Revalidation failed:", validationError.toString());
      return NextResponse.json(
        { error: 'Invalid parsed data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const { timestamp: validatedTimestamps, bpm: validatedBpms } = revalidatedPayload.data;

    if (validatedTimestamps.length !== validatedBpms.length) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Timestamp and BPM arrays must have the same length after parsing.' },
        { status: 400 }
      );
    }

    const incomingData: HeartRateEntry[] = [];
    for (let i = 0; i < validatedTimestamps.length; i++) {
      incomingData.push({
        username,
        timestamp: validatedTimestamps[i],
        bpm: validatedBpms[i],
      });
    }

    if (incomingData.length === 0) {
      return NextResponse.json({ message: 'No valid data to process', records_processed: 0 });
    }

    // --- 1. Fetch Settings Safely ---
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('value, key');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }

    // FIX: Ensure settingsData is an array to prevent "reduce is not a function" error
    const safeSettingsData = Array.isArray(settingsData) ? settingsData : [];

    const settings = safeSettingsData.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);

    const z1 = parseInt(settings.z1 || "125", 10);
    const z2 = parseInt(settings.z2 || "150", 10);
    const z3 = parseInt(settings.z3 || "165", 10);

    let newRecordsToProcess = incomingData;




    // --- 3. Minute Aggregation ---
    const minuteBpmAggregates = new Map<string, Map<string, { sumBpm: number; count: number; }>>();

    for (const entry of newRecordsToProcess) {
      const date = new Date(entry.timestamp);
      date.setSeconds(0, 0);
      const minuteTimestampString = date.toISOString();

      if (!minuteBpmAggregates.has(entry.username)) {
        minuteBpmAggregates.set(entry.username, new Map());
      }
      const userMinuteMap = minuteBpmAggregates.get(entry.username)!;

      if (!userMinuteMap.has(minuteTimestampString)) {
        userMinuteMap.set(minuteTimestampString, { sumBpm: 0, count: 0 });
      }
      const minuteAggregate = userMinuteMap.get(minuteTimestampString)!;
      minuteAggregate.sumBpm += entry.bpm;
      minuteAggregate.count += 1;
    }

    const processedMinuteEntries: HeartRateEntry[] = [];
    for (const [username, userMinuteMap] of minuteBpmAggregates.entries()) {
      for (const [minuteTimestampString, aggregate] of userMinuteMap.entries()) {
        const averageBpm = Math.round(aggregate.sumBpm / aggregate.count);
        processedMinuteEntries.push({
          username: username,
          bpm: averageBpm,
          timestamp: minuteTimestampString, // Use the minute-aligned timestamp
        });
      }
    }

    newRecordsToProcess = processedMinuteEntries;
    
    if (newRecordsToProcess.length === 0) {
      return NextResponse.json({ message: 'No new data to process after averaging', records_processed: 0 });
    }

    // --- 4. Interpolation ---
    const recordsByUser: Record<string, HeartRateEntry[]> = {};
    newRecordsToProcess.forEach((record) => {
      if (!recordsByUser[record.username]) recordsByUser[record.username] = [];
      recordsByUser[record.username].push(record);
    });

    const finalInsertPayload: InsertPayload[] = processedMinuteEntries.map(entry => ({
      username: entry.username,
      bpm: entry.bpm,
      timestamp: entry.timestamp,
      points: calculatePointsForBpm(entry.bpm, z1, z2, z3),
    }));

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

          if (timeDiff <= 5 * 60 * 1000) {
            const minuteIterator = new Date(prevTimestamp);
            minuteIterator.setSeconds(0, 0);
            minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);

            const currentMinuteStart = new Date(currentTimestamp);
            currentMinuteStart.setSeconds(0, 0);

            while (minuteIterator.getTime() < currentMinuteStart.getTime()) {
              let interpolatedBpm = previousEntry.bpm; // Default to previous BPM
              if (timeDiff > 0) {
                const factor = (minuteIterator.getTime() - prevTimestamp.getTime()) / timeDiff;
                interpolatedBpm = previousEntry.bpm + (currentEntry.bpm - previousEntry.bpm) * factor;
              }
              const interpolatedPoints = calculatePointsForBpm(Math.round(interpolatedBpm), z1, z2, z3);
              finalInsertPayload.push({
                username: username,
                bpm: Math.round(interpolatedBpm),
                timestamp: minuteIterator.toISOString(),
                points: interpolatedPoints,
              });
              minuteIterator.setMinutes(minuteIterator.getMinutes() + 1);
            }
          }
        }
        previousEntry = currentEntry;
      }
    }

    // --- 5. Batch Insert into Supabase ---
    // Perform upsert for users in a single batch
    const { error: userUpsertError } = await supabase
      .from('users')
      .upsert(
        Array.from(new Set(finalInsertPayload.map((p) => p.username))).map((username) => ({ username }))
      );

    if (userUpsertError) {
      console.error("Supabase user upsert error:", userUpsertError);
      throw userUpsertError;
    }
    
    const { error: insertError } = await supabase.from('heart_rate_data').upsert(finalInsertPayload);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json(
      { message: 'Heart rate data saved successfully.', records_processed: finalInsertPayload.length },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Outer error processing heart rate data:', error);
    return NextResponse.json(
      { error: 'Failed to process heart rate request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}