import { NextRequest } from 'next/server';

// Mock the Supabase client
const mockInsertIgnoreDuplicates = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockInsertOnConflict = jest.fn(() => ({
  ignoreDuplicates: mockInsertIgnoreDuplicates,
}));
const mockInsert = jest.fn(() => ({
  onConflict: mockInsertOnConflict,
}));

const _mockHeartRateOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));

// Mocks for the select chain
const mockHeartRateIn = jest.fn(() => ({ order: _mockHeartRateOrder })); // Changed to use _mockHeartRateOrder
const mockHeartRateSelect = jest.fn(() => ({ in: mockHeartRateIn })); // Renamed to mockHeartRateSelect to avoid confusion with the existing 'select' mock

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((tableName) => {
      if (tableName === 'heart_rate_data') {
        return {
          insert: mockInsert, // Still need this for now for the first test, will remove if it passes
          select: mockHeartRateSelect,
          upsert: mockUpsert, // Add upsert for heart_rate_data
        };
      } else if (tableName === 'app_settings') {
        return {
          select: jest.fn(() => Promise.resolve({ data: [], error: null })),
        };
      } else if (tableName === 'users') {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    }),
  })),
}));

import { POST } from '../../../app/api/heart-rate/route';

describe('Heart Rate API', () => {
    beforeEach(() => {
        mockInsertIgnoreDuplicates.mockClear();
        mockInsertOnConflict.mockClear();
        mockInsert.mockClear();
        _mockHeartRateOrder.mockClear(); // Clear _mockHeartRateOrder
        mockHeartRateIn.mockClear(); // Clear mockHeartRateIn
        mockHeartRateSelect.mockClear(); // Clear mockHeartRateSelect
        mockUpsert.mockClear();
    });

              it('should successfully save heart rate data', async () => {
                // Configure the select chain for heart_rate_data for this call
                _mockHeartRateOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));
                mockInsertIgnoreDuplicates.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));
                mockUpsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));
            
                const requestBody = {
                  bpm: "160",
                  timestamp: new Date().toISOString(),
                  username: 'testuser_jest',
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
              });  it('should replace existing heart rate data for the same minute', async () => {
    const fixedTimestamp = '2025-12-01T10:00:00.000Z'; // Use a fixed timestamp
    const username = 'testuser_duplicate';

    const requestBody = {
      bpm: "150",
      timestamp: fixedTimestamp,
      username: username,
    };

                                // --- Mocking for the FIRST insertion ---
                                // Simulate no existing heart rate data for the user initially
                                _mockHeartRateOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));
                                // Simulate successful insert of heart rate data
                                mockInsertIgnoreDuplicates.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));
                                // Simulate successful upsert of user data
                                mockUpsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

                            
                                // First insertion
                                const request1 = new NextRequest(new URL('http://localhost:3000/api/heart-rate'), {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(requestBody),
                                });

                            
                                const response1 = await POST(request1);
                                expect(response1.status).toBe(201);
                                const responseBody1 = await response1.json();
                                expect(responseBody1.message).toBe('Heart rate data saved successfully.');
                                expect(responseBody1.records_processed).toBe(1);

                            
                                // Second insertion of the exact same data
                                const request2 = new NextRequest(new URL('http://localhost:3000/api/heart-rate'), {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(requestBody),
                                });

                            
                                const response2 = await POST(request2);
                                expect(response2.status).toBe(201); // Should return 201 as it's an upsert (update/insert)
                                const responseBody2 = await response2.json();
                                expect(responseBody2.message).toBe('Heart rate data saved successfully.');
                                expect(responseBody2.records_processed).toBe(1); // Should be 1 because it processes and updates/inserts

                            
                                // Verify that Supabase interactions were called as expected
                                // mockUpsert should have been called for user and heart_rate_data
                                expect(mockUpsert).toHaveBeenCalledTimes(4);  });
              });