import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_name,
      phone,
      email,
      password,
      ward,
      district,
      street,
      house_number,
      building_name,
      block,
      floor,
      room_number
    } = body;

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone must not be empty.' }, { status: 400 });
    }
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ success: false, message: 'Phone must be a number with exactly 10 digits.' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email cannot be empty.' }, { status: 400 });
    }
    if (!ward) {
      return NextResponse.json({ success: false, message: 'Ward cannot be empty.' }, { status: 400 });
    }
    if (!district) {
      return NextResponse.json({ success: false, message: 'District cannot be empty.' }, { status: 400 });
    }
    if (!street) {
      return NextResponse.json({ success: false, message: 'Street cannot be empty.' }, { status: 400 });
    }
    if (!customer_name || !password || !house_number) {
      return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format.' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Check if email or phone already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('customer')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingUsers && existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      let message = 'User with this information already exists';
      if (duplicate.email === email) {
        message = 'Email already registered';
      } else if (duplicate.phone === phone) {
        message = 'Phone already registered';
      }
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from('customer')
      .insert({
        customer_name,
        phone,
        email,
        password: hashedPassword,
        ward,
        district,
        street,
        house_number,
        building_name,
        block,
        floor,
        room_number
      })
      .select('customer_id, customer_name, email, phone, loyalty_point')
      .single();

    if (insertError) {
      console.error('Error inserting customer:', insertError);
      return NextResponse.json({ success: false, message: 'Error registering customer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Customer registered successfully', user: newUser }, { status: 201 });
  } catch (err) {
    console.error('Error registering customer:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error registering customer', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
