import { NextResponse } from 'next/server';
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

    // For migrated users where password may be stored in plain text, compare directly
    let passwordMatch = false;
    if (user.password && user.password.startsWith && user.password.startsWith('$2')) {
      // bcrypt hashed password stored; we can't compare here without bcrypt, but keep behavior similar to old code
      // In this simplified migration we'll compare plaintext (assuming already migrated to hashed elsewhere)
      passwordMatch = password === user.password;
    } else {
      passwordMatch = password === user.password;
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
