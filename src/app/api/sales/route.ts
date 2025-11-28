import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/sales/daily:
 *   get:
 *     summary: Get daily sales data for a specific month and year
 *     description: Retrieves order count by day for a specified month and year from the sales table
 *     tags:
 *       - Sales
 *     parameters:
 *       - name: year
 *         in: query
 *         required: true
 *         description: Year (e.g., 2024)
 *         schema:
 *           type: number
 *       - name: month
 *         in: query
 *         required: true
 *         description: Month (1-12)
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 12
 *     responses:
 *       200:
 *         description: Daily sales data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: number
 *                         description: Day of month (1-31)
 *                       count:
 *                         type: number
 *                         description: Number of orders on that day
 *       400:
 *         description: Invalid year or month parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
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

    const supabase = await createServerClient();

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
