import { NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId")?.trim();

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    // 1. 라이브 상태 조회 -> chatChannelId 추출
    const statusRes = await fetch(
      `https://api.chzzk.naver.com/polling/v2/channels/${encodeURIComponent(channelId)}/live-status`,
      { headers: HEADERS, cache: "no-store" },
    );

    if (!statusRes.ok) {
      return NextResponse.json(
        { error: "치지직 채널 상태를 불러오지 못했습니다." },
        { status: statusRes.status },
      );
    }

    const statusJson = await statusRes.json();
    const chatChannelId = statusJson?.content?.chatChannelId;

    if (!chatChannelId) {
      return NextResponse.json(
        { error: "현재 방송 중이 아니거나 채팅 채널 ID를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 2. 채팅 접속 토큰 발급 -> accessToken 추출
    const tokenRes = await fetch(
      `https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${encodeURIComponent(
        chatChannelId,
      )}&chatType=STREAMING`,
      { headers: HEADERS, cache: "no-store" },
    );

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "채팅 접속 토큰 발급에 실패했습니다." },
        { status: tokenRes.status },
      );
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson?.content?.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "accessToken이 비어 있습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ chatChannelId, accessToken });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "치지직 토큰 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
