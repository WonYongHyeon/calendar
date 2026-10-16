import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

// ========================================
// 유튜브 설정
// ========================================

// 직접 만든 롱폼 재생목록 ID
const PLAYLIST_ID = "PLKzDqnOmfjqE";

// API 캐시 시간 (1시간)
const CACHE_SECONDS = 1800;

// ========================================
// API 키 가져오기
// ========================================

function getApiKey() {
  try {
    const context = getCloudflareContext();

    if (context.env.YOUTUBE_API_KEY) {
      return context.env.YOUTUBE_API_KEY;
    }
  } catch {
    // 로컬 개발 환경
  }

  return process.env.YOUTUBE_API_KEY;
}

// ========================================
// 유튜브 재생목록 조회
// ========================================

export async function GET(request) {
  try {
    const cache = globalThis.caches?.default;

    // 캐시 확인
    if (cache) {
      const cached = await cache.match(request);

      if (cached) {
        return cached;
      }
    }

    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error("YOUTUBE_API_KEY가 없습니다.");
    }

    let allVideos = [];
    let nextPageToken = "";

    // 최대 250개 영상 확인
    for (let page = 0; page < 5; page++) {
      const url = new URL(
        "https://www.googleapis.com/youtube/v3/playlistItems",
      );

      url.searchParams.set("part", "snippet,contentDetails");

      url.searchParams.set("playlistId", PLAYLIST_ID);

      url.searchParams.set("maxResults", "50");

      if (nextPageToken) {
        url.searchParams.set("pageToken", nextPageToken);
      }

      const response = await fetch(url, {
        headers: {
          "x-goog-api-key": apiKey,
        },
      });

      if (!response.ok) {
        console.error("YouTube API status:", response.status);

        throw new Error(`YouTube API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      const videos = (data.items || [])
        .filter((item) => {
          const videoId = item.contentDetails?.videoId;

          const title = item.snippet?.title;

          return (
            videoId &&
            title &&
            title !== "Private video" &&
            title !== "Deleted video"
          );
        })
        .map((item) => ({
          id: item.contentDetails.videoId,

          title: item.snippet.title,

          thumbnail:
            item.snippet.thumbnails?.high?.url ||
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            "",

          // 영상이 실제로 공개된 날짜
          publishedAt: item.contentDetails.videoPublishedAt || null,
        }));

      allVideos.push(...videos);

      nextPageToken = data.nextPageToken;

      if (!nextPageToken) {
        break;
      }
    }

    // ========================================
    // 실제 영상 공개 날짜 기준 정렬
    // ========================================

    // 재생목록 순서 그대로 사용
    const videos = allVideos;

    const result = NextResponse.json({
      videos,
      total: allVideos.length,
    });

    result.headers.set(
      "Cache-Control",
      `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
    );

    // Cloudflare 캐시 저장
    if (cache) {
      try {
        await cache.put(request, result.clone());
      } catch (error) {
        console.warn("캐시 저장 실패:", error);
      }
    }

    return result;
  } catch (error) {
    console.error("YouTube API Error:", error);

    return NextResponse.json(
      {
        videos: [],
        error: error.message,
      },
      { status: 500 },
    );
  }
}
