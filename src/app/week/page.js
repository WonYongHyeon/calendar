"use client";

import { useEffect, useState } from "react";
import "../../../components/week.css";

/* ========================================
   기본 설정
======================================== */

const LINKS = [
  {
    name: "치지직",
    icon: "CHZZK",
    url: "https://chzzk.naver.com/e14259667937be6e561d28ab156718be",
    className: "chzzk",
  },
  {
    name: "유튜브",
    icon: "▶",
    url: "https://www.youtube.com/@haevelyn",
    className: "youtube",
  },
  {
    name: "X (트위터)",
    icon: "𝕏",
    url: "https://x.com/haevelyn__",
    className: "twitter",
  },
  {
    name: "선물 보낼 곳",
    icon: "🎁",
    url: "https://haevelyn-schedule.vercel.app/gift",
    className: "gift",
  },
  // {
  //   name: "OGQ",
  //   icon: "OGQ",
  //   url: "https://ogqmarket.naver.com/creators/%ED%95%B4%EB%B8%94%EB%A6%B0",
  //   className: "ogq",
  // },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// 하루에 표시할 최대 일정 수
const MAX_VISIBLE_EVENTS = 4;

// 유튜브 API 주소
const YOUTUBE_API_URL = "/api/youtube?v=4";

/* ========================================
   날짜 관련 함수
======================================== */

// 한국 시간 기준 오늘 날짜
function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => Number(parts.find((part) => part.type === type).value);

  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

// 해당 날짜가 속한 주의 월요일
function getMonday(date) {
  const result = new Date(date);
  const day = result.getUTCDay();

  result.setUTCDate(result.getUTCDate() + (day === 0 ? -6 : 1 - day));

  return result;
}

// 날짜 더하기
function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// YYYY-MM-DD
function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// M.DD
function formatShort(date) {
  const month = date.getUTCMonth() + 1;
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${month}.${day}`;
}

// 월요일부터 일요일까지
function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/* ========================================
   일정 데이터 변환
======================================== */

// 방송 시간 정리
function normalizeBroadcastTimes(times) {
  if (!Array.isArray(times)) return [];

  return [
    ...new Set(times.filter((time) => typeof time === "string" && time.trim())),
  ].sort((a, b) => {
    const [hourA, minuteA] = a.split(":").map(Number);
    const [hourB, minuteB] = b.split(":").map(Number);

    return hourA * 60 + minuteA - (hourB * 60 + minuteB);
  });
}

// API 데이터를 화면용 일정으로 변환
function formatSchedule(data) {
  if (!data) return [];

  // 휴방
  if (data.isBreakDay) {
    return [
      {
        type: "off",
        title: data.memo?.trim() || "휴방",
      },
    ];
  }

  const times = normalizeBroadcastTimes(data.broadcastTimes);

  const events = Array.isArray(data.events) ? data.events : [];

  return [
    // 방송 시간
    ...(times.length > 0
      ? [
          {
            type: "time-only",
            times,
            title: "",
          },
        ]
      : []),

    // 일반 일정
    ...events.map((event) => ({
      type: event.scheduleType || "",
      title: event.text || "",
    })),
  ];
}

/* ========================================
   일정 표시 컴포넌트
======================================== */

function ScheduleEvent({ event }) {
  return (
    <div className={`schedule-event ${event.type || ""}`}>
      {event.times ? (
        <div className="event-times">
          {event.times.map((time, index) => (
            <span className="event-time" key={index}>
              {time}
            </span>
          ))}
        </div>
      ) : (
        event.time && <span className="event-time">{event.time}</span>
      )}

      {event.title && <span className="event-title">{event.title}</span>}
    </div>
  );
}

/* ========================================
   주간 일정표
======================================== */

function WeeklySchedule() {
  const [weekStart, setWeekStart] = useState(null);
  const [todayKey, setTodayKey] = useState("");

  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedDay, setSelectedDay] = useState(null);

  // 오늘 날짜 초기화
  useEffect(() => {
    const today = getKoreanToday();

    setWeekStart(getMonday(today));
    setTodayKey(formatDate(today));
  }, []);

  // 모달 ESC 닫기
  useEffect(() => {
    if (!selectedDay) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedDay(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDay]);

  // 주간 일정 조회
  useEffect(() => {
    if (!weekStart) return;

    const controller = new AbortController();

    async function loadSchedule() {
      setLoading(true);
      setError(false);
      setSchedule({});

      try {
        const weekDates = getWeekDates(weekStart);

        // 해당 주에 포함된 연도와 월 추출
        const months = [
          ...new Set(
            weekDates.map(
              (date) => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`,
            ),
          ),
        ];

        // 월별 일정 조회
        const responses = await Promise.all(
          months.map(async (monthKey) => {
            const [year, month] = monthKey.split("-");

            const response = await fetch(
              `/api/schedules?year=${year}&month=${month}`,
              {
                signal: controller.signal,
              },
            );

            if (!response.ok) {
              throw new Error("일정 불러오기 실패");
            }

            return response.json();
          }),
        );

        if (controller.signal.aborted) return;

        // 월별 데이터 합치기
        const scheduleData = Object.assign({}, ...responses);

        // 주간 데이터 구성
        const formattedSchedule = {};

        weekDates.forEach((date) => {
          const dateKey = formatDate(date);

          formattedSchedule[dateKey] = formatSchedule(scheduleData[dateKey]);
        });

        setSchedule(formattedSchedule);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("주간 일정 조회 실패:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => controller.abort();
  }, [weekStart]);

  // 주 이동
  function moveWeek(amount) {
    setSelectedDay(null);
    setWeekStart((prev) => addDays(prev, amount * 7));
  }

  // 이번 주 이동
  function goToday() {
    const today = getKoreanToday();

    setSelectedDay(null);
    setTodayKey(formatDate(today));
    setWeekStart(getMonday(today));
  }

  // 일정 모달 열기
  function openDay(date, index) {
    setSelectedDay({
      key: formatDate(date),
      label: `${formatShort(date)} ${DAYS[index]}`,
    });
  }

  if (!weekStart) {
    return (
      <section className="cafe-section schedule-section">
        <h2>🗓️ 주간 일정표</h2>
        <p>일정을 불러오는 중...</p>
      </section>
    );
  }

  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  return (
    <section className="cafe-section schedule-section">
      {/* 헤더 */}

      <div className="section-header schedule-header">
        <div className="section-title">
          <span className="title-icon">🗓️</span>
          <h2>주간 일정표</h2>
          <span className="english-title">WEEKLY SCHEDULE</span>
        </div>

        {/* 주간 이동 */}

        <div className="week-navigation">
          <button
            type="button"
            className="week-arrow"
            onClick={() => moveWeek(-1)}
            aria-label="이전 주"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>

          <div className="week-range">
            {weekStart.getUTCFullYear()}. {formatShort(weekStart)}
            {" ~ "}
            {formatShort(weekEnd)}
          </div>

          <button
            type="button"
            className="week-arrow"
            onClick={() => moveWeek(1)}
            aria-label="다음 주"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6L15 12L9 18" />
            </svg>
          </button>

          <button type="button" className="today-button" onClick={goToday}>
            ▣ 이번 주
          </button>
        </div>
      </div>

      {/* 주간 달력 */}

      <div className="schedule-scroll">
        <div className="schedule-grid">
          {weekDates.map((date, index) => {
            const dateKey = formatDate(date);
            const events = schedule[dateKey] || [];

            const isToday = dateKey === todayKey;

            const isBreakDay = events.some((event) => event.type === "off");

            // 방송 시간과 일반 일정 분리
            const timeEvents = events.filter(
              (event) => event.type === "time-only",
            );

            const scheduleEvents = events.filter(
              (event) => event.type !== "time-only",
            );

            // 표시할 일정
            const visibleEvents = scheduleEvents.slice(0, MAX_VISIBLE_EVENTS);

            const hiddenCount = Math.max(
              0,
              scheduleEvents.length - MAX_VISIBLE_EVENTS,
            );

            return (
              <div
                key={dateKey}
                className={`schedule-day ${
                  isToday ? "is-today" : ""
                } ${isBreakDay ? "is-break-day" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${formatShort(date)} ${DAYS[index]} 전체 일정 보기`}
                onClick={() => openDay(date, index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDay(date, index);
                  }
                }}
              >
                {/* 날짜 */}

                <div className="day-header">
                  <div className="day-date-row">
                    <span className="day-date">{formatShort(date)}</span>

                    <span
                      className={`day-name ${
                        index === 5 ? "saturday" : ""
                      } ${index === 6 ? "sunday" : ""}`}
                    >
                      {DAYS[index]}
                    </span>
                  </div>
                </div>

                {/* 일정 */}

                <div className="day-content">
                  {loading ? (
                    <span className="empty-text">불러오는 중</span>
                  ) : error ? (
                    <span className="empty-text">불러오기 실패</span>
                  ) : events.length === 0 ? (
                    <span className="empty-text">일정 없음</span>
                  ) : (
                    <>
                      {/* 방송 시간 */}

                      {timeEvents.map((event, index) => (
                        <ScheduleEvent key={`time-${index}`} event={event} />
                      ))}

                      {/* 일반 일정 */}

                      {visibleEvents.map((event, index) => (
                        <ScheduleEvent key={`event-${index}`} event={event} />
                      ))}

                      {/* 더보기 */}

                      {hiddenCount > 0 && (
                        <div className="schedule-more">
                          +{hiddenCount}개 더보기
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 오늘 표시 */}

                {isToday && <div className="today-indicator">TODAY</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 전체 일정 모달 */}

      {selectedDay && (
        <div
          className="schedule-modal-overlay"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedDay.label} 전체 일정`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="schedule-modal-header">
              <h3>📅 {selectedDay.label}</h3>

              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="schedule-modal-body">
              {loading ? (
                <p className="empty-text">일정을 불러오는 중...</p>
              ) : error ? (
                <p className="empty-text">일정을 불러오지 못했습니다.</p>
              ) : (schedule[selectedDay.key] || []).length === 0 ? (
                <p className="empty-text">등록된 일정이 없습니다.</p>
              ) : (
                (schedule[selectedDay.key] || []).map((event, index) => (
                  <ScheduleEvent key={index} event={event} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========================================
   바로가기
======================================== */

function QuickLinks() {
  return (
    <section className="cafe-section">
      <div className="section-header">
        <div className="section-title">
          <span className="title-icon">🔗</span>
          <h2>바로가기</h2>
          <span className="english-title">LINKS</span>
        </div>
      </div>

      <div className="quick-links">
        {LINKS.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`quick-link ${link.className}`}
          >
            <span className="link-icon">{link.icon}</span>

            <span className="link-name">{link.name} ↗</span>
          </a>
        ))}
        <div className="quick-link"> 수정중! </div>
      </div>
    </section>
  );
}

/* ========================================
   유튜브 영상 플레이어 + 목록
======================================== */

function LatestVideos() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const youtubeLink =
    LINKS.find((link) => link.className === "youtube")?.url || "";

  // 유튜브 영상 조회
  useEffect(() => {
    const controller = new AbortController();

    async function loadVideos() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(YOUTUBE_API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`유튜브 데이터 요청 실패 (${response.status})`);
        }

        const data = await response.json();

        if (controller.signal.aborted) return;

        const videoList = Array.isArray(data.videos) ? data.videos : [];

        setVideos(videoList);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("유튜브 영상 조회 실패:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadVideos();

    return () => controller.abort();
  }, []);

  // 선택된 영상
  const selectedVideo =
    videos.find((video) => video.id === selectedVideoId) || videos[0];

  return (
    <section className="cafe-section youtube-section">
      {/* 헤더 */}

      <div className="section-header">
        <div className="section-title">
          <span className="title-icon youtube-icon">▶</span>

          <h2>유튜브</h2>

          <span className="english-title">YOUTUBE VIDEOS</span>
        </div>

        {youtubeLink && (
          <a
            href={youtubeLink}
            target="_blank"
            rel="noopener noreferrer"
            className="youtube-channel-button"
          >
            유튜브 채널 바로가기 ↗
          </a>
        )}
      </div>

      {/* 영상 영역 */}

      {loading ? (
        <div className="video-empty">영상을 불러오는 중...</div>
      ) : error ? (
        <div className="video-empty">영상을 불러오지 못했습니다.</div>
      ) : videos.length === 0 ? (
        <div className="video-empty">등록된 영상이 없습니다.</div>
      ) : (
        <div className="youtube-layout">
          {/* 메인 플레이어 */}

          <div className="youtube-main">
            <div className="youtube-player">
              <iframe
                key={selectedVideo.id}
                src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}?rel=0&playsinline=1`}
                title={selectedVideo.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          {/* 영상 목록 */}

          <div className="youtube-sidebar">
            <div className="youtube-list-header">
              <span>📺 영상 목록</span>

              <span className="youtube-count">{videos.length}개</span>
            </div>

            <div className="youtube-video-list">
              {videos.map((video) => {
                const isSelected = video.id === selectedVideo.id;

                return (
                  <button
                    type="button"
                    key={video.id}
                    className={`youtube-list-item ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedVideoId(video.id)}
                    aria-pressed={isSelected}
                  >
                    {/* 썸네일 */}

                    <div className="youtube-list-thumbnail">
                      {video.thumbnail && (
                        <img src={video.thumbnail} alt="" loading="lazy" />
                      )}

                      {isSelected && <span className="youtube-playing">▶</span>}
                    </div>

                    {/* 영상 제목 */}

                    <div className="youtube-list-info">
                      <span className="youtube-list-title">{video.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ========================================
   메인 페이지
======================================== */

export default function CafePage() {
  return (
    <main className="cafe-page">
      <WeeklySchedule />
      <QuickLinks />
      <LatestVideos />
    </main>
  );
}
