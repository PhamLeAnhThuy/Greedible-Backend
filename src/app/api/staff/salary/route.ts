import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateToken } from '@/src/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request using JWT token (staff only)
    const authResult = await authenticateToken(req);
    if (authResult.error) {
      console.error('Authentication failed:', {
        message: authResult.error.message,
        status: authResult.error.status,
        hasAuthHeader: !!req.headers.get('authorization')
      });
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const authenticatedStaff = authResult.user;
    const staffId = authenticatedStaff.staff_id;

    if (!staffId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated.' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { success: false, message: 'Month and year are required.' },
        { status: 400 }
      );
    }

    console.log(`Fetching salary for staff ${staffId}, month: ${month}, year: ${year}`);

    // Fetch staff data
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('staff_id, staff_name, role, pay_rates')
      .eq('staff_id', staffId)
      .single();

    if (staffError || !staff) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json({ hours: 0, salary: 0 });
    }

    // Fetch schedules for the given month/year
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const { data: schedules, error: scheduleError } = await supabase
      .from('schedule')
      .select('schedule_id')
      .eq('staff_id', staffId)
      .gte('shift_date', startDate.toISOString().split('T')[0])
      .lte('shift_date', endDate.toISOString().split('T')[0]);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return NextResponse.json(
        { success: false, message: 'Error fetching schedule data' },
        { status: 500 }
      );
    }

    // Calculate salary
    const workingShifts = schedules?.length || 0;
    const workingHours = workingShifts * 8;
    const salary = workingHours * staff.pay_rates;

    return NextResponse.json({
      hours: workingHours,
      salary: salary
    });

  } catch (error) {
    console.error('Error fetching staff salary:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching staff salary' },
      { status: 500 }
    );
  }
}