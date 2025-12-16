
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";
import { authenticateToken } from "@/src/lib/auth/middleware";

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
		const employeeId = searchParams.get("employeeId");
		const monthStr = searchParams.get("month");
		const yearStr = searchParams.get("year");

		if (!employeeId || !monthStr || !yearStr) {
			return NextResponse.json(
				{
					success: false,
					message: "Query parameters 'employeeId', 'month' and 'year' are required",
				},
				{ status: 400 }
			);
		}

		const month = parseInt(monthStr, 10);
		const year = parseInt(yearStr, 10);

		if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
			return NextResponse.json(
				{ success: false, message: "Invalid month or year" },
				{ status: 400 }
			);
		}

		const startDate = new Date(year, month - 1, 1);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(year, month, 0);
		endDate.setHours(23, 59, 59, 999);

		const startISO = startDate.toISOString();
		const endISO = endDate.toISOString();

		const { data, error } = await supabase
			.from("schedule")
			.select(`
				schedule_id,
				shift_date,
				shift,
				staff_id,
				staff(staff_id, staff_name, role)
			`)
			.eq("staff_id", Number(employeeId))
			.gte("shift_date", startISO)
			.lte("shift_date", endISO)
			.order("shift_date", { ascending: true })
			.order("shift", { ascending: true });

		if (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to fetch schedules";
			return NextResponse.json(
				{
					success: false,
					message: "Error fetching schedules",
					error:
						process.env.NODE_ENV === "development" ? errorMessage : undefined,
				},
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true, schedules: data ?? [] });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json(
			{
				success: false,
				message: "Server error",
				error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
			},
			{ status: 500 }
		);
	}
}

