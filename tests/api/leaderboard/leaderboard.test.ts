import { NextRequest } from 'next/server'; // Removed NextResponse as it is unused
import { POST as heartRatePOST } from '../../../app/api/heart-rate/route';
import { GET as leaderboardGET } from '../../../app/api/leaderboard/route';
import { calculatePointsForBpm } from '../../../lib/scoring';

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  minutes: number;
  max_bpm: number;
  total_steps_weekly: number;
  coins: number;
  fails: number;
}

// Mocks for Supabase
const mockInsertIgnoreDuplicates = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockInsertOnConflict = jest.fn(() => ({
  ignoreDuplicates: mockInsertIgnoreDuplicates,
}));
const mockInsert = jest.fn(() => ({
  onConflict: mockInsertOnConflict,
}));

const mockHeartRateOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
const mockHeartRateIn = jest.fn(() => ({
  order: mockHeartRateOrder,
}));
const mockHeartRateSelect = jest.fn(() => ({
  in: mockHeartRateIn,
}));

// Mocks for steps_data
const mockStepsOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
const mockStepsIn = jest.fn(() => ({
  order: mockStepsOrder,
}));
const mockStepsSelect = jest.fn(() => ({
  in: mockStepsIn,
}));

const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));

const mockSupabaseFrom = jest.fn((tableName) => {
  if (tableName === 'heart_rate_data') {
    return {
      insert: mockInsert,
      select: mockHeartRateSelect,
    };
  } else if (tableName === 'users') {
    return {
      upsert: mockUpsert,
      select: jest.fn(() => Promise.resolve({ data: [{ id: 'dominika', display_name: 'dominika' }], error: null })),
    };
  } else if (tableName === 'leaderboard_stats') {
    return {
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
    };
  }
  return {};
});

const mockSupabaseRpc = jest.fn((rpcName, ..._args) => {
  void _args; // Renamed params to _params to mark as unused
  if (rpcName === 'get_app_settings') {
    return Promise.resolve({ data: [
      { key: 'z1', value: '125' },
      { key: 'z2', value: '150' },
      { key: 'z3', value: '165' },
    ], error: null });
  }
  if (rpcName === 'calculate_weekly_stats') {
    return Promise.resolve({ data: {}, error: null });
  }
  if (rpcName === 'get_heart_rate_data_latest') {
    // This will be mocked per test case using mockImplementationOnce
    return Promise.resolve({ data: [], error: null });
  }
  if (rpcName === 'get_heart_rate_data_all') {
    // This will be mocked per test case using mockImplementationOnce
    return Promise.resolve({ data: [], error: null });
  }
  if (rpcName === 'get_steps_data_weekly') {
    // This will be mocked per test case using mockImplementationOnce
    return Promise.resolve({ data: [], error: null });
  }
  return Promise.resolve({ data: {}, error: null });
});

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));


