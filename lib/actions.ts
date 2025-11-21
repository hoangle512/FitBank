"use server"

import { createClient } from "./supabase/server"

// Define a type for our standings data for type safety.
export interface Standing {
  rank: number
  username: string
  score: number | bigint
  coins: number | bigint
  avatar: string | null
}

export async function getWeeklyStandings(): Promise<Standing[]> {
  const supabase = createClient()

  try {
    // Call the PostgreSQL function `get_weekly_standings` we created.
    const { data, error } = await supabase.rpc("get_weekly_standings")

    if (error) {
      console.error("Supabase RPC Error:", error)
      return []
    }

    // Add rank to each player based on their position in the sorted array.
    return (data || []).map((row, index) => ({
      ...row,
      rank: index + 1,
    })) as Standing[]
  } catch (error) {
    console.error("Database Error:", error)
    return []
  }
}