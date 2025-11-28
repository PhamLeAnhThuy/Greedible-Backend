import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase/server';
import { authenticateToken } from '@/src/lib/auth/middleware';

/**
 * @swagger
 * /api/schedules/{scheduleId}:
 *   delete:
 *     summary: Remove staff from a shift
 *     description: Deletes a specific schedule entry (removes a staff member from a shift)
 *     tags:
 *       - Schedules
 *     parameters:
 *       - name: scheduleId
 *         in: path
 *         required: true
 *         description: Schedule entry ID
 *         schema:
 *           type: number
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Staff removed from shift successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Schedule entry not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const { scheduleId } = await params;

    if (!scheduleId || isNaN(Number(scheduleId))) {
      return NextResponse.json(
        { success: false, message: 'Invalid schedule ID' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Delete the specific schedule entry
    const { error, count } = await supabase
      .from('schedule')
      .delete()
      .eq('schedule_id', Number(scheduleId));

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete schedule';
      return NextResponse.json(
        {
          success: false,
          message: 'Error removing staff from shift',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { success: false, message: 'Schedule entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff removed from shift successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error removing staff from shift',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
