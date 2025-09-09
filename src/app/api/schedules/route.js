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

    let updatedSchedule;
    if (isBreakDay) {
      const { rows } = await sql`
        INSERT INTO schedules (date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time)
        VALUES (${date}, ${JSON.stringify(
        events
      )}, ${memo}, ${isBreakDay}, 1, ${breakDayImageId}, ${morningTime}, ${afternoonTime})
        ON CONFLICT (date) DO UPDATE SET
        events = EXCLUDED.events,
        memo = EXCLUDED.memo,
        is_break_day = EXCLUDED.is_break_day,
        version = schedules.version + 1,
        break_day_image_id = EXCLUDED.break_day_image_id,
        morning_time = EXCLUDED.morning_time,
        afternoon_time = EXCLUDED.afternoon_time
        RETURNING *;
      `;
      updatedSchedule = rows[0];
    } else {
      if (
        events.length === 0 &&
        !memo.trim() &&
        !morningTime.trim() &&
        !afternoonTime.trim()
      ) {
        await sql`DELETE FROM schedules WHERE date = ${date};`;
      } else {
        const { rows } = await sql`
          INSERT INTO schedules (date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time)
          VALUES (${date}, ${JSON.stringify(
          events
        )}, ${memo}, ${isBreakDay}, 1, null, ${morningTime}, ${afternoonTime})
          ON CONFLICT (date) DO UPDATE SET
          events = EXCLUDED.events,
          memo = EXCLUDED.memo,
          is_break_day = EXCLUDED.is_break_day,
          version = schedules.version + 1,
          break_day_image_id = null,
          morning_time = EXCLUDED.morning_time,
          afternoon_time = EXCLUDED.afternoon_time
          RETURNING *;
        `;
        updatedSchedule = rows[0];
      }
    }

    return NextResponse.json(
      { message: "Schedule saved successfully", schedule: updatedSchedule },
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
