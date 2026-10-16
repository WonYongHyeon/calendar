import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const CHANNEL_HANDLE = "@haevelyn";

function getApiKey() {
  try {
    const key = getCloudflareContext().env.YOUTUBE_API_KEY;

    if (key) return key;
  } catch {
    // 로컬 Next.js 개발 환경
  }

  return process.env.YOUTUBE_API_KEY;
}

async function youtubeRequest(endpoint, params, apiKey) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube API 오류: ${response.status}`);
  }

  return response.json();
}

export async function GET(request) {
  try {
    const cache = globalThis.caches?.default;

    if (cache) {
      const cached = await cache.match(request);

      if (cached) {
        return cached;
      }
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
    }

    // 1. 채널 정보 가져오기
    const channelData = await youtubeRequest(
      "channels",
      {
        part: "contentDetails",
        forHandle: CHANNEL_HANDLE,
      },
      apiKey,
    );

    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("유튜브 채널을 찾을 수 없습니다.");
    }

    // 2. 최신 업로드 영상 가져오기
    const playlistData = await youtubeRequest(
      "playlistItems",
      {
        part: "snippet",
        playlistId: uploadsPlaylistId,
        maxResults: 5,
      },
      apiKey,
    );

    const videos = (playlistData.items || [])
      .filter(
        (item) =>
          item.snippet?.resourceId?.videoId &&
          item.snippet?.title !== "Private video" &&
          item.snippet?.title !== "Deleted video",
      )
      .map((item) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
        publishedAt: item.snippet.publishedAt,
      }));

    const response = NextResponse.json({ videos });

    // 브라우저 5분, 공유 캐시 1시간
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");

    // Cloudflare 캐시에 저장
    if (cache) {
      try {
        await cache.put(request, response.clone());
      } catch (cacheError) {
        console.warn("유튜브 캐시 저장 실패:", cacheError);
      }
    }

    return response;
  } catch (error) {
    console.error("YouTube API Error:", error);

    return NextResponse.json(
      {
        videos: [],
        error: "유튜브 영상을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
