import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/steps/route';

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn(() => ({
  eq: jest.fn(() => ({
    eq: jest.fn(() => ({
      single: jest.fn(),
    })),
  })),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((tableName) => {
      if (tableName === 'steps_data') {
        return {
          insert: mockInsert,
          upsert: mockUpdate,
          select: mockSelect,
        };
      }
      return {};
    }),
  })),
}));

describe('Steps API', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert new steps data if no existing entry', async () => {
    // Mock no existing entry
    mockSelect.mockImplementationOnce(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })), // No rows found
        })),
      })),
    }));
    mockInsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

    const requestBody = {
      username: 'testuser',
      timestamp: '2025-12-01T10:30:00.000Z',
      steps: 1000,
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.message).toBe('Steps data inserted successfully.');
    expect(mockInsert).toHaveBeenCalledWith({
      username: 'testuser',
      timestamp: '2025-12-01T10:00:00.000Z',
      steps: 1000,
      points: 5, // 1000 * 0.005 = 5
    });
  });

  it('should update steps data if incoming steps are higher', async () => {
    // Mock existing entry with lower steps
    mockSelect.mockImplementationOnce(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'existing-id-1', steps: 500 }, error: null })),
        })),
      })),
    }));
    mockUpdate.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

    const requestBody = {
      username: 'testuser',
      timestamp: '2025-12-01T11:30:00.000Z',
      steps: 1200,
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.message).toBe('Steps data updated successfully (higher reading).');
    expect(mockUpdate).toHaveBeenCalledWith(
      { id: 'existing-id-1', username: 'testuser', timestamp: '2025-12-01T11:00:00.000Z', steps: 1200, points: 6 },
      { onConflict: 'id' }
    );
  });

  it('should drop steps data if incoming steps are lower or equal', async () => {
    // Mock existing entry with higher or equal steps
    mockSelect.mockImplementationOnce(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'existing-id-2', steps: 1500 }, error: null })),
        })),
      })),
    }));

    const requestBody = {
      username: 'testuser',
      timestamp: '2025-12-01T12:30:00.000Z',
      steps: 1400,
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.message).toBe('Steps data dropped (lower or equal reading).');
    expect(mockUpdate).not.toHaveBeenCalled(); // Ensure no update happened
    expect(mockInsert).not.toHaveBeenCalled(); // Ensure no insert happened
  });

  it('should handle invalid input data', async () => {
    const requestBody = {
      username: 'testuser',
      timestamp: 'invalid-timestamp', // Invalid timestamp
      steps: 'not-a-number', // Invalid steps
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBe('Invalid request data');
  });

  it('should round points down to the nearest whole number', async () => {
    // Mock no existing entry
    mockSelect.mockImplementationOnce(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        })),
      })),
    }));
    mockInsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

    const requestBody = {
      username: 'testuser',
      timestamp: '2025-12-01T13:00:00.000Z',
      steps: 100, // 100 * 0.005 = 0.5, should be 0 points
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.message).toBe('Steps data inserted successfully.');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      points: 0,
    }));
  });

  it('should correctly calculate points for steps resulting in integer points', async () => {
    // Mock no existing entry
    mockSelect.mockImplementationOnce(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        })),
      })),
    }));
    mockInsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

    const requestBody = {
      username: 'testuser',
      timestamp: '2025-12-01T14:00:00.000Z',
      steps: 200, // 200 * 0.005 = 1, should be 1 point
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/steps'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody.message).toBe('Steps data inserted successfully.');
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      points: 1,
    }));
  });
});