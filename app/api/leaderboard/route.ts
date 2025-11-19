import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

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

  const client = await db.connect();
  try {
    const result = await client.query(`
      SELECT
        u.display_name,
        SUM(hrd.points) as total_score
      FROM heart_rate_data hrd
      JOIN users u ON hrd.user_id = u.id
      WHERE hrd.timestamp >= $1 AND hrd.timestamp <= $2
      GROUP BY u.display_name
      ORDER BY total_score DESC
      LIMIT 100;
    `, [start.toISOString(), end.toISOString()]);

    // Add rank
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      displayName: row.display_name,
      score: Number(row.total_score),
    }));

    return NextResponse.json({
      week: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
