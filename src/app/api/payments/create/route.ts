import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateToken } from '@/src/lib/auth/middleware';
import { paymentService } from '@/src/lib/services/paymentService';

export async function POST(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const body = await request.json();
    const { orderId, paymentMethod } = body;

    if (!orderId || !paymentMethod) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('sale')
      .select('*')
      .eq('sale_id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    const orderInfo = `Payment for order #${orderId}`;
    let paymentData;

    if (paymentMethod === 'momo') {
      paymentData = await paymentService.createMoMoPayment(
        orderId,
        order.total_amount,
        orderInfo
      );
    } else if (paymentMethod === 'vietcombank') {
      paymentData = await paymentService.createVietcombankPayment(
        orderId,
        order.total_amount,
        orderInfo
      );
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid payment method'
      }, { status: 400 });
    }

    // Update order with payment information
    await supabase
      .from('sale')
      .update({ payment_method: paymentMethod, payment_status: 'Pending' })
      .eq('sale_id', orderId);

    return NextResponse.json({
      success: true,
      paymentUrl: paymentData.payUrl || paymentData.redirectUrl
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: errorMessage
    }, { status: 500 });
  }
}
