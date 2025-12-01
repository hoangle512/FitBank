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
    console.error("Supabase settings fetch error:", settingsError);
  }

  const targetPointsSetting = settingsData?.find(s => s.key === 'target_points');
  const targetPointsValue = Number(targetPointsSetting?.value) || 0;

  const { error: rpcError } = await supabase.rpc('calculate_weekly_stats', {
    fail_threshold: targetPointsValue
  });
  if (rpcError) {
    console.error("Supabase RPC calculate_weekly_stats error:", rpcError);
  }

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, display_name")

  if (usersError) {
    console.error("Supabase users fetch error:", usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

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
    console.error("Supabase heart_rate_data fetch error:", heartRateError);
    return NextResponse.json({ error: heartRateError.message }, { status: 500 })
  }

  const aggregatedHeartRate = heartRateData.reduce((acc, curr) => {
    let user = acc.get(curr.username)
    if (!user) {
      user = {
        username: curr.username,
        total_points: 0,
        minutes: 0,
        avg_bpm: 0,
        max_bpm: 0,
        total_bpm_for_avg: 0,
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

  const { data: leaderboardStats, error: leaderboardStatsError } = await supabase
    .from("leaderboard_stats")
    .select("username, coins, fails")

  if (leaderboardStatsError) {
    console.error("Supabase leaderboard_stats fetch error:", leaderboardStatsError)
  }
  
  const statsMap = new Map(leaderboardStats?.map(item => [item.username, { coins: item.coins, fails: item.fails }]))

  const finalLeaderboard = users.map(user => {
    // Assuming heart_rate_data.username and leaderboard_stats.username link to users.display_name
    const hrData = Array.from(aggregatedHeartRate.values()).find(hr => hr.username === user.display_name);
    const stats = statsMap.get(user.display_name);
    
    return {
      id: user.id, // Use the actual user ID from the users table
      username: user.display_name || user.id, // Display name as username, fallback to id
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
