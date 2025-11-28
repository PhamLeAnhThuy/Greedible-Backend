import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const ingredientId = id;

    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    console.log(`Fetching restock details for ingredient ID: ${ingredientId}`);

    const supabase = await createServerClient();

    const { data: restockDetails, error } = await supabase
      .from('restock_detail')
      .select(`
        restock_id,
        import_quantity,
        import_price,
        restock(
          restock_date
        ),
        ingredient(
          unit
        )
      `)
      .eq('ingredient_id', ingredientId)
      .order('restock.restock_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Flatten the structure to match the original query
    const formattedRestocks = restockDetails?.map((rd: any) => ({
      restock_id: rd.restock_id,
      restock_date: rd.restock.restock_date,
      import_quantity: rd.import_quantity,
      import_price: rd.import_price,
      unit: rd.ingredient.unit
    })) || [];

    console.log(`Restock details fetched for ingredient ${ingredientId}:`, formattedRestocks.length);
    return NextResponse.json({ success: true, restockDetails: formattedRestocks });
  } catch (error) {
    console.error('Error fetching restock details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: 'Error fetching restock details', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined }, { status: 500 });
  }
}
