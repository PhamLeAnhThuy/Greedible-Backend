import { NextResponse, NextRequest } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const ingredientId = id;

    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    console.log(`Fetching restock details${ingredientId ? ` for ingredient ID: ${ingredientId}` : ' for all ingredients'}`);

    // Build the query
    let query = supabase
      .from('restock_detail')
      .select(`
        restock_id,
        ingredient_id,
        import_quantity,
        import_price,
        restock(
          restock_date
        ),
        ingredient(
          name,
          unit
        )
      `)
      .order('restock_id', { ascending: false });

    // Add ingredient filter only if ingredientId is provided
    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }

    const { data: restockDetails, error } = await query;

    if (error) throw error;

    const formattedRestocks =
      restockDetails?.map((rd: any) => ({
        restock_id: rd.restock_id,
        ingredient_id: rd.ingredient_id,
        ingredient_name: rd.ingredient.name,
        restock_date: rd.restock.restock_date,
        import_quantity: rd.import_quantity,
        import_price: rd.import_price,
        unit: rd.ingredient.unit,
      })) ?? [];

    return NextResponse.json({ success: true, restockDetails: formattedRestocks });
  } catch (error) {
    console.error('Error fetching restock details:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching restock details',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}