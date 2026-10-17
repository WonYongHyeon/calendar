import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =====================================
// 오류 처리
// =====================================

class RestoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status });
}

// =====================================
// 최고 관리자 확인
// =====================================

async function checkSuperAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return {
      error: jsonError("관리자 로그인이 필요합니다.", 401),
    };
  }

  if (admin.role !== "super_admin") {
    return {
      error: jsonError("최고 관리자만 복구할 수 있습니다.", 403),
    };
  }

  return { admin };
}

// =====================================
// 기록 ID 검사
// =====================================

function isValidId(id) {
  return typeof id === "string" && /^[1-9]\d{0,17}$/.test(id);
}

// =====================================
// 복구 데이터 정리
// =====================================

function normalizeSnapshot(snapshot, date) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new RestoreError("복구할 데이터가 올바르지 않습니다.", 422);
  }

  if (snapshot.date !== date) {
    throw new RestoreError("복구 기록의 날짜가 일치하지 않습니다.", 422);
  }

  if (snapshot.events != null && !Array.isArray(snapshot.events)) {
    throw new RestoreError("일정 데이터 형식이 올바르지 않습니다.", 422);
  }

  if (
    snapshot.broadcast_times != null &&
    !Array.isArray(snapshot.broadcast_times)
  ) {
    throw new RestoreError("방송 시간 데이터 형식이 올바르지 않습니다.", 422);
  }

  // 이전 방송 시간 방식도 호환
  const broadcastTimes = Array.isArray(snapshot.broadcast_times)
    ? snapshot.broadcast_times
    : [snapshot.morning_time, snapshot.afternoon_time].filter(
        (time) => typeof time === "string" && time.trim(),
      );

  return {
    events: JSON.stringify(snapshot.events ?? []),

    memo: snapshot.memo ?? "",

    isBreakDay: snapshot.is_break_day === true,

    breakDayImageId: snapshot.break_day_image_id ?? null,

    morningTime: snapshot.morning_time ?? "",

    afternoonTime: snapshot.afternoon_time ?? "",

    broadcastTimes: JSON.stringify(broadcastTimes),

    version:
      Number.isInteger(snapshot.version) && snapshot.version >= 0
        ? snapshot.version
        : 0,
  };
}

// =====================================
// GET - 복구 미리보기
// =====================================

