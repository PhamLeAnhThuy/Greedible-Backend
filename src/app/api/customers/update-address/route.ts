import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

export async function PUT(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { address } = await request.json();

    if (!address || !address.ward || !address.district || !address.street || !address.houseNumber) {
      return NextResponse.json({ success: false, message: 'Required address fields are missing' }, { status: 400 });
    }

    const addressJson = JSON.stringify(address);

    const supabase = await createServerClient();

    const { error: updateError } = await supabase
      .from('customer')
      .update({ address: addressJson })
      .eq('customer_id', authResult.user!.customer_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Address updated successfully', address });
  } catch (error) {
    console.error('Error updating address:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error updating address', error: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
