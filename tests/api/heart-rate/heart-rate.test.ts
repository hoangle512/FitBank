import { NextRequest, NextResponse } from 'next/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      select: jest.fn(() => ({
        in: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

import { POST } from '../../../app/api/heart-rate/route';

describe('Heart Rate API', () => {
  it('should successfully save heart rate data', async () => {
    const requestBody = {
      data: JSON.stringify({
        bpm: 160,
        timestamp: new Date().toISOString(),
        username: 'testuser_jest',
      }),
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/heart-rate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Heart rate data saved successfully.');
    expect(responseBody.records_processed).toBe(1);
  });
});
