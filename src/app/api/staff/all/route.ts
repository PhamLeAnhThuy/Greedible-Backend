import { NextResponse } from "next/server";
import { authenticateToken } from "@/src/lib/auth/middleware";
import { supabase } from "@/src/lib/supabase/client";

export async function GET(request: Request) {
  const auth = await authenticateToken(request);
  if (auth.error) return NextResponse.json(auth.error, { status: auth.error.status });

  const { data, error } = await supabase
    .from("staff")
    .select("staff_id, staff_name, staff_email, role, phone");

  if (error) {
    return NextResponse.json({ success: false, message: "Error fetching staff members" }, { status: 500 });
  }

  return NextResponse.json({ success: true, staff: data });
}
