import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(request) {
  try {
    // =====================================
    // 1. 관리자 인증
    // =====================================

    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    if (admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "최고 관리자만 조회할 수 있습니다." },
        { status: 403 },
      );
    }

    // =====================================
    // 2. 검색 조건
    // =====================================

    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date") || null;
    const adminId = searchParams.get("adminId") || null;
    const action = searchParams.get("action") || null;

    const pageParam = searchParams.get("page") || "1";

    if (!/^[1-9]\d*$/.test(pageParam)) {
      return NextResponse.json(
        { error: "올바르지 않은 페이지입니다." },
        { status: 400 },
      );
    }

    const page = Number(pageParam);

    if (!Number.isSafeInteger(page) || page > 100000) {
      return NextResponse.json(
        { error: "올바르지 않은 페이지입니다." },
        { status: 400 },
      );
    }

    if (date) {
      const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(date);

      const parsedDate = new Date(`${date}T00:00:00Z`);

      const validDate =
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date;

      if (!validFormat || !validDate) {
        return NextResponse.json(
          { error: "올바르지 않은 날짜입니다." },
          { status: 400 },
        );
      }
    }

    if (adminId && !/^[1-9]\d{0,17}$/.test(adminId)) {
      return NextResponse.json(
        { error: "올바르지 않은 관리자 ID입니다." },
        { status: 400 },
      );
    }

    if (action && !["create", "update", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "올바르지 않은 작업 유형입니다." },
        { status: 400 },
      );
    }

    const offset = (page - 1) * PAGE_SIZE;

    // =====================================
    // 3. 전체 기록 개수
    // =====================================

    const countResult = await sql`
      SELECT COUNT(*) AS total
      FROM schedule_history h
      WHERE
        (${date}::date IS NULL
          OR h.schedule_date = ${date}::date)

        AND (${adminId}::bigint IS NULL
          OR h.admin_id = ${adminId}::bigint)

        AND (${action}::text IS NULL
          OR h.action = ${action});
    `;

    const total = Number(countResult.rows[0].total);

    // =====================================
    // 4. 수정 기록 조회
    // =====================================

    const { rows } = await sql`
  SELECT
    h.id::text AS id,

    TO_CHAR(
      h.schedule_date,
      'YYYY-MM-DD'
    ) AS schedule_date,

    h.action,
    h.admin_id::text AS admin_id,

    COALESCE(
      NULLIF(TRIM(a.nickname), ''),
      a.username,
      '알 수 없는 관리자'
    ) AS nickname,

    COALESCE(
      a.username,
      '알 수 없는 관리자'
    ) AS username,

    h.before_data,
    h.after_data,
    h.created_at

  FROM schedule_history h

  LEFT JOIN admins a
    ON h.admin_id = a.id

  WHERE
    (${date}::date IS NULL
      OR h.schedule_date = ${date}::date)

    AND (${adminId}::bigint IS NULL
      OR h.admin_id = ${adminId}::bigint)

    AND (${action}::text IS NULL
      OR h.action = ${action})

  ORDER BY
    h.created_at DESC,
    h.id DESC

  LIMIT ${PAGE_SIZE}
  OFFSET ${offset};
`;

    // =====================================
    // 5. 결과 반환
    // =====================================

    return NextResponse.json(
      {
        success: true,
        history: rows,
        pagination: {
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PAGE_SIZE),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("일정 수정 기록 조회 오류:", error);

    return NextResponse.json(
      {
        error: "일정 수정 기록을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
