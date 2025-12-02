import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Schema for a single step data item
const StepDataItemSchema = z.object({
  username: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }), // ISO format timestamp
  steps: z.number().int().min(0),
});

// Schema for incoming bulk step data (array of StepDataItemSchema)
const IncomingBulkStepSchema = z.array(StepDataItemSchema);

// Helper to round timestamp to the nearest hour
const roundToNearestHour = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  date.setMinutes(0, 0, 0); // Set minutes, seconds, milliseconds to 0
  return date.toISOString();
};

interface StepProcessingResult {
  status: 'updated' | 'dropped' | 'inserted' | 'failed';
  message: string;
  username: string;
  timestamp: string;
  steps: number;
  points: number;
  details?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const results: StepProcessingResult[] = [];

  try {
    const json: unknown = await request.json();

    const parseResult = IncomingBulkStepSchema.safeParse(json);

    if (!parseResult.success) {
      const validationError = fromZodError(parseResult.error);
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError.toString() },
        { status: 400 }
      );
    }

    const incomingStepDataArray = parseResult.data;

    for (const { username, timestamp, steps: incomingSteps } of incomingStepDataArray) {
      const hourlyTimestamp = roundToNearestHour(timestamp);
      const points = Math.floor(incomingSteps * 0.005);

      try {
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

            results.push({
              status: 'updated',
              message: 'Steps data updated successfully (higher reading).',
              username,
              timestamp: hourlyTimestamp,
              steps: incomingSteps,
              points
            });
          } else {
            // Incoming steps are lower or equal, drop the reading
            results.push({
              status: 'dropped',
              message: 'Steps data dropped (lower or equal reading).',
              username,
              timestamp: hourlyTimestamp,
              steps: incomingSteps,
              points
            });
          }
        } else {
          // No existing entry, insert new data
          const { error: insertError } = await supabase
            .from('steps_data')
            .insert({ username, timestamp: hourlyTimestamp, steps: incomingSteps, points });

          if (insertError) throw insertError;

          results.push({
            status: 'inserted',
            message: 'Steps data inserted successfully.',
            username,
            timestamp: hourlyTimestamp,
            steps: incomingSteps,
            points
          });
        }
      } catch (innerError: unknown) {
        console.error(`Error processing step data for user ${username} at ${timestamp}:`, innerError);
        results.push({
          status: 'failed',
          message: 'Failed to process individual step entry.',
          username,
          timestamp,
          details: innerError instanceof Error ? innerError.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json(
      { message: 'Bulk steps data processing complete.', results },
      { status: 200 } // Return 200 for partial success/failure in bulk
    );

  } catch (error: unknown) {
    console.error('Outer error processing bulk steps data:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk steps request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
