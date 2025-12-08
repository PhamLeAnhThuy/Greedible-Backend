import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { data: wasteData, error } = await supabase
      .from('waste')
      .select(`
        waste_id,
        waste_date,
        waste_detail(
          quantity,
          reason,
          ingredient(
            ingredient_name,
            unit
          )
        )
      `)
      .order('waste_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Flatten the structure and include reason
    const formattedWaste = wasteData?.flatMap((w: any) =>
      w.waste_detail.map((wd: any) => ({
        waste_id: w.waste_id,
        waste_date: w.waste_date,
        ingredient_name: wd.ingredient.ingredient_name,
        wasted_quantity: wd.quantity,
        unit: wd.ingredient.unit,
        reason: wd.reason
      }))
    ) || [];

    console.log('Waste details fetched.', formattedWaste.length);
    return NextResponse.json({ success: true, waste: formattedWaste });
  } catch (error) {
    console.error('Error fetching waste details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}