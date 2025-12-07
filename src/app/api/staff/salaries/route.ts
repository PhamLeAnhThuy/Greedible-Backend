import { NextResponse } from "next/server";
import { authenticateToken } from "@/src/lib/auth/middleware";
import { supabase } from "@/src/lib/supabase/client";

export async function GET(request: Request) {
  const auth = await authenticateToken(request);

  if (auth.error) return NextResponse.json(auth.error, { status: auth.error.status });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!month || !year) {
    return NextResponse.json({ success: false, message: "Month and year are required." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_staff_salaries", {
    p_month: Number(month),
    p_year: Number(year),
  });

  if (error) {
    return NextResponse.json({ success: false, message: "Error fetching employee salaries" }, { status: 500 });
  }

  return NextResponse.json({ success: true, employees: data });
}
