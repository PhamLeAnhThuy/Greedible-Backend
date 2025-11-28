import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { paymentService } from '@/src/lib/services/paymentService';

/**
 * @swagger
 * /api/payments/momo/callback:
 *   post:
 *     summary: MoMo payment callback
 *     description: Webhook endpoint for MoMo to send payment status updates.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Callback processed
 *       500:
 *         description: Server error
 */

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Verify signature
    if (!paymentService.verifyMoMoCallback(data)) {
      return NextResponse.json({
        resultCode: '1',
        message: 'Invalid signature'
      }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Update order status based on payment result
    const paymentStatus = data.resultCode === '0' ? 'Paid' : 'Failed';
    
    await supabase
      .from('sale')
      .update({ 
        payment_status: paymentStatus, 
        payment_transaction_id: data.transId 
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
      resultCode: '0',
      message: 'Success'
    });
  } catch (error) {
    console.error('MoMo callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      resultCode: '1',
      message: errorMessage
    }, { status: 500 });
  }
}
