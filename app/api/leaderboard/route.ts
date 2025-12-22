import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface HeartRateEntryData {
  timestamp: string;
  username: string;
  points: number;
  bpm: number;
}

interface StepsData {
  username: string;
  steps: number;
}

interface AggregatedUserData {
  username: string;
  total_points: number;
  minutes: number;
  max_bpm: number;
}

export async function GET() {
  const supabase = await createClient()

  // 1. Fetch target_points from app_settings
  const { data: allSettings, error: settingsError } = await supabase.rpc('get_app_settings');

  if (settingsError) {
    console.error("Supabase settings fetch error:", settingsError);
  }

  // Safe fallback if settings are missing
  const settingsData = Array.isArray(allSettings) ? allSettings : [];
  const targetPointsSetting = settingsData.find(s => s.key === 'target_points');
  const targetPointsValue = Number(targetPointsSetting?.value) || 0;

  // 2. Trigger calculation of fails/coins (side effect)
  const { error: rpcError } = await supabase.rpc('calculate_weekly_stats', {
    fail_threshold: targetPointsValue
  });

  if (rpcError) {
    console.error("Supabase RPC calculate_weekly_stats error:", rpcError);
  }

  // 3. Fetch Users
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("username, display_name")

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // 4. Calculate Date Range (Start of Week: Monday)
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const startOfWeek = new Date(now.setDate(diff))
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfWeekISO = startOfWeek.toISOString()

  // 5. Fetch Heart Rate Data
  // Check against heart rate data table directly
  const { data: heartRateDataRaw, error: heartRateError } = await supabase
    .from('heart_rate_data')
    .select('*')
    .gte('timestamp', startOfWeekISO);

  if (heartRateError) {
    return NextResponse.json({ error: heartRateError.message }, { status: 500 })
  }

  // Filter for current week only (Redundant but safe if DB query fails to filter correctly, though .gte should handle it)
  const heartRateData = (heartRateDataRaw || []).filter((entry: HeartRateEntryData) =>
    new Date(entry.timestamp).getTime() >= startOfWeek.getTime()
  );

  // 6. Fetch Steps Data
  const { data: stepsDataRaw, error: stepsError } = await supabase.rpc('get_steps_data_weekly', { startofweekiso: startOfWeekISO });

  if (stepsError) {
    console.error("Supabase steps_data fetch error:", stepsError);
    // We don't return 500 here, we just continue with empty steps to avoid breaking the whole page
  }

  const stepsData: StepsData[] = Array.isArray(stepsDataRaw) ? stepsDataRaw : [];

  // 7. Aggregate Steps
  const aggregatedSteps = stepsData.reduce((acc: Record<string, number>, curr: StepsData) => {
    if (curr.username) {
      acc[curr.username] = (acc[curr.username] || 0) + (curr.steps || 0);
    }
    return acc;
  }, {} as Record<string, number>);

  // New: Aggregate Points from Steps
  const aggregatedStepsPoints = stepsData.reduce((acc: Record<string, number>, curr: StepsData) => {
    if (curr.username) {
      const pointsFromSteps = Math.floor((curr.steps || 0) / 200); // 1 point for every 200 steps, rounded down
      acc[curr.username] = (acc[curr.username] || 0) + pointsFromSteps;
    }
    return acc;
  }, {} as Record<string, number>);

  // 8. Aggregate Heart Rate (Minutes & Points)
  const aggregatedHeartRate = heartRateData.reduce((acc: Map<string, AggregatedUserData>, curr: HeartRateEntryData) => {
    // Skip if username is missing
    if (!curr.username) return acc;

    let user = acc.get(curr.username)

    if (!user) {
      user = {
        username: curr.username,
        total_points: 0,
        minutes: 0,
        max_bpm: 0,
      } as AggregatedUserData;
      acc.set(curr.username, user)
    }

    user.total_points += (curr.points || 0)

    // Calculate Minutes: Assuming 1 record = 1 minute if points > 0
    // If your data is granular (seconds), this logic needs changing.
    if (curr.points && curr.points >= 1) {
      user.minutes += 1
    }

    user.max_bpm = Math.max(user.max_bpm, curr.bpm || 0)

    return acc
  }, new Map())

  // 9. Fetch Leaderboard Stats (Coins/Fails)
  const { data: leaderboardStats, error: leaderboardStatsError } = await supabase
    .from("leaderboard_stats")
    .select("username, coins, fails")

  if (leaderboardStatsError) {
    console.error("Supabase leaderboard_stats fetch error:", leaderboardStatsError)
  }

  // Create a quick lookup map for stats
  const statsMap = new Map((leaderboardStats || []).map(item => [item.username, item]))

  // 10. Combine Everything
  const finalLeaderboard = users.map(user => {
    // Fix: Look up directly by username (unique ID) instead of display_name
    const hrData = aggregatedHeartRate.get(user.username);

    const stats = statsMap.get(user.username);
    const stepsPoints = aggregatedStepsPoints[user.username] || 0;

    return {
      id: user.username,
      username: user.display_name || "Unknown",
      total_points: (hrData?.total_points || 0) + stepsPoints,
      minutes: hrData?.minutes || 0,
      max_bpm: hrData?.max_bpm || 0,
      total_steps_weekly: aggregatedSteps[user.username] || 0,
      coins: stats?.coins || 0,
      fails: stats?.fails || 0,
    }
  })
  // Sort by total points (Descending)
  finalLeaderboard.sort((a, b) => b.total_points - a.total_points)

  // Calculate prize pool
  const totalFails = (leaderboardStats || []).reduce((sum, entry) => sum + (entry.fails || 0), 0)

  return NextResponse.json({ leaderboard: finalLeaderboard, total_fails: totalFails })
}