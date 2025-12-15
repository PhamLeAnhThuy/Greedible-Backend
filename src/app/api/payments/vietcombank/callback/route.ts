import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { paymentService } from '@/src/lib/services/paymentService';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Verify signature
    if (!paymentService.verifyVietcombankCallback(data)) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid signature'
      }, { status: 400 });
    }



    // Update order status based on payment result
    const paymentStatus = data.status === 'success' ? 'Paid' : 'Failed';

    await supabase
      .from('sale')
      .update({ 
        payment_status: paymentStatus, 
        payment_transaction_id: data.transactionId 
      })
      .eq('sale_id', data.orderId);

    // If payment is successful, mark order as completed
    if (paymentStatus === 'Paid') {
      await supabase
        .from('sale')
        .update({ 
          status: 'Completed', 
          completion_time: new Date().toISOString() 
        })
        .eq('sale_id', data.orderId);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('Vietcombank callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      status: 'error',
      message: errorMessage
    }, { status: 500 });
  }
}