export async function GET(request) {
  try {
    const auth = await checkSuperAdmin();

    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);

    const historyId = searchParams.get("historyId");

    if (!isValidId(historyId)) {
      return jsonError("올바르지 않은 수정 기록 ID입니다.", 400);
    }

    const { rows } = await sql`
      SELECT
        h.id::text AS id,
        h.action,
        h.schedule_date::text AS schedule_date,
        h.before_data AS target,
        to_jsonb(s) AS current_data

      FROM schedule_history h

      LEFT JOIN schedules s
        ON s.date = h.schedule_date

      WHERE h.id = ${historyId}::bigint

      LIMIT 1;
    `;

    if (rows.length === 0) {
      return jsonError("수정 기록을 찾을 수 없습니다.", 404);
    }

    const record = rows[0];

    return NextResponse.json(
      {
        success: true,

        history: {
          id: record.id,
          action: record.action,
          scheduleDate: record.schedule_date,
        },

        // 현재 일정
        current: record.current_data,

        // 복구할 과거 일정
        target: record.target,

        // 동시 수정 방지용
        expectedExists: record.current_data !== null,

        expectedVersion: record.current_data?.version ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("복구 미리보기 오류:", error);

    return jsonError("복구 정보를 불러오지 못했습니다.", 500);
  }
}

// =====================================
// POST - 실제 일정 복구
// =====================================

export async function POST(request) {
  let admin;

  try {
    const auth = await checkSuperAdmin();

    if (auth.error) return auth.error;

    admin = auth.admin;
  } catch (error) {
    console.error("복구 인증 오류:", error);

    return jsonError("인증 확인에 실패했습니다.", 500);
  }

  // 외부 사이트 요청 차단
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return jsonError("허용되지 않은 요청입니다.", 403);
  }

  const body = await request.json().catch(() => null);

  const { historyId, expectedExists, expectedVersion } = body ?? {};

  if (!isValidId(historyId)) {
    return jsonError("올바르지 않은 수정 기록 ID입니다.", 400);
  }

  if (typeof expectedExists !== "boolean") {
    return jsonError("복구 확인 정보가 올바르지 않습니다.", 400);
  }

  if (
    expectedExists &&
    (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
  ) {
    return jsonError("일정 버전 정보가 올바르지 않습니다.", 400);
  }

  if (!expectedExists && expectedVersion !== null) {
    return jsonError("일정 버전 정보가 올바르지 않습니다.", 400);
  }

  // 같은 DB 연결에서 트랜잭션 실행
  let client;

  try {
    client = await sql.connect();

    await client.sql`BEGIN`;

    // =====================================
    // 1. 복구 기록 조회
    // =====================================

    const historyResult = await client.sql`
      SELECT
        id::text AS id,
        action,
        schedule_date::text AS schedule_date,
        before_data

      FROM schedule_history

      WHERE id = ${historyId}::bigint

      LIMIT 1;
    `;

    if (historyResult.rows.length === 0) {
      throw new RestoreError("수정 기록을 찾을 수 없습니다.", 404);
    }

    const history = historyResult.rows[0];

    const date = history.schedule_date;

    if (!["create", "update", "delete"].includes(history.action)) {
      throw new RestoreError("지원하지 않는 수정 기록입니다.", 422);
    }

    // =====================================
    // 2. 현재 일정 잠금 및 확인
    // =====================================

    const currentResult = await client.sql`
      SELECT version
      FROM schedules
      WHERE date = ${date}::date
      FOR UPDATE;
    `;

    const currentExists = currentResult.rows.length > 0;

    const currentVersion = currentExists ? currentResult.rows[0].version : null;

    // 미리보기 이후 다른 수정이 있었는지 확인
    if (
      currentExists !== expectedExists ||
      currentVersion !== expectedVersion
    ) {
      throw new RestoreError(
        "다른 관리자가 일정을 변경했습니다. 복구 화면을 다시 열어 주세요.",
        409,
      );
    }

    // =====================================
    // 3. 복구할 데이터 확인
    // =====================================

    const snapshot = history.before_data;

    if (history.action !== "create" && snapshot === null) {
      throw new RestoreError("복구할 이전 데이터가 없습니다.", 422);
    }

    const target = snapshot ? normalizeSnapshot(snapshot, date) : null;

    if (!target && !currentExists) {
      throw new RestoreError("이미 일정이 없는 상태입니다.", 409);
    }

    // =====================================
    // 4. 복구 관리자 ID 설정
    // =====================================

    await client.sql`
      SELECT set_config(
        'app.admin_id',
        ${String(admin.id)},
        true
      );
    `;

    // =====================================
    // 5. 복구 실행
    // =====================================

    let resultAction;

    if (!target) {
      // 수정 전 일정이 없었던 경우
      // 현재 일정 삭제

      await client.sql`
        DELETE FROM schedules
        WHERE date = ${date}::date;
      `;

      resultAction = "delete";
    } else if (currentExists) {
      // 현재 일정이 존재하면 UPDATE

      await client.sql`
        UPDATE schedules
        SET
          events = ${target.events}::jsonb,

          memo = ${target.memo},

          is_break_day = ${target.isBreakDay},

          break_day_image_id =
            ${target.breakDayImageId},

          morning_time = ${target.morningTime},

          afternoon_time = ${target.afternoonTime},

          broadcast_times =
            ${target.broadcastTimes}::jsonb,

          version = schedules.version + 1

        WHERE date = ${date}::date;
      `;

      resultAction = "update";
    } else {
      // 삭제된 일정 복구
      // 새로운 행으로 INSERT

      const nextVersion = target.version + 1;

      await client.sql`
        INSERT INTO schedules (
          date,
          events,
          memo,
          is_break_day,
          version,
          break_day_image_id,
          morning_time,
          afternoon_time,
          broadcast_times,
        )

        VALUES (
          ${date},
          ${target.events}::jsonb,
          ${target.memo},
          ${target.isBreakDay},
          ${nextVersion},
          ${target.breakDayImageId},
          ${target.morningTime},
          ${target.afternoonTime},
          ${target.broadcastTimes}::jsonb,
        );
      `;

      resultAction = "create";
    }

    // =====================================
    // 6. 모든 작업 확정
    // =====================================

    await client.sql`COMMIT`;

    return NextResponse.json({
      success: true,
      message: `${date} 일정이 복구되었습니다.`,
      date,
      action: resultAction,
    });
  } catch (error) {
    if (client) {
      try {
        await client.sql`ROLLBACK`;
      } catch (rollbackError) {
        console.error("복구 롤백 실패:", rollbackError);
      }
    }

    if (error instanceof RestoreError) {
      return jsonError(error.message, error.status);
    }

    if (
      error?.code === "23505" ||
      error?.code === "40001" ||
      error?.code === "40P01"
    ) {
      return jsonError(
        "다른 작업과 충돌했습니다. 새로고침 후 다시 시도해 주세요.",
        409,
      );
    }

    console.error("일정 복구 오류:", error);

    return jsonError("일정 복구 중 오류가 발생했습니다.", 500);
  } finally {
    if (client) {
      client.release();
    }
  }
}
