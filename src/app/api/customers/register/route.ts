import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/customers/register:
 *   post:
 *     summary: Register a new customer
 *     description: Creates a new customer account with full address details after validating phone, email, and required fields.
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_name
 *               - phone
 *               - email
 *               - password
 *               - ward
 *               - district
 *               - street
 *               - house_number
 *             properties:
 *               customer_name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *               ward:
 *                 type: string
 *                 example: "Ward 5"
 *               district:
 *                 type: string
 *                 example: "District 1"
 *               street:
 *                 type: string
 *                 example: "Nguyen Trai"
 *               house_number:
 *                 type: string
 *                 example: "123A"
 *               building_name:
 *                 type: string
 *                 nullable: true
 *                 example: "Sunrise Building"
 *               block:
 *                 type: string
 *                 nullable: true
 *                 example: "Block B"
 *               floor:
 *                 type: string
 *                 nullable: true
 *                 example: "10"
 *               room_number:
 *                 type: string
 *                 nullable: true
 *                 example: "1005"
 *     responses:
 *       201:
 *         description: Successfully registered customer
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
 *                   example: "Customer registered successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     customer_id:
 *                       type: integer
 *                       example: 12
 *                     customer_name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john@example.com"
 *                     phone:
 *                       type: string
 *                       example: "0987654321"
 *                     loyalty_point:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: Validation error (phone/email invalid or already exists)
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
 *                   example: "Email already registered"
 *       500:
 *         description: Server error during registration
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
 *                   example: "Error registering customer"
 */


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
