import { NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/orders/revenue:
 *   get:
 *     summary: Get all revenue records
 *     description: Retrieve all revenue records (staff only). Sorted by date descending.
 *     tags: [Orders]
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: List of revenue records
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

export async function GET(request: Request) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error.message }, { status: authResult.error.status });
    }



    const { data: revenue, error } = await supabase
      .from('revenue')
      .select('*')
      .order('date_recorded', { ascending: false });

    if (error) throw error;

    console.log('Revenue records fetched.', revenue?.length || 0);

    return NextResponse.json({ success: true, revenue: revenue || [] });
  } catch (error) {
    console.error('Error fetching revenue records:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      message: 'Error fetching revenue records',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