describe('Leaderboard API with custom data', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original environment variables
    originalEnv = process.env;
    // Set mock environment variables for Supabase URL and Key
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_key',
    };
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Clear mocks before each test
    mockInsertIgnoreDuplicates.mockClear();
    mockInsertOnConflict.mockClear();
    mockInsert.mockClear();
    mockHeartRateOrder.mockClear();
    mockHeartRateIn.mockClear();
    mockHeartRateSelect.mockClear();
    mockStepsOrder.mockClear();
    mockStepsIn.mockClear();
    mockStepsSelect.mockClear();
    mockUpsert.mockClear();
    mockSupabaseFrom.mockClear();
    mockSupabaseRpc.mockClear();
  });

  it('should correctly calculate minutes and points for Dominika', async () => {
    // Sample data from dominika_test_data.json
    const dominikaData = [
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:37:00+01:00", // BPM 115 (0 points)
        "bpm": 115
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:37:08+01:00", // BPM 118 (0 points)
        "bpm": 118
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:37:19+01:00", // BPM 121 (0 points)
        "bpm": 121
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:37:28+01:00", // BPM 122 (0 points)
        "bpm": 122
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:50:23+01:00", // BPM 128 (1 point)
        "bpm": 128
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:50:27+01:00", // BPM 129 (1 point)
        "bpm": 129
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:50:31+01:00", // BPM 128 (1 point)
        "bpm": 128
      },
      {
        "username": "dominika",
        "timestamp": "2025-11-30T21:50:37+01:00", // BPM 127 (1 point)
        "bpm": 127
      },
      {
        "username": "dominika",
        "timestamp": "2025-12-01T08:53:55+01:00", // BPM 151 (2 points)
        "bpm": 151
      },
      {
        "username": "dominika",
        "timestamp": "2025-12-01T16:42:40+01:00", // BPM 141 (1 point)
        "bpm": 141
      }
    ];

    // --- Mocks for Heart Rate API call ---
    // Simulate current heart_rate_data from DB for initial fetch in heart-rate API (empty)
    mockSupabaseRpc.mockImplementationOnce((rpcName) => {
      if (rpcName === 'get_heart_rate_data_latest') {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });
    // Mock the insert operation for heart rate data (success)
    mockInsert.mockImplementationOnce(() => ({ onConflict: jest.fn(() => ({ ignoreDuplicates: jest.fn(() => Promise.resolve({ data: {}, error: null })) })) }));
    // Mock upsert for user (success)
    mockUpsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

    // Simulate sending heart rate data to the API
    const heartRatePayload = {
      username: 'dominika',
      timestamp: dominikaData.map(d => d.timestamp).join('\n'),
      bpm: dominikaData.map(d => d.bpm).join('\n'),
    };

    const request = new NextRequest(new URL('http://localhost:3000/api/heart-rate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(heartRatePayload),
    });

    await heartRatePOST(request);

    // --- Mocks for Leaderboard API call ---
    // After processing heart rate data, now query the leaderboard
    // Mock the heart_rate_data that the leaderboard API will fetch
    const processedHeartRateData = dominikaData.map(d => ({
        username: d.username,
        points: calculatePointsForBpm(d.bpm, 125, 150, 165), // Calculate points based on default thresholds
        bpm: d.bpm,
        timestamp: d.timestamp,
    }));

    // Filter for entries that yielded at least 1 point for the minutes calculation in leaderboard
    const pointEarningEntries = processedHeartRateData.filter(entry => entry.points >= 1);

    // Sample steps data for Dominika
    const dominikaStepsData = [
      { username: 'dominika', steps: 1000, timestamp: '2025-12-01T09:00:00+01:00' }, // 1000 * 0.005 = 5 points
      { username: 'dominika', steps: 1500, timestamp: '2025-12-01T10:00:00+01:00' }, // 1500 * 0.005 = 7.5, rounded to 7 points
    ];
    const expectedTotalStepsWeekly = dominikaStepsData.reduce((sum, entry) => sum + entry.steps, 0); // 2500
    const expectedStepsPoints = dominikaStepsData.reduce((sum, entry) => sum + Math.floor(entry.steps * 0.005), 0); // 5 + 7 = 12

    // Mock RPCs for leaderboardGET
    mockSupabaseRpc.mockImplementationOnce((rpcName) => {
      if (rpcName === 'get_app_settings') {
        return Promise.resolve({ data: [
          { key: 'z1', value: '125' },
          { key: 'z2', value: '150' },
          { key: 'z3', value: '165' },
        ], error: null });
      }
      if (rpcName === 'get_heart_rate_data_all') {
        return Promise.resolve({ data: processedHeartRateData, error: null });
      }
      if (rpcName === 'get_steps_data_weekly') { // Mock steps data for RPC
        return Promise.resolve({ data: dominikaStepsData, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });

    const leaderboardResponse = await leaderboardGET();
    const leaderboardBody = await leaderboardResponse.json();

    const dominikaEntry = leaderboardBody.leaderboard.find((entry: LeaderboardEntry) => entry.username === 'dominika');

    // Expected minutes: count of entries with points >= 1
    const expectedMinutes = pointEarningEntries.length; // 6 entries earn points
    // Expected points: sum of points from all entries
    const expectedHeartRatePoints = processedHeartRateData.reduce((sum, entry) => sum + entry.points, 0); // (1*4) + (2*1) + (1*1) = 4 + 2 + 1 = 7
    const expectedPoints = expectedHeartRatePoints + expectedStepsPoints; // Total points from heart rate and steps

    expect(dominikaEntry).toBeDefined();
    expect(dominikaEntry.minutes).toBe(expectedMinutes); // Should be 6
    expect(dominikaEntry.total_points).toBe(expectedPoints); // Should be 7 + 12 = 19
    expect(dominikaEntry.total_steps_weekly).toBe(expectedTotalStepsWeekly); // Should be 2500
  });
});
