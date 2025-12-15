import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

export async function PUT(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const { name, email, phone } = await request.json();

    if (!name && !email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('customer')
      .update({ customer_name:name, email, phone })
      .eq('customer_id', authResult.user!.customer_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'User information updated successfully',
      name,
      email,
      phone
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Error updating information' },
      { status: 500 }
    );
  }
}
