import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  console.log('Received sign in request');
  try {
    const { email, password } = await request.json();

    const supabase = await createServerClient();

    // Find user by email
    const { data: users, error: dbError } = await supabase
      .from('customer')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    console.log('Found users:', users && users.length > 0 ? 'Yes' : 'No');

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    const user = users[0];
    console.log('User found:', {
      id: user.customer_id,
      email: user.email,
      passwordType: user.password.startsWith('$2') ? 'hashed' : 'plain'
    });

    let passwordMatch = false;

    // Check if password is hashed (starts with $2)
    if (user.password.startsWith('$2')) {
      console.log('Comparing with bcrypt');
      // Compare with bcrypt
      passwordMatch = await bcrypt.compare(password, user.password);
      console.log('Bcrypt comparison result:', passwordMatch);
    } else {
      console.log('Comparing plain text passwords');
      // Compare plain text password
      passwordMatch = password === user.password;
      console.log('Plain text comparison result:', passwordMatch);
      
      // If password matches and is plain text, hash it and update the database
      if (passwordMatch) {
        console.log('Password matched, hashing and updating...');
        const hashedPassword = await bcrypt.hash(password, 10);
        const { error: updateError } = await supabase
          .from('customer')
          .update({ password: hashedPassword })
          .eq('customer_id', user.customer_id);

        if (updateError) {
          console.error('Error updating password:', updateError);
        } else {
          console.log('Password updated to hashed version');
        }
      }
    }

    if (!passwordMatch) {
      console.log('Password did not match');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Create token
    const token = jwt.sign(
      { 
        id: user.customer_id,
        email: user.email,
        type: 'customer'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    console.log('Sign in successful, token generated');

    // Return user data (excluding password) and token
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      message: 'Sign in successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error signing in:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error signing in',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}