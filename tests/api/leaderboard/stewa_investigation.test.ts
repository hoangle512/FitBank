import { createClient } from '@/lib/supabase/server';
import { calculatePointsForBpm } from '../../../lib/scoring';
import { POST as heartRatePOST } from '../../../app/api/heart-rate/route';
import { GET as leaderboardGET } from '../../../app/api/leaderboard/route';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockInsert = jest.fn(() => ({
    onConflict: jest.fn(() => ({
        ignoreDuplicates: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
}));

const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));

const mockSelect = jest.fn();
const mockHeartRateSelect = jest.fn(); // New mock for heart_rate_data
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => ({
        from: (table: string) => {
            if (table === 'heart_rate_data') return { upsert: mockUpsert, insert: mockInsert, select: mockHeartRateSelect };
            if (table === 'users') return { upsert: mockUpsert, select: mockSelect };
            if (table === 'app_settings') return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
            return { select: mockSelect };
        },
        rpc: mockRpc,
    })),
}));

describe('Stewa Investigation', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: 'mock', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock' };
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-12-02T12:00:00Z')); // Tuesday
    });

    afterAll(() => {
        process.env = originalEnv;
        jest.useRealTimers();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should calculate 8 minutes if only 8 minutes have avg BPM >= 125', async () => {
        // Scenario: User sends 30 minutes of data
        // But only 8 minutes have BPM >= 125.

        const timestamps = [];
        const bpms = [];
        const username = 'stewa';
        const startTime = new Date('2025-12-02T10:00:00Z');

        // Generate 30 minutes of data (one reading per minute for simplicity of input)
        for (let i = 0; i < 30; i++) {
            const t = new Date(startTime.getTime() + i * 60000).toISOString();
            timestamps.push(t);
            // First 8 minutes: 130 BPM (1 point)
            // Next 22 minutes: 120 BPM (0 points)
            if (i < 8) {
                bpms.push(130);
            } else {
                bpms.push(120);
            }
        }

        const payload = {
            username,
            timestamp: timestamps.join('\n'),
            bpm: bpms.map(b => b.toString()).join('\n')
        };

        // 1. Send Data
        const req = new NextRequest('http://localhost:3000/api/heart-rate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Mock settings for POST
        // settings mocked by factory

        await heartRatePOST(req);

        // Verify upsert payload in heart_rate_data
        // Expected: 30 entries upserted. 
        // The logic in POST calculates points BEFORE upserting.
        const upsertCall = mockUpsert.mock.calls.find(call => call[0].length === 30 || call[0][0]?.points !== undefined);
        // Actually mockUpsert is called twice: one for users, one for heart_rate_data.
        // The second one is heart_rate_data.
        const heartRateUpsertArgs = mockUpsert.mock.calls[1][0]; // Array of objects

        const pointsOver0 = heartRateUpsertArgs.filter((d: any) => d.points >= 1);
        expect(pointsOver0.length).toBe(8);

        // Verify leaderboard
        mockRpc.mockImplementation((rpc, args) => {
            if (rpc === 'get_app_settings') return Promise.resolve({ data: [], error: null });
            if (rpc === 'get_steps_data_weekly') return Promise.resolve({ data: [], error: null });
            return Promise.resolve({ data: [], error: null });
        });

        // Mock user select
        mockSelect.mockResolvedValue({ data: [{ username: 'stewa', display_name: 'stewa' }], error: null });

        // Mock direct DB select for heart_rate_data
        // It chains .gte(), so we need to return an object with gte
        const mockGte = jest.fn(() => Promise.resolve({ data: heartRateUpsertArgs, error: null }));
        mockHeartRateSelect.mockReturnValue({ gte: mockGte });

        const lbRes = await leaderboardGET();
        const lbData = await lbRes.json();
        const stewaEntry = lbData.leaderboard.find((e: any) => e.username === 'stewa');

        expect(stewaEntry.minutes).toBe(8);
    });

    it('should interpolate gaps <= 5 minutes but not > 5 minutes', async () => {
        // case 1: 4 min gap (should interpolate)
        const timestamps1 = [
            '2025-12-02T11:00:00Z',
            '2025-12-02T11:04:00Z'
        ];
        const bpms1 = [140, 140];

        // case 2: 6 min gap (should NOT interpolate)
        const timestamps2 = [
            '2025-12-02T11:20:00Z',
            '2025-12-02T11:26:00Z'
        ];
        const bpms2 = [140, 140];

        const payload = {
            username: 'stewa_gap',
            timestamp: [...timestamps1, ...timestamps2].join('\n'),
            bpm: [...bpms1, ...bpms2].map(b => b.toString()).join('\n')
        };

        const req = new NextRequest('http://localhost:3000/api/heart-rate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // reset mocks
        jest.clearAllMocks();
        mockSelect.mockResolvedValue({ data: [{ username: 'stewa_gap', display_name: 'stewa_gap' }], error: null }); // for leaderboard users

        await heartRatePOST(req);

        const heartRateUpsertArgs = mockUpsert.mock.calls.find(call => call[0][0]?.points !== undefined)[0];

        // Case 1: 11:00, 11:01, 11:02, 11:03, 11:04 (5 entries)
        // Case 2: 11:20, 11:26 (2 entries)
        // Total: 7 entries
        expect(heartRateUpsertArgs.length).toBe(7);

        // Verify leaderboard
        mockRpc.mockImplementation((rpc, args) => {
            if (rpc === 'get_app_settings') return Promise.resolve({ data: [], error: null });
            if (rpc === 'get_steps_data_weekly') return Promise.resolve({ data: [], error: null });
            return Promise.resolve({ data: [], error: null });
        });

        // Mock direct DB select for heart_rate_data
        const mockGte = jest.fn(() => Promise.resolve({ data: heartRateUpsertArgs, error: null }));
        mockHeartRateSelect.mockReturnValue({ gte: mockGte });

        const lbRes = await leaderboardGET();
        const lbData = await lbRes.json();
        const entry = lbData.leaderboard.find((e: any) => e.username === 'stewa_gap');

        expect(entry.minutes).toBe(7);
    });
});
