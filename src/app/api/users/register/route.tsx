import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';

export async function POST(request: Request) {
  console.log('Received registration request');
  try {
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      contactMobile,
      address
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !contactMobile) {
      return NextResponse.json(
        {
          success: false,
          message: 'All fields are required'
        },
        { status: 400 }
      );
    }

    console.log('Checking for existing user with email:', email);
    const supabase = await createServerClient();

    // Check if email or contact mobile already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('customer')
      .select('*')
      .or(`email.eq.${email},phone.eq.${contactMobile}`)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingUsers && existingUsers.length > 0) {
      const duplicate = existingUsers[0];
      let message = 'User with this information already exists';
      if (duplicate.email === email) {
        message = 'Email already registered';
      } else if (duplicate.phone === contactMobile) {
        message = 'Contact mobile already registered';
      }
      console.log('Duplicate user found:', duplicate);
      return NextResponse.json(
        {
          success: false,
          message
        },
        { status: 400 }
      );
    }

    console.log('Hashing password...');
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert address object to JSON string
    const addressJson = address ? JSON.stringify(address) : null;
    console.log('Prepared address JSON:', addressJson);

    console.log('Attempting to insert new user...');
    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('customer')
      .insert({
        customer_name: `${firstName} ${lastName}`,
        phone: contactMobile,
        password: hashedPassword,
        email: email,
        loyalty_point: 0,
        address: addressJson
      })
      .select('customer_id, customer_name, email, phone, loyalty_point, address')
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log('New user data:', newUser);

    // Parse the address back to an object for the response
    const userData = {
      ...newUser,
      address: newUser.address ? JSON.parse(newUser.address) : null
    };

    console.log('Sending successful response...');
    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: userData
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error registering user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error registering user',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}