import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { id: restockId } = await params;

    const supabase = await createServerClient();

    const { data: restockDetails, error } = await supabase
      .from('restock_detail')
      .select(`
        ingredient_id,
        import_quantity,
        import_price,
        ingredient:ingredient_id(ingredient_name, unit),
        restock:restock_id(restock_date)
      `)
      .eq('restock_id', restockId);

    if (error) throw error;

    if (!restockDetails || restockDetails.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Restock details not found'
      }, { status: 404 });
    }

    const formattedDetails = restockDetails.map((rd: any) => ({
      ingredient_id: rd.ingredient_id,
      ingredient_name: rd.ingredient.ingredient_name,
      import_quantity: rd.import_quantity,
      import_price: rd.import_price,
      unit: rd.ingredient.unit,
      restock_date: rd.restock.restock_date
    }));

    return NextResponse.json({
      success: true,
      restockDetails: formattedDetails
    });
  } catch (error) {
    console.error('Error fetching restock details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
