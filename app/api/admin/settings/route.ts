// app/api/admin/settings/route.ts
import { createClient } from "@/lib/supabase/server"; // or your client path
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_settings')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = data.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

  // Define default settings
  const defaultSettings = {
    competition_name: "FitBank Challenge 2024",
    target_points: "500",
    z1: "125",
    z2: "150",
    z3: "165",
    start_date: new Date().toISOString().split('T')[0], // Today's date
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    prize_pool_adjustment: "0",
  };

  // Merge fetched settings with defaults, prioritizing fetched settings
  const finalSettings = { ...defaultSettings, ...settings };

  return NextResponse.json(finalSettings);
}

export async function POST(request: Request) {

  const supabase = await createClient();



  try {

    const { competition_name, target_points, z1, z2, z3, start_date, end_date, prize_pool_adjustment } = await request.json();



    const settingsToUpdate = [

      { key: 'competition_name', value: competition_name },

      { key: 'target_points', value: target_points?.toString() },

      { key: 'z1', value: z1?.toString() },

      { key: 'z2', value: z2?.toString() },

      { key: 'z3', value: z3?.toString() },

      { key: 'start_date', value: start_date },

      { key: 'end_date', value: end_date },

      { key: 'prize_pool_adjustment', value: prize_pool_adjustment?.toString() },

    ];



    for (const setting of settingsToUpdate) {

      if (setting.value !== undefined && setting.value !== null) {

        const { error } = await supabase

          .from('app_settings')

          .upsert({ key: setting.key, value: setting.value });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      }

    }



    // 2. Recalculate stats using the new threshold

    const { error: rpcError } = await supabase.rpc('calculate_weekly_stats', {

      fail_threshold: target_points

    });



    if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });



    return NextResponse.json({ success: true });

  } catch (err: unknown) {

    console.error("Error in POST /api/admin/settings:", err);

    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });

  }

}
