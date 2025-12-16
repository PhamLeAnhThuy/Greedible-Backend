import { NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateToken } from '@/src/lib/auth/middleware';
import { handleCorsOptions } from '@/src/lib/utils/cors';

// Status progression chain
const STATUS_FLOW = ['Confirmed', 'Preparing', 'Ready', 'Delivering', 'Completed'] as const;
type OrderStatus = (typeof STATUS_FLOW)[number];

export async function POST(request: Request) {
  try {
    const authResult = await authenticateToken(request);
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

    // Fetch current order status
    const { data: order, error: orderError } = await supabase
      .from('sale')
      .select('sale_id, status')
      .eq('sale_id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const currentStatus = order.status as OrderStatus;
    
    // If already completed, just notify
    if (currentStatus === 'Completed') {
      return NextResponse.json({
        success: true,
        message: 'Order is already completed',
        status: currentStatus,
      });
    }

    const currentIndex = STATUS_FLOW.indexOf(currentStatus);

    if (currentIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          message: `Order status "${order.status}" cannot be advanced automatically`,
        },
        { status: 400 }
      );
    }

    const nextStatus = STATUS_FLOW[currentIndex + 1] ?? 'Completed';

    const updatePayload: any = { status: nextStatus };
    if (currentStatus === 'Delivering' && nextStatus === 'Completed') {
        updatePayload.completion_time = new Date().toISOString();
        updatePayload.payment_status = 'Paid';
      }
    
    const { error: updateError } = await supabase
      .from('sale')
      .update(updatePayload)
      .eq('sale_id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${nextStatus}`,
      status: nextStatus,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: 'Error updating order status',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return handleCorsOptions();
}


