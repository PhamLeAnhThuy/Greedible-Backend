import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from "@/src/lib/auth/middleware";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    // 1. Find staff by email
    const { data: staff, error } = await supabase
      .from("staff")
      .select("*")
      .eq("staff_email", email)
      .single();
    
    if (!staff) {
      return NextResponse.json(
        { message: "Invalid email or password " },
        
        { status: 401 }
      );
    }

    // 2. Verify password
    const validPassword = await bcrypt.compare(password, staff.password);
    if (!validPassword) {
      return NextResponse.json(
        { message: "Invalid email or password"
         },
        { status: 401 }
      );
    }

    // 3. Generate token with expiration (24 hours)
    const token = jwt.sign(
      {
        id: staff.staff_id,
        email: staff.staff_email,
        role: staff.role,
        type: "staff",
        name: staff.staff_name, // Include name in token
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    // 4. Inject token back into request → authenticateToken
    const authCheck = await authenticateToken(
      new Request(request.url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
    );

    if (authCheck.error) {
      return NextResponse.json(authCheck.error, { status: authCheck.error.status });
    }

    // 5. Return token + verified user payload
    return NextResponse.json({
      token,
      user: authCheck.user,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
