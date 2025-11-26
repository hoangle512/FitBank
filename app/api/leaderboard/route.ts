import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // Fetch target_points from app_settings
  const { data: settingsData, error: settingsError } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['start_date', 'target_points']); // Fetch both if needed, or just target_points

  if (settingsError) {
    console.error("Error fetching app_settings:", settingsError);
    // Decide how to handle this error
  }

  const targetPointsSetting = settingsData?.find(s => s.key === 'target_points');
  const targetPointsValue = Number(targetPointsSetting?.value) || 0; // Default to 0 if not found or invalid

  // First, call the RPC to calculate/update weekly stats
  const { error: rpcError } = await supabase.rpc('calculate_weekly_stats', {
    fail_threshold: targetPointsValue
  });
  if (rpcError) {
    console.error("Error calling calculate_weekly_stats RPC:", rpcError);
    // Continue fetching other data, as the RPC might not be critical for *display* if stats are pre-calculated
    // Or handle this error more strictly if RPC failure should halt leaderboard display
  }

  // Get aggregated heart rate data
  // Calculate the start of the current week (Monday)
  const now = new Date();
  const day = now.getDay(); // 0 for Sunday, 1 for Monday
  // Adjust to the most recent Monday. If today is Monday, it will be today's Monday.
  // If today is Sunday, it will go back to the previous Monday.
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0); // Set to the very beginning of Monday
  const startOfWeekISO = startOfWeek.toISOString(); // Format for Supabase filter

  const { data: heartRateData, error: heartRateError } = await supabase
    .from("heart_rate_data")
    .select("username, points, bpm")
    .gte('timestamp', startOfWeekISO) // Filter for current week
    .order("points", { ascending: false })

  if (heartRateError) {
    return NextResponse.json({ error: heartRateError.message }, { status: 500 })
  }

  // Aggregate heart rate data by username
  const aggregatedHeartRate = heartRateData.reduce((acc, curr) => {
    const existing = acc.find((item) => item.username === curr.username)
    if (existing) {
      existing.total_points += curr.points || 0
      existing.readings += 1
      existing.avg_bpm = Math.round((existing.avg_bpm * (existing.readings - 1) + (curr.bpm || 0)) / existing.readings)
      existing.max_bpm = Math.max(existing.max_bpm, curr.bpm || 0)
    } else {
      acc.push({
        username: curr.username,
        total_points: curr.points || 0,
        readings: 1,
        avg_bpm: curr.bpm || 0,
        max_bpm: curr.bpm || 0,
      })
    }
    return acc
  }, [] as any[]) // Explicitly type acc as any[]

  // Fetch coins and fails from leaderboard_stats
  const { data: leaderboardStats, error: leaderboardStatsError } = await supabase
    .from("leaderboard_stats")
    .select("username, coins, fails")

  if (leaderboardStatsError) {
    console.error("Error fetching leaderboard_stats:", leaderboardStatsError);
    // Decide how to handle this error: return partial data, or an error response
    // For now, we'll proceed and merge what we have, possibly leaving coins/fails as undefined
  }

  // Merge aggregated heart rate data with leaderboard stats
  const finalLeaderboard = aggregatedHeartRate.map(hrEntry => {
    const stats = leaderboardStats?.find(lsEntry => lsEntry.username === hrEntry.username);
    return {
      ...hrEntry,
      coins: stats?.coins || 0,
      fails: stats?.fails || 0,
    };
  });

  // Sort by total points
  finalLeaderboard.sort((a, b) => b.total_points - a.total_points)

  // Calculate total fails for the prize pool
  const totalFails = leaderboardStats?.reduce((sum, entry) => sum + (entry.fails || 0), 0) || 0;

  return NextResponse.json({ leaderboard: finalLeaderboard, total_fails: totalFails })
}
