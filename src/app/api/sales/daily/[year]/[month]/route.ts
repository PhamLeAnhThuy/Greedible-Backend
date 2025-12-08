import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase/client";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ year: string; month: string }> }
) {
  try {
    // Important: params is now a Promise → Must await
    const { year, month } = await context.params;

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

    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = `${year}-${month.padStart(2, "0")}-31`;

    const { data: sales, error } = await supabase
      .from("sale")
      .select("sale_time, sale_id")
      .gte("sale_time", startDate)
      .lte("sale_time", endDate);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const dailyMap: Record<number, number> = {};

    sales.forEach((row: any) => {
      const day = new Date(row.sale_time).getDate();
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });

    const dailyData = Object.entries(dailyMap)
      .map(([day, count]) => ({ day: Number(day), count }))
      .sort((a, b) => a.day - b.day);

    return NextResponse.json(dailyData);
  } catch (err) {
    console.error("Error fetching daily sales:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
