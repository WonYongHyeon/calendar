// src/lib/admin-session.js

import { sql } from "@vercel/postgres";
import { cookies } from "next/headers";
import { hashSessionToken } from "@/lib/auth";

// 현재 로그인한 관리자 확인
export async function getCurrentAdmin() {
  // 쿠키에서 세션 토큰 가져오기
  const token = cookies().get("admin_session")?.value;

  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    return null;
  }

  // 세션 토큰 해시 생성
  const tokenHash = await hashSessionToken(token);

  // DB에서 세션과 관리자 정보 확인
  const { rows } = await sql`
    SELECT
      a.id::text AS id,
      a.username,
      a.nickname,
      a.role
    FROM admin_sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND s.revoked_at IS NULL
      AND a.is_active = TRUE
    LIMIT 1;
  `;

  const admin = rows[0];

  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    nickname: admin.nickname || admin.username,
    role: admin.role,
  };
}
