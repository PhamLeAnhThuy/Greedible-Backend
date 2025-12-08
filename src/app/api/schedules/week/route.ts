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

    console.log(`Fetching shifts for week starting from ${formattedStartDate} to ${formattedEndOfWeek}`);

    // Fetch all schedule entries with staff info for the week (LEFT JOIN for NULL staff_id)
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
      .order('shift', { ascending: true })
      .order('schedule_id', { ascending: true });

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

    // Only include shift blocks that exist in the database (have shift_date and shift)
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

      // Add staff member if assigned
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

    console.log('Shift data fetched and formatted.', formattedSchedule.length);

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