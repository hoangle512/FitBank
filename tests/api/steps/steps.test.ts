import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/steps/route'; // Adjust path as needed

// Mock the Supabase client
const mockSingleMethod = jest.fn(); // New simplified mock for the .single() method
const mockInsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null })); // Define mockUpsert here
const mockFrom = jest.fn((tableName) => {
  if (tableName === 'steps_data') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingleMethod, // Directly use mockSingleMethod here
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
    mockSingleMethod.mockClear(); // Clear mockSingleMethod
  });

  it('should return 400 for invalid request data (missing username)', async () => {
    // Sending an object missing username
    const requestBody = {
      timestamp: new Date().toISOString(),
      steps: "1000",
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
    expect(responseBody.details).toContain('username');
  });

  it('should successfully insert new steps data', async () => {
    mockSingleMethod.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // First call
    mockSingleMethod.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // Second call
    
    const requestBody = {
      username: 'testuser_new',
      timestamp: "2025-12-01T11:00:00Z\n2025-12-01T12:00:00Z",
      steps: "5000\n6000",
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Steps data processed successfully.');
    expect(responseBody.records_processed).toBe(2); // Expect 2 records processed
    expect(mockInsert).toHaveBeenCalledTimes(2); // Ensure insert was called twice
    expect(mockInsert).toHaveBeenCalledWith({
      username: 'testuser_new',
      timestamp: expect.any(String), // hourly timestamp for first entry
      steps: 5000,
      points: Math.floor(5000 * 0.005),
    });
    expect(mockInsert).toHaveBeenCalledWith({
      username: 'testuser_new',
      timestamp: expect.any(String), // hourly timestamp for second entry
      steps: 6000,
      points: Math.floor(6000 * 0.005),
    });
  });

  it('should update existing steps data if incoming steps are higher', async () => {
    const existingSteps = 3000;
    const incomingSteps = 5000;
    const username = 'testuser_update';
    const fixedTimestamp = new Date().toISOString();
    const hourlyTimestamp = new Date(fixedTimestamp).setMinutes(0, 0, 0);

    mockSingleMethod.mockResolvedValueOnce({
      data: { id: 'some-id', username, timestamp: new Date(hourlyTimestamp).toISOString(), steps: existingSteps },
      error: null,
    });
    
    const requestBody = {
      username,
      timestamp: fixedTimestamp, // single timestamp, but still a string
      steps: String(incomingSteps), // single steps, but still a string
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Steps data processed successfully.');
    expect(responseBody.records_processed).toBe(1);
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
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should drop incoming steps data if steps are lower or equal to existing', async () => {
    const existingSteps = 5000;
    const incomingSteps = 3000; // Lower than existing
    const username = 'testuser_drop';
    const fixedTimestamp = new Date().toISOString();
    const hourlyTimestamp = new Date(fixedTimestamp).setMinutes(0, 0, 0);

    mockSingleMethod.mockResolvedValueOnce({
      data: { id: 'some-id', username, timestamp: new Date(hourlyTimestamp).toISOString(), steps: existingSteps },
      error: null,
    });
    
    const requestBody = {
      username,
      timestamp: fixedTimestamp, // single timestamp, but still a string
      steps: String(incomingSteps), // single steps, but still a string
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);

    expect(response.status).toBe(201); // Still 201 because the request was processed
    const responseBody = await response.json();
    expect(responseBody.message).toBe('Steps data processed successfully.');
    expect(responseBody.records_processed).toBe(0); // 0 records processed because it was dropped
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should return 400 for mismatched timestamp and steps array lengths', async () => {
    const requestBody = {
      username: 'testuser_mismatch',
      timestamp: "2025-12-01T11:00:00Z\n2025-12-01T12:00:00Z", // Two timestamps
      steps: "1000", // Only one step
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
    expect(responseBody.details).toContain('Timestamp and Steps arrays must have the same length after parsing.');
  });

  it('should return 400 for invalid step data (non-numeric values)', async () => {
    const requestBody = {
      username: 'testuser_invalid_steps',
      timestamp: "2025-12-01T11:00:00Z",
      steps: "1000\nabc", // 'abc' is not a number
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
    expect(responseBody.error).toBe('Invalid Steps data');
    expect(responseBody.details).toContain('One or more step values are not valid numbers.');
  });
});
