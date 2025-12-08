import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/orders/{orderId}/complete:
 *   put:
 *     summary: Mark customer order as completed
 *     description: Mark a customer's order as completed and award loyalty points.
 *     tags: [Orders]
 *     security:
 *       - Bearer: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Order marked as completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    // IMPORTANT: Next.js 15 requires awaiting params
    const { id: orderId } = await context.params;

    // Ensure the order belongs to the authenticated customer
    const { data: order, error: orderError } = await supabase
      .from('sale')
      .select('*')
      .eq('sale_id', orderId)
      .eq('customer_id', authResult.user!.customer_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, message: 'Order not found or not authorized' },
        { status: 404 }
      );
    }

    // Loyalty points: 1 point per 1000 VND
    const loyaltyPointsEarned = Math.floor(order.total_amount / 1000);

    // Update order status
    const { error: updateError } = await supabase
      .from('sale')
      .update({
        status: 'Completed',
        completion_time: new Date().toISOString()
      })
      .eq('sale_id', orderId);

    if (updateError) throw updateError;

    // Update customer loyalty points
    const { error: loyaltyError } = await supabase
      .from('customer')
      .update({
        loyalty_point: { increment: loyaltyPointsEarned }
      })
      .eq('customer_id', authResult.user!.customer_id);

    if (loyaltyError) throw loyaltyError;

    return NextResponse.json({
      success: true,
      message: 'Order marked as completed',
      loyaltyPointsEarned
    });
  } catch (error) {
    console.error('Error completing order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: 'Error completing order',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
