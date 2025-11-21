import { NextResponse } from 'next/server';
import { db } from '../../../lib/db'; // Import db pool

function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const targetDate = dateParam ? new Date(dateParam) : new Date();

  const { start, end } = getWeekRange(targetDate);

  const client = await db.connect(); // Get a client from the pool
  try {
    const result = await client.query(`
      SELECT
        hrd.username,
        SUM(hrd.points) as total_score
      FROM heart_rate_data hrd
      WHERE hrd.timestamp >= '${start.toISOString()}' AND hrd.timestamp <= '${end.toISOString()}'
      GROUP BY hrd.username
      ORDER BY total_score DESC
      LIMIT 100;
    `);

    // Add rank
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      displayName: row.username,
      score: Number(row.total_score),
    }));

    return NextResponse.json({
      week: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      leaderboard,
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data.', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release(); // Release the client back to the pool
  }
}