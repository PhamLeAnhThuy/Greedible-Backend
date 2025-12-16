import { NextResponse } from "next/server";
import { authenticateToken } from "@/src/lib/auth/middleware";
import { supabase } from "@/src/lib/supabase/client";

export async function GET(request: Request) {
  const auth = await authenticateToken(request);

  if (auth.error) {
    return NextResponse.json(auth.error, { status: auth.error.status });
  }

  // assume auth.user.staff_id exists
  const { data, error } = await supabase
    .from("staff")
    .select(`
      staff_id,
      staff_name,
      staff_email,
      role,
      phone,
      pay_rates
    `)
    .eq("staff_id", auth.user.staff_id)
    .single();

  if (error) {
    return NextResponse.json(
      { message: "Failed to fetch staff information" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
