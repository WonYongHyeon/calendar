// pages/api/schedules/all/route.js
// 새로운 라우트 파일을 생성하세요.
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM schedules ORDER BY date ASC;`;

    const scheduleData = rows.reduce((acc, row) => {
      const formattedDate =
        row.date instanceof Date
          ? `${row.date.getFullYear()}-${String(
              row.date.getMonth() + 1
            ).padStart(2, "0")}-${String(row.date.getDate()).padStart(2, "0")}`
          : row.date;

      acc[formattedDate] = {
        events: row.events || [],
        memo: row.memo || "",
        isBreakDay: row.is_break_day || false,
        version: row.version,
        breakDayImageId: row.break_day_image_id,
        morningTime: row.morning_time || "",
        afternoonTime: row.afternoon_time || "",
      };
      return acc;
    }, {});

    return NextResponse.json(scheduleData, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch all schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch all schedules" },
      { status: 500 }
    );
  }
}
