import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/orders/guest/complete/{orderId}:
 *   put:
 *     summary: Mark guest order as completed
 *     description: Mark a guest order as completed (no loyalty points).
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Guest order marked as completed
 *       404:
 *         description: Order not found or not a guest order
 *       500:
 *         description: Server error
 */

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: orderId } = params;

    const supabase = await createServerClient();

    // Get order with customer info
    const { data: order, error: orderError } = await supabase
      .from('sale')
      .select(`
        *,
        customer:customer_id(customer_name)
      `)
      .eq('sale_id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    // Verify it's a guest order
    if (!order.customer.customer_name.startsWith('Guest_')) {
      return NextResponse.json({
        success: false,
        message: 'Order not found or not a guest order'
      }, { status: 404 });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('sale')
      .update({ status: 'Completed', completion_time: new Date().toISOString() })
      .eq('sale_id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Guest order marked as completed'
    });
  } catch (error) {
    console.error('Error completing guest order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error completing guest order',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
