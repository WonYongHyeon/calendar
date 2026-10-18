// src/app/api/auth/login/route.js

import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

import {
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_DURATION = 60 * 60 * 24 * 7;

// 로그인
export async function POST(request) {
  try {
    const body = await request.json();

    const { username, password } = body ?? {};

    // 입력값 확인
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length === 0 ||
      username.length > 50 ||
      password.length === 0 ||
      password.length > 1024
    ) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 확인해 주세요." },
        { status: 400 },
      );
    }

    // 관리자 계정 조회
    const { rows } = await sql`
      SELECT
        id,
        username,
        password_hash,
        role,
        is_active
      FROM admins
      WHERE LOWER(username) = LOWER(${username})
      LIMIT 1;
    `;

    const admin = rows[0];

    // 계정 확인 및 비밀번호 검증
    const isValidPassword = admin?.is_active
      ? await verifyPassword(password, admin.password_hash)
      : false;

    // Cloudflare 로그인 진단용
    console.log("========== LOGIN DEBUG ==========");
    console.log("관리자 계정 존재:", !!admin);
    console.log("관리자 계정 활성화:", admin?.is_active === true);
    console.log("비밀번호 검증 성공:", isValidPassword);
    console.log("=================================");

    if (!admin || !isValidPassword) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 },
      );
    }

    // 세션 생성
    const token = generateSessionToken();

    const tokenHash = await hashSessionToken(token);

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION * 1000,
    ).toISOString();

    // 세션 DB 저장
    await sql`
      INSERT INTO admin_sessions (
        admin_id,
        token_hash,
        expires_at
      )
      VALUES (
        ${admin.id},
        ${tokenHash},
        ${expiresAt}::timestamptz
      );
    `;

    // 마지막 로그인 시간 업데이트
    await sql`
      UPDATE admins
      SET last_login_at = NOW()
      WHERE id = ${admin.id};
    `;

    // 로그인 성공 응답
    const response = NextResponse.json({
      success: true,
      message: "로그인에 성공했습니다.",
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });

    // 로그인 쿠키 설정
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
