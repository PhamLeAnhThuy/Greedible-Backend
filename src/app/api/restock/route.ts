import { NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const supabase = await createServerClient();

    if (month && year) {
      // Fetch daily import totals for the specified month and year
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({
          success: false,
          message: 'Invalid month or year'
        }, { status: 400 });
      }

      // Calculate date range
      const startDate = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(yearNum, monthNum, 1).toISOString().split('T')[0];

      const { data: restockData, error } = await supabase
        .from('restock_detail')
        .select(`
          restock:restock_id(restock_date),
          import_quantity,
          import_price
        `)
        .gte('restock.restock_date', startDate)
        .lt('restock.restock_date', endDate);

      if (error) throw error;

      // Group by day and sum
      const dailyTotals: Record<number, number> = {};
      restockData?.forEach((rd: any) => {
        if (rd.restock?.restock_date) {
          const date = new Date(rd.restock.restock_date);
          const day = date.getDate();
          const total = rd.import_quantity * rd.import_price;
          dailyTotals[day] = (dailyTotals[day] || 0) + total;
        }
      });

      const dailyImportTotals = Object.entries(dailyTotals).map(([day, total]) => ({
        day: parseInt(day),
        total_import_price: total
      }));

      return NextResponse.json({ success: true, dailyImportTotals });
    } else {
      // Get all restock orders (summary)
      const { data: restocks, error } = await supabase
        .from('restock')
        .select(`
          restock_id,
          restock_date,
          supplier:supplier_id(supplier_name)
        `)
        .order('restock_date', { ascending: false });

      if (error) throw error;

      const formattedRestocks = restocks?.map((r: any) => ({
        restock_id: r.restock_id,
        restock_date: r.restock_date,
        supplier_name: r.supplier.supplier_name
      })) || [];

      return NextResponse.json({ success: true, restocks: formattedRestocks });
    }
  } catch (error) {
    console.error('Error fetching restock data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }

    const body = await request.json();
    const { supplier_id, restock_date, items } = body;

    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restock data provided'
      }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Insert restock
    const { data: newRestock, error: restockError } = await supabase
      .from('restock')
      .insert({
        supplier_id,
        restock_date: restock_date || new Date().toISOString()
      })
      .select('restock_id')
      .single();

    if (restockError) throw restockError;

    const restockId = newRestock.restock_id;

    // Insert restock details
    const restockDetails = items.map((item: any) => ({
      restock_id: restockId,
      ingredient_id: item.ingredient_id,
      import_quantity: item.import_quantity,
      import_price: item.import_price
    }));

    const { error: detailError } = await supabase
      .from('restock_detail')
      .insert(restockDetails);

    if (detailError) throw detailError;

    return NextResponse.json({
      success: true,
      message: 'Restock order created successfully',
      restockId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating restock order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
