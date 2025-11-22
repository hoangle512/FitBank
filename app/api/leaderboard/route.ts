import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // Get aggregated leaderboard data
  const { data, error } = await supabase
    .from("heart_rate_data")
    .select("username, points, bpm")
    .order("points", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate by username
  const leaderboard = data.reduce((acc: any[], curr) => {
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
  }, [])

  // Sort by total points
  leaderboard.sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json(leaderboard)
}
