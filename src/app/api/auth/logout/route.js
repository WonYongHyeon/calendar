// src/app/api/auth/logout/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";

import { hashSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 현재 세션 토큰 가져오기
    const token = cookies().get("admin_session")?.value;

    // 세션 토큰이 정상적인 형식이라면 DB에서 무효화
    if (token && /^[0-9a-f]{64}$/i.test(token)) {
      const tokenHash = await hashSessionToken(token);

      await sql`
        UPDATE admin_sessions
        SET revoked_at = NOW()
        WHERE token_hash = ${tokenHash}
          AND revoked_at IS NULL;
      `;
    }

    // 로그아웃 응답
    const response = NextResponse.json({
      success: true,
      message: "로그아웃되었습니다.",
    });

    // 브라우저의 세션 쿠키 삭제
    response.cookies.set("admin_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        error: "로그아웃 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
