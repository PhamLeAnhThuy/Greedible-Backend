import { NextResponse } from 'next/server';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';
import { createServerClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Authenticate customer token
    const { user, error: authError } = await authenticateCustomerToken(request);
    
    if (authError) {
      return NextResponse.json(
        {
          success: false,
          message: authError.message
        },
        { status: authError.status }
      );
    }

    const supabase = await createServerClient();

    // Get user data from database
    const { data: users, error: dbError } = await supabase
      .from('customer')
      .select('customer_id, customer_name, email, phone, loyalty_point, address')
      .eq('customer_id', user.customer_id)
      .limit(1);

    if (dbError) {
      throw dbError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found'
        },
        { status: 404 }
      );
    }

    const userData = users[0];
    
    // Parse the address if it exists
    let address = null;
    if (userData.address) {
      try {
        address = JSON.parse(userData.address);
      } catch (e) {
        console.error('Error parsing address:', e);
      }
    }

    // Split customer_name into firstName and lastName
    const nameParts = userData.customer_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    // Format user data
    const formattedUser = {
      id: userData.customer_id,
      firstName,
      lastName,
      email: userData.email,
      contactMobile: userData.phone,
      loyaltyPoints: userData.loyalty_point,
      address
    };

    return NextResponse.json({
      success: true,
      user: formattedUser
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching user profile',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}