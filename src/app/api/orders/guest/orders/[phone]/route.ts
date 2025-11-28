import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/orders/guest/orders/{phone}:
 *   get:
 *     summary: Get guest order history by phone
 *     description: Retrieve all orders for a guest customer using their phone number.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guest's order history
 *       404:
 *         description: No orders found
 *       500:
 *         description: Server error
 */

export async function GET(request: Request, { params }: { params: { phone: string } }) {
  try {
    const { phone } = params;

    console.log('Fetching guest orders for phone:', phone);

    const supabase = await createServerClient();

    // Get customer with this phone that is a guest
    const { data: customer, error: customerError } = await supabase
      .from('customer')
      .select('customer_id')
      .eq('phone', phone)
      .ilike('customer_name', 'Guest_%')
      .limit(1);

    if (customerError || !customer || customer.length === 0) {
      return NextResponse.json({
        success: true,
        orders: []
      });
    }

    // Get all orders for this customer
    const { data: orders, error } = await supabase
      .from('sale')
      .select(`
        *,
        order_detail(
          recipe:recipe_id(recipe_id, recipe_name, price, image_url),
          quantity
        )
      `)
      .eq('customer_id', customer[0].customer_id)
      .order('sale_time', { ascending: false });

    if (error) throw error;

    // Format orders
    const formattedOrders = orders?.map((order: any) => ({
      ...order,
      items: order.order_detail.map((od: any) => ({
        recipe_id: od.recipe.recipe_id,
        recipe_name: od.recipe.recipe_name,
        quantity: od.quantity,
        price: od.recipe.price,
        image_url: od.recipe.image_url
      }))
    })) || [];

    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching guest order history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching order history',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
