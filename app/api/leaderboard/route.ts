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

  // Fetch all users first to ensure everyone is on the leaderboard
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("username, display_name")

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // Get aggregated heart rate data for the current week
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const startOfWeek = new Date(now.setDate(diff))
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfWeekISO = startOfWeek.toISOString()

  const { data: heartRateData, error: heartRateError } = await supabase
    .from("heart_rate_data")
    .select("username, points, bpm")
    .gte('timestamp', startOfWeekISO)

  if (heartRateError) {
    return NextResponse.json({ error: heartRateError.message }, { status: 500 })
  }

  // Aggregate heart rate data by username
  const aggregatedHeartRate = heartRateData.reduce((acc, curr) => {
    let user = acc.get(curr.username)
    if (!user) {
      user = {
        username: curr.username,
        total_points: 0,
        minutes: 0, // This is the total number of entries
        avg_bpm: 0,
        max_bpm: 0,
        total_bpm_for_avg: 0, // Helper for calculating running average
      }
      acc.set(curr.username, user)
    }

    user.total_points += curr.points || 0
    user.minutes += 1
    user.total_bpm_for_avg += curr.bpm || 0
    user.avg_bpm = Math.round(user.total_bpm_for_avg / user.minutes)
    user.max_bpm = Math.max(user.max_bpm, curr.bpm || 0)
    
    return acc
  }, new Map())

  // Fetch coins and fails from leaderboard_stats
  const { data: leaderboardStats, error: leaderboardStatsError } = await supabase
    .from("leaderboard_stats")
    .select("username, coins, fails")

  if (leaderboardStatsError) {
    console.error("Error fetching leaderboard_stats:", leaderboardStatsError)
    // Continue, will merge what we have
  }
  
  // Create a map for quick lookup
  const statsMap = new Map(leaderboardStats?.map(item => [item.username, { coins: item.coins, fails: item.fails }]))

  // Merge all data together, starting with the full user list
  const finalLeaderboard = users.map(user => {
    const hrData = aggregatedHeartRate.get(user.username)
    const stats = statsMap.get(user.username)
    
    return {
      username: user.display_name || user.username,
      total_points: hrData?.total_points || 0,
      minutes: hrData?.minutes || 0,
      avg_bpm: hrData?.avg_bpm || 0,
      max_bpm: hrData?.max_bpm || 0,
      coins: stats?.coins || 0,
      fails: stats?.fails || 0,
    }
  })

  // Sort by total points
  finalLeaderboard.sort((a, b) => b.total_points - a.total_points)

  // Calculate total fails for the prize pool
  const totalFails = leaderboardStats?.reduce((sum, entry) => sum + (entry.fails || 0), 0) || 0

  return NextResponse.json({ leaderboard: finalLeaderboard, total_fails: totalFails })
}
