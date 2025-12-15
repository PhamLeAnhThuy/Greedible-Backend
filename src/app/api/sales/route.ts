import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Validate parameters
    if (!year || !month || isNaN(Number(year)) || isNaN(Number(month))) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing year/month parameter' },
        { status: 400 }
      );
    }

    const numMonth = Number(month);
    if (numMonth < 1 || numMonth > 12) {
      return NextResponse.json(
        { success: false, message: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }



    // Query sales data for the specified month and year
    // Group by day and count order occurrences
    const { data: salesData, error } = await supabase
      .from('sale')
      .select('sale_time, sale_id')
      .gte('sale_time', `${year}-${String(numMonth).padStart(2, '0')}-01T00:00:00`)
      .lt('sale_time', numMonth === 12 ? `${Number(year) + 1}-01-01T00:00:00` : `${year}-${String(numMonth + 1).padStart(2, '0')}-01T00:00:00`);

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales data';
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch sales data',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    // Group sales by day
    const dailyOrderCounts: Record<number, number> = {};

    salesData?.forEach((sale: any) => {
      if (sale.sale_time) {
        const date = new Date(sale.sale_time);
        const day = date.getDate();
        dailyOrderCounts[day] = (dailyOrderCounts[day] || 0) + 1;
      }
    });

    // Format the response
    const formattedData = Object.entries(dailyOrderCounts)
      .map(([day, count]) => ({
        day: Number(day),
        count,
      }))
      .sort((a, b) => a.day - b.day);

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
