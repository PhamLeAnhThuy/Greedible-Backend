import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const supabase = await createServerClient();

    const { data: users, error: dbError } = await supabase
      .from('customer')
      .select('customer_id, customer_name, email, phone, loyalty_point, address')
      .eq('customer_id', authResult.user!.customer_id)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    let address = null;
    if (user.address) {
      try {
        address = typeof user.address === 'string' ? JSON.parse(user.address) : user.address;
      } catch (e) {
        console.error('Error parsing address:', e);
      }
    }

    const nameParts = user.customer_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    const formattedUser = {
      id: user.customer_id,
      firstName,
      lastName,
      email: user.email,
      contactMobile: user.phone,
      loyaltyPoints: user.loyalty_point,
      address
    };

    return NextResponse.json({ success: true, user: formattedUser });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error fetching user profile', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
