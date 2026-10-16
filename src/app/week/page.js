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
  {
    name: "OGQ",
    icon: "OGQ",
    url: "https://ogqmarket.naver.com/creators/%ED%95%B4%EB%B8%94%EB%A6%B0",
    className: "ogq",
  },
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MAX_VISIBLE_EVENTS = 4;

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

function getMonday(date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setUTCDate(result.getUTCDate() + diff);

  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShort(date) {
  return `${date.getUTCMonth() + 1}.${String(date.getUTCDate()).padStart(
    2,
    "0",
  )}`;
}

/* ========================================
   주간 일정표
======================================== */

function WeeklySchedule() {
  const [weekStart, setWeekStart] = useState(null);
  const [todayKey, setTodayKey] = useState("");
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!selectedDay) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedDay(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDay]);

  useEffect(() => {
    const today = getKoreanToday();

    setWeekStart(getMonday(today));
    setTodayKey(formatDate(today));
  }, []);

  useEffect(() => {
    if (!weekStart) return;

    const controller = new AbortController();

    async function loadSchedule() {
      setLoading(true);

      try {
        // 월요일부터 일요일까지
        const weekDates = Array.from({ length: 7 }, (_, index) =>
          addDays(weekStart, index),
        );

        // 주간 일정이 두 달에 걸쳐 있을 수 있으므로
        // 필요한 연도와 월을 모두 확인
        const months = [
          ...new Set(
            weekDates.map(
              (date) => `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`,
            ),
          ),
        ];

        // 기존 일정 API 호출
        const responses = await Promise.all(
          months.map(async (monthKey) => {
            const [year, month] = monthKey.split("-");

            const response = await fetch(
              `/api/schedules?year=${year}&month=${month}`,
              { signal: controller.signal },
            );

            if (!response.ok) {
              throw new Error("일정 불러오기 실패");
            }

            return response.json();
          }),
        );

        // 월별 데이터 합치기
        const scheduleData = Object.assign({}, ...responses);

        const formattedSchedule = {};

        weekDates.forEach((date) => {
          const dateKey = formatDate(date);
          const data = scheduleData[dateKey];

          if (!data) {
            formattedSchedule[dateKey] = [];
            return;
          }

          // 휴방
          if (data.isBreakDay) {
            formattedSchedule[dateKey] = [
              {
                type: "off",
                title: data.memo?.trim() || "휴방",
              },
            ];
            return;
          }

          // 방송 시간
          const broadcastTimes = Array.isArray(data.broadcastTimes)
            ? data.broadcastTimes
            : [];

          // 기존 오전/오후 시간 호환
          const legacyTimes = [data.morningTime, data.afternoonTime].filter(
            Boolean,
          );

          const times = [
            ...new Set(
              (broadcastTimes.length > 0 ? broadcastTimes : legacyTimes).filter(
                Boolean,
              ),
            ),
          ].sort();

          // 방송 일정
          const events = Array.isArray(data.events) ? data.events : [];

          formattedSchedule[dateKey] = [
            // 방송 시간을 하나의 그룹으로 묶기
            ...(times.length > 0
              ? [
                  {
                    type: "time-only",
                    times: times,
                    title: "",
                  },
                ]
              : []),

            // 기존 방송 일정
            ...events.map((event) => ({
              type: event.scheduleType || "",
              title: event.text || "",
            })),
          ];
        });

        if (!controller.signal.aborted) {
          setSchedule(formattedSchedule);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
          setSchedule({});
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => controller.abort();
  }, [weekStart]);

  if (!weekStart) {
    return (
      <section className="cafe-section schedule-section">
        <h2>🌸 주간 일정표</h2>
        <p>일정을 불러오는 중...</p>
      </section>
    );
  }

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const weekEnd = weekDates[6];

  function moveWeek(amount) {
    setWeekStart((prev) => addDays(prev, amount * 7));
  }

  function goToday() {
    setWeekStart(getMonday(getKoreanToday()));
  }

  return (
    <section className="cafe-section schedule-section">
      <div className="section-header schedule-header">
        <div className="section-title">
          <span className="title-icon">🌸</span>
          <h2>주간 일정표</h2>
          <span className="english-title">WEEKLY SCHEDULE</span>
        </div>

        <div className="week-navigation">
          <button
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

          <button className="today-button" onClick={goToday}>
            ▣ 이번 주
          </button>
        </div>
      </div>

      <div className="schedule-scroll">
        <div className="schedule-grid">
          {weekDates.map((date, index) => {
            const key = formatDate(date);
            const events = schedule[key] || [];
            const isToday = key === todayKey;

            // 방송 시간은 별도로 표시
            const timeEvents = events.filter(
              (event) => event.type === "time-only",
            );

            // 실제 일정
            const scheduleEvents = events.filter(
              (event) => event.type !== "time-only",
            );

            // 최대 4개까지만 표시
            const visibleEvents = scheduleEvents.slice(0, MAX_VISIBLE_EVENTS);

            // 숨겨진 일정 개수
            const hiddenCount = Math.max(
              0,
              scheduleEvents.length - MAX_VISIBLE_EVENTS,
            );

            // 휴방 여부 확인
            const isBreakDay = events.some((event) => event.type === "off");

            return (
              <div
                key={key}
                className={`schedule-day ${isToday ? "is-today" : ""} ${
                  isBreakDay ? "is-break-day" : ""
                }`}
                role="button"
                tabIndex={0}
                aria-label={`${formatShort(date)} ${DAYS[index]} 전체 일정 보기`}
                onClick={() =>
                  setSelectedDay({
                    key,
                    label: `${formatShort(date)} ${DAYS[index]}`,
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedDay({
                      key,
                      label: `${formatShort(date)} ${DAYS[index]}`,
                    });
                  }
                }}
              >
                <div className="day-header">
                  <div className="day-date-row">
                    <span className="day-date">{formatShort(date)}</span>

                    <span
                      className={`day-name ${index === 5 ? "saturday" : ""} ${
                        index === 6 ? "sunday" : ""
                      }`}
                    >
                      {DAYS[index]}
                    </span>
                  </div>
                </div>

                <div className="day-content">
                  {loading ? (
                    <span className="empty-text">불러오는 중</span>
                  ) : events.length === 0 ? (
                    <span className="empty-text">일정 없음</span>
                  ) : (
                    <>
                      {timeEvents.map((event, index) => (
                        <ScheduleEvent key={`time-${index}`} event={event} />
                      ))}

                      {visibleEvents.map((event, index) => (
                        <ScheduleEvent key={`event-${index}`} event={event} />
                      ))}

                      {hiddenCount > 0 && (
                        <div className="schedule-more">
                          +{hiddenCount}개 더보기
                        </div>
                      )}
                    </>
                  )}
                </div>

                {isToday && <div className="today-indicator">TODAY</div>}
              </div>
            );
          })}
        </div>
      </div>
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
              {(schedule[selectedDay.key] || []).length === 0 ? (
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
        {LINKS.map((link) =>
          link.url ? (
            <a
              href={link.url}
              key={link.name}
              target="_blank"
              rel="noopener noreferrer"
              className={`quick-link ${link.className}`}
            >
              <span className="link-icon">{link.icon}</span>

              <span className="link-name">{link.name} ↗</span>
            </a>
          ) : (
            <div
              key={link.name}
              className={`quick-link ${link.className} link-unset`}
              title="링크 주소를 설정해 주세요"
            >
              <span className="link-icon">{link.icon}</span>

              <span className="link-name">{link.name} ↗</span>
            </div>
          ),
        )}
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

  useEffect(() => {
    let active = true;

    async function loadVideos() {
      try {
        const response = await fetch("/api/youtube?v=2");

        if (!response.ok) {
          throw new Error("유튜브 데이터 요청 실패");
        }

        const data = await response.json();

        if (!active) return;

        const videoList = data.videos || [];

        setVideos(videoList);

        if (videoList.length > 0) {
          setSelectedVideoId(videoList[0].id);
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadVideos();

    return () => {
      active = false;
    };
  }, []);

  const selectedVideo =
    videos.find((video) => video.id === selectedVideoId) || videos[0];

  function selectVideo(videoId) {
    setSelectedVideoId(videoId);
  }

  return (
    <section className="cafe-section youtube-section">
      {/* 유튜브 헤더 */}

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

      {/* 로딩 */}

      {loading ? (
        <div className="video-empty">영상을 불러오는 중...</div>
      ) : error ? (
        <div className="video-empty">영상을 불러오지 못했습니다.</div>
      ) : videos.length === 0 ? (
        <div className="video-empty">등록된 영상이 없습니다.</div>
      ) : (
        <div className="youtube-layout">
          {/* 왼쪽 플레이어 */}

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

          {/* 오른쪽 영상 목록 */}

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
                    onClick={() => selectVideo(video.id)}
                    aria-pressed={isSelected}
                  >
                    <div className="youtube-list-thumbnail">
                      {video.thumbnail && (
                        <img src={video.thumbnail} alt="" loading="lazy" />
                      )}

                      {isSelected && <span className="youtube-playing">▶</span>}
                    </div>

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
