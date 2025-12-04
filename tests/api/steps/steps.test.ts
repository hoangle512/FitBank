import { NextRequest } from 'next/server';

const mockUpdateStepData = jest.fn();
const mockGetStepData = jest.fn();

// Mock the Supabase client
const mockSingleMethod = jest.fn(); // New simplified mock for the .single() method
const mockInsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null })); // Define mockUpsert here
const mockFrom = jest.fn((tableName) => {
  if (tableName === 'steps_data') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            single: mockSingleMethod,
          })),
        })),
      })),
      upsert: mockUpsert,
      insert: mockInsert,
    };
  } else if (tableName === 'users') { // Added for users table upsert
    return {
      upsert: mockUpsert,
    };
  }
  return {};
});

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock('@/lib/actions', () => ({
  updateStepData: mockUpdateStepData,
  getStepData: mockGetStepData,
}));

// Now import the module under test after all mocks are defined
import { POST, GET } from '../../../app/api/steps/route'; // Adjust path as needed

describe('Steps API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockClear();
    mockUpsert.mockClear(); // Clear mockUpsert in beforeEach
    mockSingleMethod.mockClear(); // Clear mockSingleMethod
    mockUpdateStepData.mockReset(); // Reset the mock state, not just clear calls
    mockGetStepData.mockReset(); // Reset the mock state, not just clear calls
    mockUpdateStepData.mockImplementation(() => Promise.resolve());
    mockGetStepData.mockImplementation(() => Promise.resolve([]));
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
    expect(responseBody.records_processed).toBe(2); // Expect 2 records processed (2 unique hourly records)
    expect(mockUpdateStepData).toHaveBeenCalledTimes(1);
    expect(mockUpdateStepData).toHaveBeenCalledWith([
      {
        username: 'testuser_new',
        timestamp: '2025-12-01T11:00:00.000Z',
        steps: 5000,
        points: Math.floor(5000 * 0.005),
      },
      {
        username: 'testuser_new',
        timestamp: '2025-12-01T12:00:00.000Z',
        steps: 6000,
        points: Math.floor(6000 * 0.005),
      },
    ]);
  });

  it('should replace existing steps data for the same hour (higher steps)', async () => {
    const incomingSteps = 5000;
    const username = 'testuser_update';
    const fixedTimestamp = '2025-12-01T11:30:00Z'; // Time within an hour
    const hourlyTimestamp = new Date(fixedTimestamp);
    hourlyTimestamp.setMinutes(0, 0, 0); // Round to the hour

    const requestBody = {
      username,
      timestamp: fixedTimestamp,
      steps: String(incomingSteps),
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
    expect(mockUpdateStepData).toHaveBeenCalledTimes(1);
    expect(mockUpdateStepData).toHaveBeenCalledWith([
      {
        username,
        timestamp: hourlyTimestamp.toISOString(),
        steps: incomingSteps,
        points: Math.floor(incomingSteps * 0.005),
      },
    ]);
  });

  it('should replace existing steps data for the same hour (lower or equal steps)', async () => {
    const incomingSteps = 3000; // Lower than existing (old logic)
    const username = 'testuser_replace_lower';
    const fixedTimestamp = '2025-12-01T13:45:00Z'; // Time within an hour
    const hourlyTimestamp = new Date(fixedTimestamp);
    hourlyTimestamp.setMinutes(0, 0, 0); // Round to the hour

    const requestBody = {
      username,
      timestamp: fixedTimestamp,
      steps: String(incomingSteps),
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
    expect(responseBody.records_processed).toBe(1); // 1 record processed because it's replaced
    expect(mockUpdateStepData).toHaveBeenCalledTimes(1);
    expect(mockUpdateStepData).toHaveBeenCalledWith([
      {
        username,
        timestamp: hourlyTimestamp.toISOString(),
        steps: incomingSteps,
        points: Math.floor(incomingSteps * 0.005),
      },
    ]);
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

  it('should successfully retrieve step data for a given username', async () => {
    const username = 'testuser_get';
    const mockData = [
      { username, timestamp: '2025-12-01T10:00:00Z', steps: 1000, points: 5 },
      { username, timestamp: '2025-12-01T09:00:00Z', steps: 800, points: 4 },
    ];
    mockGetStepData.mockResolvedValueOnce(mockData);

    const request = new NextRequest(new URL(`http://localhost:3000/api/steps?username=${username}`));
    const response = await GET(request);

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual(mockData);
    expect(mockGetStepData).toHaveBeenCalledTimes(1);
    expect(mockGetStepData).toHaveBeenCalledWith(username);
  });

  it('should return 400 if username is missing for GET request', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/steps'));
    const response = await GET(request);

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('Username is required');
  });

  it('should handle errors during GET request', async () => {
    const username = 'testuser_error';
    const errorMessage = 'Database query failed';
    mockGetStepData.mockRejectedValueOnce(new Error(errorMessage));

    const request = new NextRequest(new URL(`http://localhost:3000/api/steps?username=${username}`));
    const response = await GET(request);

    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('Failed to fetch step data');
    expect(responseBody.details).toContain(errorMessage);
  });
});

