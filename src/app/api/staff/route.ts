import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { staff_name, staff_email, password, role, phone, pay_rates } = body;

    // Basic validation
    if (!staff_name || !staff_email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("staff")
      .insert([
        {
          staff_name,
          staff_email,
          password,
          role,
          phone: phone || null,
          pay_rates: pay_rates || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 500 }
    );
  }
}
