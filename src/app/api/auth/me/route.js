// src/app/api/auth/me/route.js

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    const response = NextResponse.json({
      isLoggedIn: !!admin,
      admin: admin ?? null,
    });

    response.headers.set("Cache-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Auth check error:", error);

    return NextResponse.json(
      {
        error: "로그인 상태 확인 중 오류가 발생했습니다.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
