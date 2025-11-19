"use client";

import { useState, useEffect } from 'react';

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  score: number;
};

type LeaderboardData = {
  week: {
    start: string;
    end: string;
  };
  leaderboard: LeaderboardEntry[];
};

export default function Home() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/leaderboard?date=${currentDate.toISOString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        setLeaderboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentDate]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  const isNextWeekButtonDisabled = () => {
    const today = new Date();
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek > today;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8">Weekly Heart Rate Challenge</h1>

        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevWeek} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Previous Week
          </button>
          {leaderboardData?.week && (
            <h2 className="text-2xl font-semibold">
              {leaderboardData.week.start} to {leaderboardData.week.end}
            </h2>
          )}
          <button onClick={handleNextWeek} disabled={isNextWeekButtonDisabled()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
            Next Week
          </button>
        </div>

        {isLoading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}

        {leaderboardData && !isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow">
              <thead>
                <tr className="w-full h-16 border-gray-300 dark:border-gray-700 border-b py-8">
                  <th className="text-left pl-8 pr-6 text-lg">Rank</th>
                  <th className="text-left pl-6 pr-6 text-lg">User</th>
                  <th className="text-left pl-6 pr-8 text-lg">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.leaderboard.map((entry) => (
                  <tr key={entry.rank} className="h-14 border-gray-300 dark:border-gray-700 border-b">
                    <td className="pl-8 pr-6">{entry.rank}</td>
                    <td className="pl-6 pr-6">{entry.displayName}</td>
                    <td className="pl-6 pr-8">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
