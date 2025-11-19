import { NextResponse } from 'next/server';

// Define the expected data structure (optional but good practice)
type HeartRateData = {
  bpm: number;
  timestamp: string;
  deviceId: string;
};

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming JSON body
    const data: HeartRateData = await request.json();

    // 2. Validate the data (Basic check)
    if (!data.bpm || !data.deviceId) {
      return NextResponse.json(
        { error: 'Missing required fields: bpm or deviceId' },
        { status: 400 }
      );
    }

    // 3. Log the data to Vercel Runtime Logs
    // In a real app, you would save this to a database (like Vercel Postgres)
    console.log(`[HEART_RATE_RECEIVED] Device: ${data.deviceId} | BPM: ${data.bpm} | Time: ${new Date().toISOString()}`);

    // 4. Return success response
    return NextResponse.json(
      { message: 'Heart rate data received successfully', receivedData: data },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse JSON body' },
      { status: 500 }
    );
  }
}