// api/schedules/route.js
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { rows } = await sql`SELECT * FROM schedules;`;

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
      };
      return acc;
    }, {});

    return NextResponse.json(scheduleData, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { date, events, memo, isBreakDay } = await request.json();

    // 휴방 체크박스가 true일 때
    if (isBreakDay) {
      await sql`
        INSERT INTO schedules (date, events, memo, is_break_day)
        VALUES (${date}, ${JSON.stringify(events)}, ${memo}, ${isBreakDay})
        ON CONFLICT (date) DO UPDATE SET
        events = EXCLUDED.events,
        memo = EXCLUDED.memo,
        is_break_day = EXCLUDED.is_break_day;
      `;
    }
    // 일정이 비어있고 메모도 비어있을 때 (순수한 빈 날짜)
    else if (events.length === 0 && !memo.trim()) {
      await sql`DELETE FROM schedules WHERE date = ${date};`;
    }
    // 그 외 (일정이 있거나, 휴방 체크 없이 메모만 있을 때)
    else {
      await sql`
        INSERT INTO schedules (date, events, memo, is_break_day)
        VALUES (${date}, ${JSON.stringify(events)}, ${memo}, ${isBreakDay})
        ON CONFLICT (date) DO UPDATE SET
        events = EXCLUDED.events,
        memo = EXCLUDED.memo,
        is_break_day = EXCLUDED.is_break_day;
      `;
    }

    return NextResponse.json(
      { message: "Schedule saved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save schedule:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}
