// pages/api/backup-restore/route.js

import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

// ✅ 사용자의 비밀번호로 변경하세요.
const AUTH_PASSWORD = "pigvelyn";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const { password } = await request.json();

    // ✅ 비밀번호 인증
    if (password !== AUTH_PASSWORD) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    if (action === "backup") {
      await sql`TRUNCATE schedules_backup;`;
      await sql`INSERT INTO schedules_backup (date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time) SELECT date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time FROM schedules;`;

      return NextResponse.json(
        { message: "Backup completed successfully" },
        { status: 200 }
      );
    } else if (action === "restore") {
      await sql`TRUNCATE schedules;`;
      await sql`INSERT INTO schedules (date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time) SELECT date, events, memo, is_break_day, version, break_day_image_id, morning_time, afternoon_time FROM schedules_backup;`;

      return NextResponse.json(
        { message: "Restore completed successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Backup/Restore failed:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
