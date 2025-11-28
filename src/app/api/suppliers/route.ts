import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     description: Retrieves a list of all suppliers with their contact information
 *     tags:
 *       - Suppliers
 *     responses:
 *       200:
 *         description: Suppliers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       supplier_id:
 *                         type: number
 *                       supplier_name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       address:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: suppliers, error } = await supabase
      .from('supplier')
      .select('supplier_id, supplier_name, phone, address');

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suppliers';
      return NextResponse.json(
        {
          success: false,
          message: 'Error fetching suppliers',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suppliers || [],
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
