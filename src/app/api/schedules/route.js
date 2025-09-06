// pages/api/schedules/route.js

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
        version: row.version,
        breakDayImageId: row.break_day_image_id, // ✅ DB에서 이미지 ID를 불러옵니다.
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
    const {
      date,
      events,
      memo,
      isBreakDay,
      version,
      breakDayImageId, // ✅ 클라이언트에서 보낸 이미지 ID를 받습니다.
    } = await request.json();

    const { rows: currentData } =
      await sql`SELECT version FROM schedules WHERE date = ${date};`;

    if (currentData.length > 0 && currentData[0].version !== version) {
      return NextResponse.json(
        {
          error: `일정 정보가 이미 수정되었습니다.\n페이지를 새로고침하여 최신 데이터를 확인 후 다시 시도해주세요.`,
        },
        { status: 409 }
      );
    }

    let updatedSchedule = null;

    if (isBreakDay) {
      const { rows } = await sql`
        INSERT INTO schedules (date, events, memo, is_break_day, version, break_day_image_id)
        VALUES (${date}, ${JSON.stringify(
        events
      )}, ${memo}, ${isBreakDay}, 1, ${breakDayImageId})
        ON CONFLICT (date) DO UPDATE SET
        events = EXCLUDED.events,
        memo = EXCLUDED.memo,
        is_break_day = EXCLUDED.is_break_day,
        version = schedules.version + 1,
        break_day_image_id = EXCLUDED.break_day_image_id
        RETURNING *;
      `;
      updatedSchedule = rows[0];
    } else if (events.length === 0 && !memo.trim()) {
      await sql`DELETE FROM schedules WHERE date = ${date};`;
    } else {
      const { rows } = await sql`
        INSERT INTO schedules (date, events, memo, is_break_day, version)
        VALUES (${date}, ${JSON.stringify(events)}, ${memo}, ${isBreakDay}, 1)
        ON CONFLICT (date) DO UPDATE SET
        events = EXCLUDED.events,
        memo = EXCLUDED.memo,
        is_break_day = EXCLUDED.is_break_day,
        version = schedules.version + 1
        RETURNING *;
      `;
      updatedSchedule = rows[0];
    }

    return NextResponse.json(
      { message: "Schedule saved successfully", schedule: updatedSchedule },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save schedule to DB:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}
