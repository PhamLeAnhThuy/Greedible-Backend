import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";
import bcrypt from "bcryptjs";

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("staff")
      .insert([
        {
          staff_name,
          staff_email,
          password: hashedPassword, // store hashed password
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

    // Never return password (even hashed)
    delete (data as any).password;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const {id} = body; 

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing staff_id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("staff_id", Number(id));

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Staff deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to delete staff" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, staff_name, staff_email, password, role, phone, pay_rates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing staff_id" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (staff_name !== undefined) updateData.staff_name = staff_name;
    if (staff_email !== undefined) updateData.staff_email = staff_email;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (pay_rates !== undefined) updateData.pay_rates = pay_rates;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields provided to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("staff")
      .update(updateData)
      .eq("staff_id", Number(id))
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    // Never return password
    if (data && (data as any).password) delete (data as any).password;

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Failed to update staff" },
      { status: 500 }
    );
  }
}