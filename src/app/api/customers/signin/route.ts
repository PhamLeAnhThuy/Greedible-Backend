import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
    }

    const supabase = await createServerClient();

    const { data: users, error: dbError } = await supabase
      .from('customer')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    const user = users[0];

    let passwordMatch = false;

    // Check if password is hashed (starts with $2)
    if (user.password && user.password.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Compare plain text password
      passwordMatch = password === user.password;

      // If password matches and is plain text, hash it and update the database
      if (passwordMatch) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await supabase
          .from('customer')
          .update({ password: hashedPassword })
          .eq('customer_id', user.customer_id);
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
    }

    const token = jwt.sign({ id: user.customer_id, email: user.email, type: 'customer' }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ success: true, message: 'Sign in successful', token, user: userWithoutPassword });
  } catch (error) {
    console.error('Error signing in customer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error signing in customer', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
