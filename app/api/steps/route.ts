import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { updateStepData, getStepData } from '@/lib/actions';

// The payload now expects a single object with parallel arrays for timestamp and steps
const IncomingStepSchema = z.object({
  username: z.string().min(1),
  timestamp: z.string(),
  steps: z.string(),
});

// Schema for the arrays after parsing the incoming strings
const ValidatedStepData = z.object({
  username: z.string().min(1),
  timestamp: z.array(z.string().datetime({ offset: true })),
  steps: z.array(z.number().int().min(0)),
});

// Helper to round timestamp to the nearest hour
const roundToNearestHour = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  date.setMinutes(0, 0, 0); // Set minutes, seconds, milliseconds to 0
  return date.toISOString();
};

interface StepEntry {
  username: string;
  timestamp: string;
  steps: number;
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

    const initialParse = IncomingStepSchema.safeParse(json);

    if (!initialParse.success) {
      const validationError = fromZodError(initialParse.error);
      console.error('API Steps - Zod Validation Error:', validationError.toString());
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const { username, timestamp: timestampString, steps: stepsString } = initialParse.data;

    // Split strings into arrays
    const timestamps = timestampString.split('\n').map((s) => s.trim()).filter(Boolean);
    const stepsArray = stepsString.split('\n').map((s) => s.trim()).filter(Boolean).map(Number);
    
    if (stepsArray.some(isNaN)) {
      return NextResponse.json(
        { error: 'Invalid Steps data', details: 'One or more step values are not valid numbers.' },
        { status: 400 }
      );
    }

    const revalidatedPayload = ValidatedStepData.safeParse({ username, timestamp: timestamps, steps: stepsArray });

    if (!revalidatedPayload.success) {
      const validationError = fromZodError(revalidatedPayload.error);
      console.error("API Steps - Revalidation failed:", validationError.toString());
      return NextResponse.json(
        { error: 'Invalid parsed data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const { timestamp: validatedTimestamps, steps: validatedSteps } = revalidatedPayload.data;

    if (validatedTimestamps.length !== validatedSteps.length) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Timestamp and Steps arrays must have the same length after parsing.' },
        { status: 400 }
      );
    }

    const incomingData: StepEntry[] = [];
    for (let i = 0; i < validatedTimestamps.length; i++) {
      incomingData.push({
        username,
        timestamp: validatedTimestamps[i],
        steps: validatedSteps[i],
      });
    }

    if (incomingData.length === 0) {
      return NextResponse.json({ message: 'No valid data to process', records_processed: 0 }, {status: 200});
    }

    const hourlyStepAggregates = new Map<string, Map<string, { sumSteps: number; }>>();

    for (const entry of incomingData) {
      const hourlyTimestamp = roundToNearestHour(entry.timestamp);

      if (!hourlyStepAggregates.has(entry.username)) {
        hourlyStepAggregates.set(entry.username, new Map());
      }
      const userHourlyMap = hourlyStepAggregates.get(entry.username)!;

      if (!userHourlyMap.has(hourlyTimestamp)) {
        userHourlyMap.set(hourlyTimestamp, { sumSteps: 0 });
      }
      const hourlyAggregate = userHourlyMap.get(hourlyTimestamp)!;
      hourlyAggregate.sumSteps += entry.steps;
    }

    const finalInsertPayload: { username: string; timestamp: string; steps: number; points: number; }[] = [];
    for (const [username, userHourlyMap] of hourlyStepAggregates.entries()) {
      for (const [hourlyTimestamp, aggregate] of userHourlyMap.entries()) {
        const points = Math.floor(aggregate.sumSteps * 0.005);
        finalInsertPayload.push({
          username: username,
          timestamp: hourlyTimestamp,
          steps: aggregate.sumSteps,
          points: points,
        });
      }
    }
    
    await updateStepData(finalInsertPayload);

    return NextResponse.json(
      { message: 'Steps data processed successfully.', records_processed: finalInsertPayload.length },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Outer error processing steps data:', error);
    return NextResponse.json(
      { error: 'Failed to process steps request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const stepData = await getStepData(username);
    return NextResponse.json(stepData, { status: 200 });
  } catch (error) {
    console.error('Error fetching step data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch step data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
