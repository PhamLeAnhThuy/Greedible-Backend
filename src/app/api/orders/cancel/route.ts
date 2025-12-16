import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';
import { handleCorsOptions } from '@/src/lib/utils/cors';

export async function POST(request: Request) {
  try {
    // Allow customer token (not staff)
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'orderId is required' },
        { status: 400 }
      );
    }

    // Fetch current status
    const { data: order, error: fetchError } = await supabase
      .from('sale')
      .select('sale_id, status')
      .eq('sale_id', orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow cancel if status is Confirmed
    if (order.status !== 'Confirmed') {
      return NextResponse.json(
        {
          success: false,
          message: `Order cannot be cancelled when status is "${order.status}"`,
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('sale')
      .update({ status: 'Cancel' })
      .eq('sale_id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      status: 'Cancel',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: 'Error cancelling order',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}
