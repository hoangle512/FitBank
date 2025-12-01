// app/api/users/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name');

  if (error) {
    console.error("Supabase users fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    const { users } = await request.json();

    if (!Array.isArray(users)) {
      return NextResponse.json({ error: "Invalid payload: 'users' must be an array." }, { status: 400 });
    }

    const updates = users.map(user => 
      supabase
        .from('users')
        .update({ display_name: user.display_name })
        .eq('id', user.username) // Assuming user.username from payload refers to the user's id
    );

    const results = await Promise.all(updates);
    
    const errors = results.map(r => r.error).filter(Boolean);

    if (errors.length > 0) {
      console.error("Errors updating user aliases:", errors);
      // We can decide to make this transactional or just report first error
      return NextResponse.json({ error: `Failed to update one or more users. First error: ${errors[0]?.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "User aliases updated successfully." });

  } catch (err: unknown) {
    console.error("Error in POST /api/users:", err);
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
