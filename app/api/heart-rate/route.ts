import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculatePointsForBpm } from "@/lib/scoring"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("heart_rate_data")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Fetch z1, z2, z3 from app_settings
  const { data: settingsData, error: settingsError } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['z1', 'z2', 'z3']);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const settings = settingsData.reduce((acc, item) => {
    acc[item.key] = parseInt(item.value, 10);
    return acc;
  }, {});

  const z1 = settings.z1 || 120; // Default if not found
  const z2 = settings.z2 || 145; // Default if not found
  const z3 = settings.z3 || 160; // Default if not found

  // Calculate points
  const points = calculatePointsForBpm(body.bpm, z1, z2, z3);

  const { data, error } = await supabase.from("heart_rate_data").insert([{ ...body, points }]).select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
