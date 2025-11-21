"use server"

import { createClient } from "@/utils/supabase/server";

// This interface represents the data shape returned by the RPC function from the DB.
interface StandingFromRpc {
  username: string
  score: number | string // Supabase might return BigInts as numbers or strings
  coins: number | string
  avatar: string | null
}

// Define a type for our standings data for frontend safety.
export interface Standing {
  rank: number
  username: string
  score: number
  coins: number
  avatar: string | null
}

export async function getWeeklyStandings(): Promise<Standing[]> {
  // 1. Await the client creation
  const supabase = await createClient()

  try {
    // 2. Call rpc without the generic <StandingFromRpc> 
    const { data, error } = await supabase.rpc("get_weekly_standings")

    if (error) {
      console.error("Supabase RPC Error:", error)
      return []
    }

    // 3. Cast data to our known type to help TypeScript
    const standingsData = data as StandingFromRpc[] | null

    // 4. Map and clean the data
    return (standingsData || []).map((row, index) => ({
      username: row.username,
      // Convert to Number to prevent BigInt serialization issues in Client Components
      score: Number(row.score), 
      coins: Number(row.coins),
      avatar: row.avatar,
      rank: index + 1,
    }))
  } catch (error) {
    console.error("Database Error:", error)
    return []
  }
}