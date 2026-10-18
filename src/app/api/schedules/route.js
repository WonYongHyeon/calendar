// pages/api/schedules/route.js

import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";

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

        broadcastTimes: Array.isArray(row.broadcast_times)
          ? row.broadcast_times
          : [],
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
      }),
    );
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  // =====================================
  // 1. 관리자 로그인 확인
  // =====================================

  let admin;

  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    console.error("관리자 인증 오류:", error);

    return NextResponse.json(
      { error: "인증 확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  if (!admin) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  if (!["admin", "super_admin"].includes(admin.role)) {
    return NextResponse.json(
      { error: "일정 수정 권한이 없습니다." },
      { status: 403 },
    );
  }

  // =====================================
  // 2. 외부 사이트 요청 차단
  // =====================================

  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  }

  // =====================================
  // 3. 일정 데이터 처리
  // =====================================

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

    // 날짜 형식 확인
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "올바르지 않은 날짜입니다." },
        { status: 400 },
      );
    }

    // =====================================
    // 4. 방송 시간 배열 정리
    // =====================================

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

    // 기존 입력 방식 호환
    const insertBroadcastTimesJson =
      broadcastTimesJson ??
      JSON.stringify(
        [morningTime, afternoonTime]
          .filter((time) => typeof time === "string" && time.trim())
          .map((time) => time.trim())
          .sort(),
      );

    // =====================================
    // 5. 기존 일정 버전 확인
    // =====================================

    const { rows: existingRows } = await sql`
      SELECT version
      FROM schedules
      WHERE date = ${date};
    `;

    const existingVersion =
      existingRows.length > 0 ? existingRows[0].version : null;

    if (existingRows.length > 0 && existingVersion !== version) {
      return NextResponse.json(
        {
          error:
            "다른 사용자에 의해 이미 수정되었습니다.\n캘린더를 새로고침하여 최신 일정을 반영합니다.",
        },
        { status: 409 },
      );
    }

    // =====================================
    // 6. 기존 일정 수정
    // =====================================

    if (existingRows.length > 0) {
      const { rows } = await sql`

        WITH actor AS MATERIALIZED (
          SELECT set_config(
            'app.admin_id',
            ${String(admin.id)},
            true
          ) AS admin_id
        )

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

        FROM actor

        WHERE schedules.date = ${date}
          AND schedules.version = ${version}

        RETURNING schedules.*;
      `;

      // 동시 수정 충돌 방지
      if (rows.length === 0) {
        return NextResponse.json(
          {
            error:
              "다른 사용자에 의해 이미 수정되었습니다.\n캘린더를 새로고침해 주세요.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message: "Schedule updated successfully",
          schedule: rows[0],
        },
        { status: 200 },
      );
    }

    // =====================================
    // 7. 새로운 일정 생성
    // =====================================
    else {
      const { rows } = await sql`

        WITH actor AS MATERIALIZED (
          SELECT set_config(
            'app.admin_id',
            ${String(admin.id)},
            true
          ) AS admin_id
        )

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

        SELECT
          ${date},
          ${JSON.stringify(events)},
          ${memo},
          ${isBreakDay},
          1,
          ${isBreakDay ? breakDayImageId : null},
          ${morningTime},
          ${afternoonTime},
          ${insertBroadcastTimesJson}::jsonb

        FROM actor

        RETURNING *;
      `;

      return NextResponse.json(
        {
          message: "Schedule created successfully",
          schedule: rows[0],
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Failed to save schedule:", error);

    // 동일 날짜가 동시에 생성된 경우
    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "다른 사용자에 의해 일정이 이미 생성되었습니다.\n캘린더를 새로고침해 주세요.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 },
    );
  }
}
