import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateToken } from '@/src/lib/auth/middleware';
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Authenticate
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    // 2️⃣ Parse request body
    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, message: 'month and year are required in request body' },
        { status: 400 }
      );
    }

    const monthNum = Number(month);
    const yearNum = Number(year);

    if (monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { success: false, message: 'month must be between 1 and 12' },
        { status: 400 }
      );
    }

    // 3️⃣ Calculate start and end of month
    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0);

    const formattedStartDate = formatDate(startOfMonth); // YYYY-MM-DD
    const formattedEndDate = formatDate(endOfMonth);     // YYYY-MM-DD

    console.log('Fetching shifts from', formattedStartDate, 'to', formattedEndDate);

    // 4️⃣ Query Supabase
    const { data: shifts, error } = await supabase
      .from('schedule')
      .select(`
        schedule_id,
        shift_date,
        shift,
        staff_id,
        staff(staff_id, staff_name, role)
      `)
      .gte('shift_date', `${formattedStartDate}T00:00:00`)
      .lte('shift_date', `${formattedEndDate}T23:59:59`)
      .order('shift_date', { ascending: true })
      .order('shift', { ascending: true })
      .order('schedule_id', { ascending: true });

    if (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch shifts';
      return NextResponse.json(
        { success: false, message: 'Error fetching shift data', error: msg },
        { status: 500 }
      );
    }

    // 5️⃣ Format data
    const scheduleData: Record<number, Record<string, any>> = {};

    shifts?.forEach((shift: any) => {
      if (!shift.shift_date || !shift.shift) return;

      const dateObj = new Date(shift.shift_date);
      const day = dateObj.getDate();
      const shiftType = shift.shift;

      if (!scheduleData[day]) scheduleData[day] = {};

      if (!scheduleData[day][shiftType]) {
        scheduleData[day][shiftType] = {
          id: `${day}-${shiftType}`,
          time: shiftType === 'Morning' ? '08:00 - 15:00' : '15:00 - 22:00',
          shift: shiftType,
          staff: [],
        };
      }

      if (shift.staff_id && shift.staff) {
        scheduleData[day][shiftType].staff.push({
          id: shift.staff_id,
          name: shift.staff.staff_name,
          role: shift.staff.role,
          schedule_id: shift.schedule_id,
          avatar: '👤',
          color: '#CCCCCC',
        });
      }
    });

    const formattedSchedule = Object.keys(scheduleData)
      .map((dayKey) => {
        const dayNum = Number(dayKey);
        return {
          date: dayNum,
          shifts: Object.values(scheduleData[dayNum]),
        };
      })
      .sort((a, b) => a.date - b.date);

    // 6️⃣ Return response
    return NextResponse.json({
      success: true,
      month: monthNum,
      year: yearNum,
      schedule: formattedSchedule,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Error fetching shift data', error: msg },
      { status: 500 }
    );
  }
}
