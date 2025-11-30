import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';
import jwt from 'jsonwebtoken';

/**
 * @swagger
 * /api/customer/signin:
 *   post:
 *     summary: Customer login
 *     description: Authenticates a customer using email and password. Returns a JWT token on success.
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *     responses:
 *       200:
 *         description: Successfully authenticated customer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sign in successful"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   description: Customer data excluding password
 *                   example:
 *                     customer_id: 12
 *                     customer_name: "John Doe"
 *                     email: "john@example.com"
 *                     phone: "0987654321"
 *                     ward: "Ward 5"
 *                     district: "District 1"
 *                     street: "Nguyen Trai"
 *                     loyalty_point: 50
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email and password are required."
 *       401:
 *         description: Invalid login credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password."
 *       500:
 *         description: Server error during login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error signing in customer"
 */


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
