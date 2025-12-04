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
      score: Number(row.score) || 0, 
      coins: Number(row.coins) || 0,
      avatar: row.avatar,
      rank: index + 1,
    }))
  } catch (error) {
    console.error("Database Error:", error)
    return []
  }
}

interface StepData {
  username: string;
  timestamp: string;
  steps: number;
  points: number;
}

export async function updateStepData(finalInsertPayload: StepData[]) {
  const supabase = await createClient();

  // Perform upsert for users in a single batch
  const { error: userUpsertError } = await supabase
    .from('users')
    .upsert(
      Array.from(new Set(finalInsertPayload.map((p) => p.username))).map((username) => ({ username, display_name: username }))
    );

  if (userUpsertError) {
    console.error("Supabase user upsert error:", userUpsertError);
    throw userUpsertError;
  }

  const { error: upsertError } = await supabase.from('steps_data').upsert(finalInsertPayload, { onConflict: ['username', 'timestamp'] });

  if (upsertError) {
    console.error("Supabase upsert error:", upsertError);
    throw upsertError;
  }
}

export async function getStepData(username: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('steps_data')
    .select('*')
    .eq('username', username)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Error fetching step data:", error);
    throw error;
  }
  return data;
}