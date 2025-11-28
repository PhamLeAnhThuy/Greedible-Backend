import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateCustomerToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/orders/user/favorite-meals:
 *   get:
 *     summary: Get user's favorite meals
 *     description: Retrieve frequently ordered meals for the authenticated customer.
 *     tags: [Orders]
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: User's favorite meals sorted by order frequency
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

export async function GET(request: Request) {
  try {
    const authResult = await authenticateCustomerToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const supabase = await createServerClient();

    // Get recipes ordered by this customer with count
    const { data: orderDetails, error } = await supabase
      .from('order_detail')
      .select(`
        quantity,
        recipe:recipe_id(recipe_id, recipe_name, price, image_url),
        sale:sale_id(customer_id)
      `);

    if (error) throw error;

    // Filter for this customer and aggregate
    const favoriteMap = new Map<number, any>();

    orderDetails?.forEach((od: any) => {
      if (od.sale.customer_id === authResult.user!.customer_id) {
        const recipeId = od.recipe.recipe_id;
        if (!favoriteMap.has(recipeId)) {
          favoriteMap.set(recipeId, {
            recipe_id: od.recipe.recipe_id,
            recipe_name: od.recipe.recipe_name,
            price: od.recipe.price,
            image_url: od.recipe.image_url,
            total_ordered: 0,
            times_ordered: 0
          });
        }
        const entry = favoriteMap.get(recipeId);
        entry.total_ordered += od.quantity;
        entry.times_ordered += 1;
      }
    });

    const favoriteMeals = Array.from(favoriteMap.values()).sort(
      (a, b) => b.total_ordered - a.total_ordered
    );

    return NextResponse.json({ success: true, favoriteMeals });
  } catch (error) {
    console.error('Error fetching favorite meals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching favorite meals',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
