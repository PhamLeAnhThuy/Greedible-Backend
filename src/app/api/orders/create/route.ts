import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/orders/create:
 *   post:
 *     summary: Create an order for authenticated customer
 *     description: Create a new order for authenticated customers with loyalty points support.
 *     tags: [Orders]
 *     security:
 *       - Bearer: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - delivery_address
 *               - delivery_distance
 *               - delivery_charge
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *               delivery_address:
 *                 type: string
 *               delivery_distance:
 *                 type: number
 *               delivery_charge:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, momo]
 *               loyalty_points_used:
 *                 type: number
 *                 default: 0
 *               loyalty_points_earned:
 *                 type: number
 *                 default: 0
 *     responses:
 *       201:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

export async function POST(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const body = await request.json();
    const {
      items,
      delivery_address,
      delivery_distance,
      delivery_charge,
      payment_method,
      loyalty_points_used = 0,
      loyalty_points_earned = 0
    } = body;

    if (!items || !delivery_address || delivery_distance === undefined) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields'
      }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Calculate total amount
    const totalAmount = items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);
    const normalizedPaymentMethod = payment_method === 'momo wallet' ? 'momo' : payment_method || 'cash';

    // Create sale record
    const { data: newSale, error: saleError } = await supabase
      .from('sale')
      .insert({
        total_amount: totalAmount,
        payment_method: normalizedPaymentMethod,
        status: 'Pending',
        customer_id: authResult.user!.customer_id,
        delivery_address,
        delivery_distance,
        delivery_charge
      })
      .select('sale_id')
      .single();

    if (saleError) throw saleError;

    const saleId = newSale.sale_id;

    // Insert order details
    for (const item of items) {
      const { error: detailError } = await supabase
        .from('order_detail')
        .insert({
          sale_id: saleId,
          recipe_id: item.id,
          quantity: item.quantity
        });

      if (detailError) throw detailError;
    }

    // Update loyalty points
    let loyaltyPointsAdjustment = -loyalty_points_used;
    // Only add earned points if order is completed
    if (body.status === 'Completed') {
      loyaltyPointsAdjustment += loyalty_points_earned;
    }

    if (loyaltyPointsAdjustment !== 0) {
      const { error: loyaltyError } = await supabase
        .from('customer')
        .update({ loyalty_point: loyaltyPointsAdjustment })
        .eq('customer_id', authResult.user!.customer_id);

      if (loyaltyError) throw loyaltyError;
    }

    // Auto-complete after 15 seconds
    setTimeout(async () => {
      try {
        await supabase
          .from('sale')
          .update({ status: 'Completed', completion_time: new Date().toISOString() })
          .eq('sale_id', saleId)
          .eq('status', 'Pending');
      } catch (err) {
        console.error('Auto-complete error:', err);
      }
    }, 15000);

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      orderId: saleId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
