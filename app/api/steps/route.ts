import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Schema for incoming step data
const IncomingStepSchema = z.object({
  username: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }), // ISO format timestamp
  steps: z.number().int().min(0),
});

// Helper to round timestamp to the nearest hour
const roundToNearestHour = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  date.setMinutes(0, 0, 0); // Set minutes, seconds, milliseconds to 0
  return date.toISOString();
};

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const json: unknown = await request.json();

    const parseResult = IncomingStepSchema.safeParse(json);

    if (!parseResult.success) {
      const validationError = fromZodError(parseResult.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const { username, timestamp, steps: incomingSteps } = parseResult.data;

    const hourlyTimestamp = roundToNearestHour(timestamp);
    const points = Math.floor(incomingSteps * 0.005);

    // 1. Check for existing entry for the same user and hourly timestamp
    const { data: existingEntry, error: fetchError } = await supabase
      .from('steps_data')
      .select('id, steps') // Select id along with steps
      .eq('username', username)
      .eq('timestamp', hourlyTimestamp)
      .single(); // Use single() to get one row or null

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Supabase fetch existing steps error:", fetchError);
        throw fetchError;
    }

    if (existingEntry) {
      // Entry exists
      if (incomingSteps > existingEntry.steps) {
        // Incoming steps are higher, update the entry using upsert
        const { error: updateError } = await supabase
          .from('steps_data')
          .upsert({ id: existingEntry.id, username, timestamp: hourlyTimestamp, steps: incomingSteps, points }, { onConflict: 'id' });

        if (updateError) throw updateError;

        return NextResponse.json(
          { message: 'Steps data updated successfully (higher reading).', username, timestamp: hourlyTimestamp, steps: incomingSteps, points },
          { status: 200 }
        );
      } else {
        // Incoming steps are lower or equal, drop the reading
        return NextResponse.json(
          { message: 'Steps data dropped (lower or equal reading).', username, timestamp: hourlyTimestamp, steps: incomingSteps, points },
          { status: 200 }
        );
      }
    } else {
      // No existing entry, insert new data
      const { error: insertError } = await supabase
        .from('steps_data')
        .insert({ username, timestamp: hourlyTimestamp, steps: incomingSteps, points });

      if (insertError) throw insertError;

      return NextResponse.json(
        { message: 'Steps data inserted successfully.', username, timestamp: hourlyTimestamp, steps: incomingSteps, points },
        { status: 201 }
      );
    }

  } catch (error: unknown) {
    console.error('Outer error processing steps data:', error);
    return NextResponse.json(
      { error: 'Failed to process steps request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
