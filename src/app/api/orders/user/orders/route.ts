import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }



    const { data: orders, error } = await supabase
      .from('sale')
      .select(`
        sale_id,
        sale_time,
        status,
        payment_status,
        payment_method,
        delivery_address,
        total_amount,
        order_detail(
          recipe:recipe_id(recipe_id, recipe_name, price, image_url),
          quantity
        )
      `)
      .eq('customer_id', authResult.user!.customer_id)
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
    console.error('Error fetching order history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching order history',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
