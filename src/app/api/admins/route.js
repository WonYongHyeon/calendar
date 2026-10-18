import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-session";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 최고 관리자 권한 확인
async function checkSuperAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  if (admin.role !== "super_admin") {
    return {
      error: NextResponse.json(
        { error: "최고 관리자만 접근할 수 있습니다." },
        { status: 403 },
      ),
    };
  }

  return { admin };
}

// 관리자 목록 조회
export async function GET() {
  try {
    const auth = await checkSuperAdmin();

    if (auth.error) return auth.error;

    const { rows } = await sql`
      SELECT
        id::text AS id,
        username,
        nickname,
        role,
        is_active,
        created_at,
        last_login_at
      FROM admins
      ORDER BY created_at ASC, id ASC;
    `;

    return NextResponse.json(
      {
        success: true,
        admins: rows,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("관리자 목록 조회 오류:", error);

    return NextResponse.json(
      { error: "관리자 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

// 새로운 일반 관리자 생성
export async function POST(request) {
  try {
    const auth = await checkSuperAdmin();

    if (auth.error) return auth.error;

    // 외부 사이트에서 보낸 요청 차단
    const origin = request.headers.get("origin");

    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { error: "허용되지 않은 요청입니다." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const username =
      typeof body?.username === "string" ? body.username.trim() : "";

    const nickname =
      typeof body?.nickname === "string" ? body.nickname.trim() : "";

    const password = body?.password;

    // 아이디 형식 확인
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "아이디는 영문, 숫자, 밑줄(_)을 사용해 3~50자로 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    // 닉네임 확인
    if (nickname.length < 1 || nickname.length > 30) {
      return NextResponse.json(
        {
          error: "닉네임은 1~30자로 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    // 비밀번호 확인
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          error: "비밀번호는 8~128자로 설정해 주세요.",
        },
        { status: 400 },
      );
    }

    // 아이디 중복 확인
    const existing = await sql`
      SELECT id
      FROM admins
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1;
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 },
      );
    }

    // 비밀번호 해시 생성
    const passwordHash = await hashPassword(password);

    const { rows } = await sql`
      INSERT INTO admins (
        username,
        nickname,
        password_hash,
        role,
        is_active,
        created_by
      )
      VALUES (
        ${username},
        ${nickname},
        ${passwordHash},
        'admin',
        TRUE,
        ${auth.admin.id}
      )
      RETURNING
        id::text AS id,
        username,
        nickname,
        role,
        is_active,
        created_at;
    `;

    return NextResponse.json(
      {
        success: true,
        message: "관리자 계정이 생성되었습니다.",
        admin: rows[0],
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    // 동시 요청으로 인한 아이디 중복도 처리
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디입니다." },
        { status: 409 },
      );
    }

    console.error("관리자 생성 오류:", error);

    return NextResponse.json(
      { error: "관리자 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// 관리자 계정 상태 변경 및 비밀번호 초기화
export async function PATCH(request) {
  try {
    // 최고 관리자 권한 확인
    const auth = await checkSuperAdmin();

    if (auth.error) return auth.error;

    // 외부 사이트 요청 차단
    const origin = request.headers.get("origin");

    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { error: "허용되지 않은 요청입니다." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);

    const { action, adminId } = body ?? {};

    // 관리자 ID 검증
    if (typeof adminId !== "string" || !/^[1-9][0-9]{0,17}$/.test(adminId)) {
      return NextResponse.json(
        { error: "올바르지 않은 관리자 ID입니다." },
        { status: 400 },
      );
    }

    // ==============================
    // 1. 계정 활성화 / 비활성화
    // ==============================

    if (action === "set_active") {
      const { isActive } = body;

      if (typeof isActive !== "boolean") {
        return NextResponse.json(
          { error: "계정 상태가 올바르지 않습니다." },
          { status: 400 },
        );
      }

      // 상태 변경과 세션 무효화를 하나의 SQL로 처리
      const { rows } = await sql`
        WITH updated AS (
          UPDATE admins
          SET is_active = ${isActive}
          WHERE id = ${adminId}::bigint
            AND role = 'admin'
          RETURNING id, username, is_active
        ),
        revoked AS (
          UPDATE admin_sessions
          SET revoked_at = NOW()
          WHERE admin_id IN (
            SELECT id FROM updated
          )
          AND revoked_at IS NULL
          AND ${!isActive}
          RETURNING id
        )
        SELECT
          id::text AS id,
          username,
          is_active
        FROM updated;
      `;

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error: "관리자를 찾을 수 없거나 변경할 수 없는 계정입니다.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: isActive
          ? "관리자 계정이 활성화되었습니다."
          : "관리자 계정이 비활성화되었습니다.",
        admin: rows[0],
      });
    }

    // ==============================
    // 2. 관리자 비밀번호 초기화
    // ==============================

    if (action === "reset_password") {
      const { password } = body;

      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128
      ) {
        return NextResponse.json(
          {
            error: "비밀번호는 8~128자로 설정해 주세요.",
          },
          { status: 400 },
        );
      }

      // 새로운 비밀번호 해시 생성
      const passwordHash = await hashPassword(password);

      // 비밀번호 변경과 기존 세션 무효화
      const { rows } = await sql`
        WITH updated AS (
          UPDATE admins
          SET password_hash = ${passwordHash}
          WHERE id = ${adminId}::bigint
            AND role = 'admin'
          RETURNING id, username
        ),
        revoked AS (
          UPDATE admin_sessions
          SET revoked_at = NOW()
          WHERE admin_id IN (
            SELECT id FROM updated
          )
          AND revoked_at IS NULL
          RETURNING id
        )
        SELECT
          id::text AS id,
          username
        FROM updated;
      `;

      if (rows.length === 0) {
        return NextResponse.json(
          {
            error: "관리자를 찾을 수 없거나 변경할 수 없는 계정입니다.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "비밀번호가 변경되었습니다. 기존 로그인은 모두 해제됩니다.",
      });
    }

    return NextResponse.json(
      { error: "지원하지 않는 작업입니다." },
      { status: 400 },
    );
  } catch (error) {
    console.error("관리자 계정 변경 오류:", error);

    return NextResponse.json(
      { error: "관리자 계정 변경 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
