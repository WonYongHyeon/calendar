// pages/api/schedules/route.js

import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month parameters are required." },
        { status: 400 }
      );
    }

    const formattedMonth = String(month).padStart(2, "0");

    // ✅ 올바른 SQL 쿼리 구문으로 수정
    const { rows } = await sql`
      SELECT * FROM schedules 
      WHERE date::text LIKE ${`${year}-${formattedMonth}-%`}
      ORDER BY date ASC;
    `;

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
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  // ✅ POST 함수는 기존 코드 그대로 사용
  try {
    const {
      date,
      events,
      memo,
      isBreakDay,
      version,
      breakDayImageId,
      morningTime,
      afternoonTime,
    } = await request.json();

    const { rows: existingRows } =
      await sql`SELECT version FROM schedules WHERE date = ${date};`;
    const existingVersion =
      existingRows.length > 0 ? existingRows[0].version : null;

    if (existingVersion !== null && existingVersion !== version) {
      return NextResponse.json(
        {
          error: `다른 사용자에 의해 이미 수정되었습니다.\n캘린더를 새로고침하여 최신 일정을 반영합니다.`,
        },
        { status: 409 }
      );
    }

    if (existingVersion !== null) {
      // 기존 일정이 있는 경우, 업데이트
      const { rows } = await sql`
        UPDATE schedules
        SET
          events = ${JSON.stringify(events)},
          memo = ${memo},
          is_break_day = ${isBreakDay},
          version = schedules.version + 1,
          break_day_image_id = ${isBreakDay ? breakDayImageId : null},
          morning_time = ${morningTime},
          afternoon_time = ${afternoonTime}
        WHERE date = ${date}
        RETURNING *;
      `;
      return NextResponse.json(
        { message: "Schedule updated successfully", schedule: rows[0] },
        { status: 200 }
      );
    } else {
      // 기존 일정이 없는 경우, 새로 생성 (version = 1)
      const { rows } = await sql`
        INSERT INTO schedules (date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time)
        VALUES (
          ${date},
          ${JSON.stringify(events)},
          ${memo},
          ${isBreakDay},
          1,
          ${isBreakDay ? breakDayImageId : null},
          ${morningTime},
          ${afternoonTime}
        )
        RETURNING *;
      `;
      return NextResponse.json(
        { message: "Schedule created successfully", schedule: rows[0] },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Failed to save schedule:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}
