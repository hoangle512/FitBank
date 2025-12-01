import { NextRequest, NextResponse } from 'next/server';

// Mock the Supabase client
const mockInsertIgnoreDuplicates = jest.fn(() => Promise.resolve({ data: {}, error: null }));
const mockInsertOnConflict = jest.fn(() => ({
  ignoreDuplicates: mockInsertIgnoreDuplicates,
}));
const mockInsert = jest.fn(() => ({
  onConflict: mockInsertOnConflict,
}));

const mockHeartRateOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
const mockUpsert = jest.fn(() => Promise.resolve({ data: {}, error: null }));

// Mocks for the select chain
const mockSelectOrder = jest.fn();
const mockSelectIn = jest.fn(() => ({ order: mockSelectOrder }));
const mockSelectSelect = jest.fn(() => ({ in: mockSelectIn }));


jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((tableName) => {
      if (tableName === 'heart_rate_data') {
        return {
          insert: mockInsert,
          select: mockSelectSelect,
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
        mockSelectOrder.mockClear();
        mockSelectIn.mockClear();
        mockSelectSelect.mockClear();
        mockUpsert.mockClear();
    });

              it('should successfully save heart rate data', async () => {
                // Configure the select chain for heart_rate_data for this call
                mockSelectOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));
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
              });  it('should prevent duplicate heart rate data entries', async () => {
    const fixedTimestamp = '2025-12-01T10:00:00.000Z'; // Use a fixed timestamp
    const username = 'testuser_duplicate';

    const requestBody = {
      bpm: "150",
      timestamp: fixedTimestamp,
      username: username,
    };

                                // --- Mocking for the FIRST insertion ---
                                // Simulate no existing heart rate data for the user initially
                                mockSelectOrder.mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));
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

                            
                                // --- Mocking for the SECOND insertion (duplicate) ---
                                // Simulate that the data already exists in the DB for the user
                                // This will cause newRecordsToProcess to be empty in the API route
                                mockSelectOrder.mockImplementationOnce(() => Promise.resolve({ data: [{ username: username, timestamp: fixedTimestamp }], error: null }));
                                // Simulate successful insert (or ignored duplicate) of heart rate data
                                mockInsertIgnoreDuplicates.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));
                                // Simulate successful upsert of user data
                                mockUpsert.mockImplementationOnce(() => Promise.resolve({ data: {}, error: null }));

                            
                                // Second insertion of the exact same data
                                const request2 = new NextRequest(new URL('http://localhost:3000/api/heart-rate'), {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify(requestBody),
                                });

                            
                                const response2 = await POST(request2);
                                expect(response2.status).toBe(200); // Should return 200 because no new data is processed
                                const responseBody2 = await response2.json();
                                expect(responseBody2.message).toBe('No new data to process');
                                expect(responseBody2.records_processed).toBe(0);

                            
                                // Verify that Supabase interactions were called as expected
                                // Specifically, mockSelectOrder, mockInsertIgnoreDuplicates, and mockUpsert should have been called for each "insertion" attempt.
                                expect(mockSelectOrder).toHaveBeenCalledTimes(2);
                                expect(mockInsertIgnoreDuplicates).toHaveBeenCalledTimes(1);
                                          expect(mockUpsert).toHaveBeenCalledTimes(1);  });
              });