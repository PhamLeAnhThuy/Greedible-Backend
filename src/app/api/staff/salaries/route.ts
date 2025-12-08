// app/api/staff/salaries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/src/lib/supabase/client';
import { authenticateToken } from '@/src/lib/auth/middleware';
import { handleCorsOptions } from '@/src/lib/utils/cors';

export async function GET(request: Request) {
  try {
    // Authenticate the request using JWT token (staff only)
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      console.error('Authentication failed:', {
        message: authResult.error.message,
        status: authResult.error.status,
        hasAuthHeader: !!request.headers.get('authorization')
      });
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.status }
      );
    }

    const authenticatedStaff = authResult.user;
    console.log(`Request authenticated for staff: ${authenticatedStaff.staff_name || authenticatedStaff.staff_email} (${authenticatedStaff.role})`);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { success: false, message: 'Month and year are required.' },
        { status: 400 }
      );
    }

    console.log(`Fetching employee salaries for month: ${month}, year: ${year}`);

    // Fetch all staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('staff_id, staff_name, role, pay_rates');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { success: false, message: 'Error fetching staff data' },
        { status: 500 }
      );
    }

    // Fetch schedules for the given month/year
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const { data: schedules, error: scheduleError } = await supabase
      .from('schedule')
      .select('staff_id, schedule_id')
      .gte('shift_date', startDate.toISOString().split('T')[0])
      .lte('shift_date', endDate.toISOString().split('T')[0]);

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return NextResponse.json(
        { success: false, message: 'Error fetching schedule data' },
        { status: 500 }
      );
    }

    // Calculate salaries for each staff member
    const employees = staff.map(s => {
      const workingShifts = schedules?.filter(sc => sc.staff_id === s.staff_id).length || 0;
      const workingHours = workingShifts * 8;
      const totalPay = workingHours * s.pay_rates;

      return {
        staff_id: s.staff_id,
        name: s.staff_name,
        role: s.role,
        pay_rate: s.pay_rates,
        working_shifts: workingShifts,
        working_hours: workingHours,
        total_pay: totalPay
      };
    });

    console.log('Employee salaries fetched.', employees.length);

    return NextResponse.json({
      success: true,
      authenticated_as: {
        staff_id: authenticatedStaff.staff_id,
        name: authenticatedStaff.staff_name || authenticatedStaff.staff_email,
        role: authenticatedStaff.role
      },
      employees: employees
    });

  } catch (error) {
    console.error('Error fetching employee salaries:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching employee salaries' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return handleCorsOptions();
}