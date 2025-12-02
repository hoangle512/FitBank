import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../../app/api/steps/route'; // Adjust path as needed

// Mock the Supabase client
const mockSelectSingle = jest.fn();
const mockInsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null })); // Define mockUpsert here
const mockFrom = jest.fn((tableName) => {
  if (tableName === 'steps_data') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSelectSingle,
          })),
        })),
      })),
      upsert: mockUpsert, // Use the defined mockUpsert
      insert: mockInsert,
    };
  }
  return {};
});

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Steps API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockClear();
    mockUpsert.mockClear(); // Clear mockUpsert in beforeEach
  });

  it('should return 400 for invalid request data (not an array)', async () => {
    // Sending an object instead of an array to trigger top-level schema validation failure
    const requestBody = {
      username: 'testuser',
      timestamp: new Date().toISOString(),
      steps: 1000,
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('Invalid request data');
    expect(responseBody.details).toContain('Expected array, received object');
  });

  it('should successfully insert new steps data', async () => {
    mockSelectSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // No existing entry
    
    const singleRequestBody = {
      username: 'testuser_new',
      timestamp: new Date().toISOString(),
      steps: 5000,
    };
    const requestBody = [singleRequestBody]; // Wrap in an array

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(200); // Expect 200 for bulk submission
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Bulk steps data processing complete.');
    expect(responseBody.results).toHaveLength(1);
    expect(responseBody.results[0].status).toBe('inserted');
    expect(responseBody.results[0].message).toBe('Steps data inserted successfully.');
    expect(mockInsert).toHaveBeenCalledWith({
      username: singleRequestBody.username,
      timestamp: expect.any(String), // hourly timestamp
      steps: singleRequestBody.steps,
      points: Math.floor(singleRequestBody.steps * 0.005),
    });
  });

  it('should update existing steps data if incoming steps are higher', async () => {
    const existingSteps = 3000;
    const incomingSteps = 5000;
    const username = 'testuser_update';
    const fixedTimestamp = new Date().toISOString();
    const hourlyTimestamp = new Date(fixedTimestamp).setMinutes(0, 0, 0);

    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'some-id', username, timestamp: new Date(hourlyTimestamp).toISOString(), steps: existingSteps },
      error: null,
    });
    
    const singleRequestBody = {
      username,
      timestamp: fixedTimestamp,
      steps: incomingSteps,
    };
    const requestBody = [singleRequestBody]; // Wrap in an array

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(200); // Expect 200 for bulk submission
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Bulk steps data processing complete.');
    expect(responseBody.results).toHaveLength(1);
    expect(responseBody.results[0].status).toBe('updated');
    expect(responseBody.results[0].message).toBe('Steps data updated successfully (higher reading).');
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: 'some-id',
        username,
        timestamp: new Date(hourlyTimestamp).toISOString(),
        steps: incomingSteps,
        points: Math.floor(incomingSteps * 0.005),
      },
      { onConflict: 'id' }
    );
    expect(mockInsert).not.toHaveBeenCalled(); // Ensure insert was not called
  });

  it('should drop incoming steps data if steps are lower or equal to existing', async () => {
    const existingSteps = 5000;
    const incomingSteps = 3000; // Lower than existing
    const username = 'testuser_drop';
    const fixedTimestamp = new Date().toISOString();
    const hourlyTimestamp = new Date(fixedTimestamp).setMinutes(0, 0, 0);

    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'some-id', username, timestamp: new Date(hourlyTimestamp).toISOString(), steps: existingSteps },
      error: null,
    });
    
    const singleRequestBody = {
      username,
      timestamp: fixedTimestamp,
      steps: incomingSteps,
    };
    const requestBody = [singleRequestBody]; // Wrap in an array

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(200); // Expect 200 for bulk submission
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Bulk steps data processing complete.');
    expect(responseBody.results).toHaveLength(1);
    expect(responseBody.results[0].status).toBe('dropped');
    expect(responseBody.results[0].message).toBe('Steps data dropped (lower or equal reading).');
    expect(mockUpsert).not.toHaveBeenCalled(); // Ensure upsert was not called
    expect(mockInsert).not.toHaveBeenCalled(); // Ensure insert was not called
  });
});
