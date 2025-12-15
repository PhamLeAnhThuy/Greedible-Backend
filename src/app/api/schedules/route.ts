import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from '@/src/lib/auth/middleware';

/**
 * Helper function to format date as YYYY-MM-DD
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET - Fetch shifts for a specific week
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');

    if (!startDate) {
      return NextResponse.json(
        { success: false, message: 'startDate query parameter is required' },
        { status: 400 }
      );
    }

    const startOfWeek = new Date(startDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formattedStartDate = formatDate(startOfWeek);
    const formattedEndOfWeek = formatDate(endOfWeek);



    // Fetch all schedule entries with staff info for the week
    const { data: shifts, error } = await supabase
      .from('schedule')
      .select(
        `
        schedule_id,
        shift_date,
        shift,
        staff_id,
        staff(staff_id, staff_name, role)
      `
      )
      .gte('shift_date', `${formattedStartDate}T00:00:00`)
      .lte('shift_date', `${formattedEndOfWeek}T23:59:59`)
      .order('shift_date', { ascending: true })
      .order('shift', { ascending: true });

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch shifts';
      return NextResponse.json(
        {
          success: false,
          message: 'Error fetching shift data',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    // Format shifts data for frontend
    const scheduleData: Record<number, Record<string, any>> = {};

    shifts?.forEach((shift: any) => {
      if (!shift.shift_date || !shift.shift) return;

      const date = new Date(shift.shift_date);
      const shiftDate = date.getDate();
      const shiftTime = shift.shift;

      if (!scheduleData[shiftDate]) {
        scheduleData[shiftDate] = {};
      }

      if (!scheduleData[shiftDate][shiftTime]) {
        scheduleData[shiftDate][shiftTime] = {
          id: `${shiftDate}-${shiftTime}`,
          time: shiftTime === 'Morning' ? '08:00 - 15:00' : '15:00 - 22:00',
          shift: shiftTime,
          staff: [],
        };
      }

      if (shift.staff_id && shift.staff) {
        scheduleData[shiftDate][shiftTime].staff.push({
          id: shift.staff_id,
          name: shift.staff.staff_name,
          role: shift.staff.role,
          schedule_id: shift.schedule_id,
          avatar: '👤',
          color: '#CCCCCC',
        });
      }
    });

    // Convert to frontend format
    const formattedSchedule = Object.keys(scheduleData)
      .map((dateKey) => {
        const dateNum = parseInt(dateKey, 10);
        return {
          date: dateNum,
          shifts: Object.values(scheduleData[dateNum]),
        };
      })
      .sort((a, b) => a.date - b.date);

    return NextResponse.json({
      success: true,
      schedule: formattedSchedule,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching shift data',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// POST - Create shift block or assign staff to shift
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const { shift_date, shift, staff_id } = await request.json();

    if (!shift_date || !shift) {
      return NextResponse.json(
        { success: false, message: 'shift_date and shift are required' },
        { status: 400 }
      );
    }

    // Validate shift type (accept both capitalized and lowercase)
    const normalizedShift = shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
    if (normalizedShift !== 'Morning' && normalizedShift !== 'Evening') {
      return NextResponse.json(
        { success: false, message: "Invalid shift type. Must be 'Morning' or 'Evening'" },
        { status: 400 }
      );
    }

    // Check if shift date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shiftDateObj = new Date(shift_date);
    shiftDateObj.setHours(0, 0, 0, 0);

    if (shiftDateObj < today) {
      return NextResponse.json(
        { success: false, message: 'Cannot create a shift before today.' },
        { status: 400 }
      );
    }



    if (staff_id) {
      // Check if staff is already assigned to this shift on this date
      const { data: existingEntry, error: checkError } = await supabase
        .from('schedule')
        .select('schedule_id')
        .eq('shift_date', shift_date)
        .eq('shift', normalizedShift)
        .eq('staff_id', staff_id)
        .single();

      if (existingEntry) {
        return NextResponse.json(
          { success: false, message: 'Staff member already assigned to this shift on this date.' },
          { status: 409 }
        );
      }

      // Insert staff assignment
      const { data: result, error } = await supabase
        .from('schedule')
        .insert([
          {
            shift_date,
            shift: normalizedShift,
            staff_id,
          },
        ])
        .select('*')
        .single();

      if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to assign staff';
        return NextResponse.json(
          {
            success: false,
            message: 'Error assigning staff to shift',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Staff assigned to shift successfully',
          scheduleId: result?.schedule_id,
        },
        { status: 201 }
      );
    } else {
      // Check if shift block already exists for this date+shift
      const { data: existingBlock, error: checkError } = await supabase
        .from('schedule')
        .select('schedule_id')
        .eq('shift_date', shift_date)
        .eq('shift', normalizedShift)
        .is('staff_id', null)
        .single();

      if (existingBlock) {
        return NextResponse.json(
          { success: false, message: 'Shift already exists for this date and type.' },
          { status: 409 }
        );
      }

      // Create empty shift block
      const { data: result, error } = await supabase
        .from('schedule')
        .insert([
          {
            shift_date,
            shift: normalizedShift,
            staff_id: null,
          },
        ])
        .select('*')
        .single();

      if (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create shift';
        return NextResponse.json(
          {
            success: false,
            message: 'Error creating shift block',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Shift block created successfully',
          scheduleId: result?.schedule_id,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error assigning staff to shift',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift block (all assignments for a date+shift)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const { shift_date, shift } = await request.json();

    if (!shift_date || !shift) {
      return NextResponse.json(
        { success: false, message: 'shift_date and shift are required' },
        { status: 400 }
      );
    }

    // Normalize shift type
    const normalizedShift = shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();



    // Delete all schedule entries for this date and shift
    const { data, error, count } = await supabase
      .from('schedule')
      .delete()
      .eq('shift_date', shift_date)
      .eq('shift', normalizedShift)
      .select('*');

    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete shift';
      return NextResponse.json(
        {
          success: false,
          message: 'Error deleting shift block',
          error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { success: false, message: 'No shift found for this date and type.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shift deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Error deleting shift block',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
