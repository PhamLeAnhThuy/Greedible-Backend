import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     description: Retrieve detailed information for a specific order including items.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: orderId } = params;

    const supabase = await createServerClient();

    const { data: order, error } = await supabase
      .from('sale')
      .select(`
        *,
        order_detail(
          recipe:recipe_id(recipe_id, recipe_name, price, image_url),
          quantity
        )
      `)
      .eq('sale_id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found'
      }, { status: 404 });
    }

    // Format response
    const formattedOrder = {
      ...order,
      items: order.order_detail.map((od: any) => ({
        recipe_id: od.recipe.recipe_id,
        recipe_name: od.recipe.recipe_name,
        quantity: od.quantity,
        price: od.recipe.price,
        image_url: od.recipe.image_url
      }))
    };

    return NextResponse.json({ success: true, order: formattedOrder });
  } catch (error) {
    console.error('Error fetching order details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching order details',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
