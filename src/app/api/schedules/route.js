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
        { status: 400 },
      );
    }

    const formattedMonth = String(month).padStart(2, "0");

    const { rows } = await sql`
      SELECT * FROM schedules 
      WHERE date::text LIKE ${`${year}-${formattedMonth}-%`}
      ORDER BY date ASC;
    `;

    const scheduleData = rows.reduce((acc, row) => {
      const formattedDate =
        row.date instanceof Date
          ? `${row.date.getFullYear()}-${String(
              row.date.getMonth() + 1,
            ).padStart(2, "0")}-${String(row.date.getDate()).padStart(2, "0")}`
          : row.date;

      acc[formattedDate] = {
        events: row.events || [],
        memo: row.memo || "",
        isBreakDay: row.is_break_day || false,
        version: row.version,
        breakDayImageId: row.break_day_image_id,

        // 새로운 방송 시간 배열
        broadcastTimes: Array.isArray(row.broadcast_times)
          ? row.broadcast_times
          : [],

        // 기존 사이트 호환용 (임시 유지)
        morningTime: row.morning_time || "",
        afternoonTime: row.afternoon_time || "",
      };
      return acc;
    }, {});

    return NextResponse.json(scheduleData, { status: 200 });
  } catch (error) {
    console.error(
    "SCHEDULE_DB_DEBUG:",
    JSON.stringify({
      postgresUrlExists: !!process.env.POSTGRES_URL,
      errorName: error?.name ?? null,
      errorCode: error?.code ?? null,
      errorMessage: error?.message ?? null,
      causeCode: error?.cause?.code ?? null,
    })
  );
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
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
      breakDayImageId,
      morningTime,
      afternoonTime,
      broadcastTimes,
    } = await request.json();

    // 방송 시간 배열 정리
    const normalizedBroadcastTimes = Array.isArray(broadcastTimes)
      ? [
          ...new Set(
            broadcastTimes
              .filter((time) => typeof time === "string")
              .map((time) => time.trim())
              .filter(Boolean),
          ),
        ].sort()
      : null;

    const broadcastTimesJson = normalizedBroadcastTimes
      ? JSON.stringify(normalizedBroadcastTimes)
      : null;

    // 기존 입력 방식으로 새 날짜를 저장할 때 사용할 호환 데이터
    const insertBroadcastTimesJson =
      broadcastTimesJson ??
      JSON.stringify(
        [morningTime, afternoonTime]
          .filter((time) => typeof time === "string" && time.trim())
          .map((time) => time.trim())
          .sort(),
      );

    const { rows: existingRows } =
      await sql`SELECT version FROM schedules WHERE date = ${date};`;
    const existingVersion =
      existingRows.length > 0 ? existingRows[0].version : null;

    if (existingVersion !== null && existingVersion !== version) {
      return NextResponse.json(
        {
          error: `다른 사용자에 의해 이미 수정되었습니다.\n캘린더를 새로고침하여 최신 일정을 반영합니다.`,
        },
        { status: 409 },
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
afternoon_time = ${afternoonTime},
broadcast_times = COALESCE(
  ${broadcastTimesJson}::jsonb,
  broadcast_times
)
        WHERE date = ${date}
        RETURNING *;
      `;
      return NextResponse.json(
        { message: "Schedule updated successfully", schedule: rows[0] },
        { status: 200 },
      );
    } else {
      // 기존 일정이 없는 경우, 새로 생성
      const { rows } = await sql`
        INSERT INTO schedules (
  date,
  events,
  memo,
  is_break_day,
  version,
  break_day_image_id,
  morning_time,
  afternoon_time,
  broadcast_times
)
VALUES (
  ${date},
  ${JSON.stringify(events)},
  ${memo},
  ${isBreakDay},
  1,
  ${isBreakDay ? breakDayImageId : null},
  ${morningTime},
  ${afternoonTime},
  ${insertBroadcastTimesJson}::jsonb
)
RETURNING *;
      `;
      return NextResponse.json(
        { message: "Schedule created successfully", schedule: rows[0] },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Failed to save schedule:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 },
    );
  }
}
