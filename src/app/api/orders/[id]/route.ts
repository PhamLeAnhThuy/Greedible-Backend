import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15 requires awaiting params
    const { id: orderId } = await context.params;

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
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

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

    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching order details',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}