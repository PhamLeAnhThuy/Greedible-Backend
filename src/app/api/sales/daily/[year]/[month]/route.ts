import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { year: string; month: string } }
) {
  try {
    const { year, month } = params;
    const yearNum = Number(year);
    const monthNum = Number(month);

    if (
      !year ||
      !month ||
      isNaN(yearNum) ||
      isNaN(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    ) {
      return NextResponse.json(
        { error: "Invalid year or month parameter" },
        { status: 400 }
      );
    }

    // Get full month date range
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = `${year}-${month.padStart(2, "0")}-31`;

    // 1) Fetch all sales in that month
    const { data: sales, error } = await supabase
      .from("sale")
      .select("sale_time, sale_id")
      .gte("sale_time", startDate)
      .lte("sale_time", endDate);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2) Aggregate sales per day
    const dailyMap: { [day: number]: number } = {};

    sales.forEach((row: any) => {
      const day = new Date(row.sale_time).getDate();
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });

    // 3) Convert map to array format
    const dailyData = Object.keys(dailyMap).map((day: any) => ({
      day: Number(day),
      count: dailyMap[day],
    }));

    // Sort by day
    dailyData.sort((a, b) => a.day - b.day);

    return NextResponse.json(dailyData);
  } catch (err) {
    console.error("Error fetching daily sales:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
