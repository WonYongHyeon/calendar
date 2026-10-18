import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

/* ========================================
   기본 설정
======================================== */

// 유튜브 재생목록 ID
const PLAYLIST_ID = "PLKzDqnOmfjqE";

// Cloudflare 캐시 시간 (30분)
const CACHE_SECONDS = 1800;

// 한 번에 가져올 영상 수
const PAGE_SIZE = 50;

// 최대 조회 페이지 (50개 × 5 = 250개)
const MAX_PAGES = 5;

/* ========================================
   YouTube API 키
======================================== */

function getApiKey() {
  try {
    const context = getCloudflareContext();

    if (context.env?.YOUTUBE_API_KEY) {
      return context.env.YOUTUBE_API_KEY;
    }
  } catch {
    // 로컬 개발 환경에서는 process.env 사용
  }

  return process.env.YOUTUBE_API_KEY;
}

/* ========================================
   영상 데이터 변환
======================================== */

function formatVideo(item) {
  const videoId = item.contentDetails?.videoId;
  const title = item.snippet?.title;

  // 비공개·삭제 영상 제외
  if (
    !videoId ||
    !title ||
    title === "Private video" ||
    title === "Deleted video"
  ) {
    return null;
  }

  return {
    id: videoId,
    title,

    thumbnail:
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      "",

    publishedAt: item.contentDetails.videoPublishedAt || null,
  };
}

/* ========================================
   유튜브 재생목록 조회
======================================== */

async function fetchPlaylistVideos(apiKey) {
  const videos = [];
  let nextPageToken = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");

    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", PLAYLIST_ID);
    url.searchParams.set("maxResults", String(PAGE_SIZE));

    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url, {
      headers: {
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`YouTube API 요청 실패 (${response.status})`);
    }

    const data = await response.json();

    const pageVideos = (data.items || []).map(formatVideo).filter(Boolean);

    videos.push(...pageVideos);

    nextPageToken = data.nextPageToken || "";

    if (!nextPageToken) {
      break;
    }
  }

  return videos;
}

/* ========================================
   GET /api/youtube
======================================== */

export async function GET(request) {
  try {
    const cache = globalThis.caches?.default;

    // 1. Cloudflare 캐시 확인
    if (cache) {
      const cached = await cache.match(request);

      if (cached) {
        return cached;
      }
    }

    // 2. API 키 확인
    const apiKey = getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          videos: [],
          error: "YouTube API 키가 설정되지 않았습니다.",
        },
        { status: 500 },
      );
    }

    // 3. 유튜브 영상 조회
    const videos = await fetchPlaylistVideos(apiKey);

    // 4. 응답 생성
    const result = NextResponse.json({
      videos,
      total: videos.length,
    });

    // 5. 캐시 설정
    result.headers.set(
      "Cache-Control",
      `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
    );

    // 6. Cloudflare 캐시 저장
    if (cache) {
      try {
        await cache.put(request, result.clone());
      } catch (error) {
        console.warn("Cloudflare 캐시 저장 실패:", error);
      }
    }

    return result;
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
