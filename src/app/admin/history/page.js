"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./history.module.css";

// DB 컬럼 이름을 한글로 변환
const FIELD_NAMES = {
  date: "일정 날짜",
  events: "일정 내용",
  memo: "메모",
  is_break_day: "휴방 여부",
  break_day_image_id: "휴방 이미지",
  broadcast_times: "방송 시간",
  morning_time: "기존 오전 시간",
  afternoon_time: "기존 오후 시간",
  version: "수정 버전",
};

// 작업 종류 표시
const ACTION_NAMES = {
  create: "일정 추가",
  update: "일정 수정",
  delete: "일정 삭제",
};

// 데이터 출력
function formatValue(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "예" : "아니요";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "없음";
    }

    if (value.every((item) => typeof item === "string")) {
      return value.join(", ");
    }

    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

// 변경된 항목 추출
function getChanges(before, after) {
  const beforeData = before || {};
  const afterData = after || {};

  const keys = [
    ...new Set([...Object.keys(beforeData), ...Object.keys(afterData)]),
  ];

  return keys
    .filter((key) => {
      return JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]);
    })
    .map((key) => ({
      key,
      name: FIELD_NAMES[key] || key,
      before: beforeData[key],
      after: afterData[key],
    }));
}

// 날짜 출력
function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

export default function ScheduleHistoryPage() {
  const [authStatus, setAuthStatus] = useState("checking");

  const [admins, setAdmins] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [filterDate, setFilterDate] = useState("");
  const [filterAdmin, setFilterAdmin] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [expandedId, setExpandedId] = useState(null);

  // 복구 기능
  const [restorePreview, setRestorePreview] = useState(null);

  const [restoreLoadingId, setRestoreLoadingId] = useState(null);

  const [restoreSaving, setRestoreSaving] = useState(false);

  const [restoreError, setRestoreError] = useState("");

  const [historyRefresh, setHistoryRefresh] = useState(0);

  // =====================================
  // 1. 최고 관리자 확인
  // =====================================

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("인증 확인에 실패했습니다.");
        }

        const data = await response.json();

        if (!active) return;

        if (!data.isLoggedIn) {
          setAuthStatus("login");
          return;
        }

        if (data.admin?.role !== "super_admin") {
          setAuthStatus("forbidden");
          return;
        }

        setAuthStatus("ready");

        // 관리자 목록 불러오기
        const adminsResponse = await fetch("/api/admins", {
          cache: "no-store",
        });

        if (adminsResponse.ok) {
          const adminsData = await adminsResponse.json();

          if (active) {
            setAdmins(adminsData.admins || []);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setAuthStatus("error");
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  // =====================================
  // 2. 수정 기록 조회
  // =====================================

  useEffect(() => {
    if (authStatus !== "ready") return;

    const controller = new AbortController();

    async function loadHistory() {
      setLoading(true);
      setError("");
      setExpandedId(null);

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));

        if (filterDate) {
          params.set("date", filterDate);
        }

        if (filterAdmin) {
          params.set("adminId", filterAdmin);
        }

        if (filterAction) {
          params.set("action", filterAction);
        }

        const response = await fetch(
          `/api/admin/history?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "수정 기록 조회에 실패했습니다.");
        }

        if (controller.signal.aborted) return;

        setHistory(data.history || []);
        setPagination(data.pagination);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message);
        setHistory([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      controller.abort();
    };
  }, [authStatus, filterDate, filterAdmin, filterAction, page, historyRefresh]);

  // =====================================
  // 3. 접근 제한 화면
  // =====================================

  if (authStatus !== "ready") {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={styles.card}>
            {authStatus === "checking" ? (
              <p>로그인 상태 확인 중...</p>
            ) : (
              <>
                <h2>접근할 수 없습니다.</h2>

                <p className={styles.description}>
                  {authStatus === "login"
                    ? "관리자 로그인이 필요합니다."
                    : authStatus === "forbidden"
                      ? "최고 관리자만 접근할 수 있습니다."
                      : error}
                </p>

                <Link href="/admin" className={styles.backButton}>
                  관리자 페이지로 돌아가기
                </Link>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  // =====================================
  // 복구 미리보기
  // =====================================

  async function openRestore(item) {
    if (restoreLoadingId !== null) return;

    setRestoreLoadingId(item.id);
    setRestoreError("");

    try {
      const response = await fetch(
        `/api/admin/history/restore?historyId=${encodeURIComponent(item.id)}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "복구 정보를 불러오지 못했습니다.");
      }

      setRestorePreview(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setRestoreLoadingId(null);
    }
  }

  // =====================================
  // 실제 일정 복구
  // =====================================

  async function confirmRestore() {
    if (!restorePreview || restoreSaving) return;

    const date = restorePreview.history.scheduleDate;

    const isDelete = restorePreview.target === null;

    const confirmed = window.confirm(
      isDelete
        ? `${date} 일정이 삭제됩니다.\n정말 복구하시겠습니까?`
        : `${date} 일정을 선택한 기록의 수정 전 상태로 복구하시겠습니까?`,
    );

    if (!confirmed) return;

    setRestoreSaving(true);
    setRestoreError("");

    try {
      const response = await fetch("/api/admin/history/restore", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          historyId: restorePreview.history.id,

          expectedExists: restorePreview.expectedExists,

          expectedVersion: restorePreview.expectedVersion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "일정 복구에 실패했습니다.");
      }

      setRestorePreview(null);

      // 수정 기록 다시 조회
      setHistoryRefresh((prev) => prev + 1);

      window.alert(data.message);
    } catch (error) {
      setRestoreError(error.message);
    } finally {
      setRestoreSaving(false);
    }
  }

  // =====================================
  // 4. 화면
  // =====================================

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* 상단 */}
        <header className={styles.header}>
          <div>
            <h1>📋 일정 수정 기록</h1>

            <p>관리자별 일정 변경 내역을 확인할 수 있습니다.</p>
          </div>

          <Link href="/admin" className={styles.backButton}>
            ← 관리자 관리
          </Link>
        </header>

        {/* 검색 영역 */}
        <section className={styles.card}>
          <h2>🔎 기록 검색</h2>

          <div className={styles.filters}>
            {/* 날짜 검색 */}
            <div className={styles.filterGroup}>
              <label>일정 날짜</label>

              <input
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* 관리자 검색 */}
            <div className={styles.filterGroup}>
              <label>수정 관리자</label>

              <select
                value={filterAdmin}
                onChange={(e) => {
                  setFilterAdmin(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">전체 관리자</option>

                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.username}
                  </option>
                ))}
              </select>
            </div>

            {/* 작업 종류 */}
            <div className={styles.filterGroup}>
              <label>작업 종류</label>

              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">전체 작업</option>
                <option value="create">일정 추가</option>
                <option value="update">일정 수정</option>
                <option value="delete">일정 삭제</option>
              </select>
            </div>
          </div>

          <button
            className={styles.resetButton}
            onClick={() => {
              setFilterDate("");
              setFilterAdmin("");
              setFilterAction("");
              setPage(1);
            }}
          >
            검색 초기화
          </button>
        </section>

        {/* 수정 기록 목록 */}
        <section className={styles.card}>
          <div className={styles.listHeader}>
            <h2>수정 기록</h2>

            <span className={styles.count}>
              총 {pagination.total.toLocaleString()}건
            </span>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <p className={styles.empty}>기록을 불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className={styles.empty}>조회된 수정 기록이 없습니다.</p>
          ) : (
            <div className={styles.historyList}>
              {history.map((item) => {
                const changes = getChanges(item.before_data, item.after_data);

                return (
                  <article key={item.id} className={styles.historyItem}>
                    {/* 기록 상단 */}
                    <div className={styles.itemHeader}>
                      <span
                        className={`${styles.actionBadge} ${
                          styles[item.action] || ""
                        }`}
                      >
                        {ACTION_NAMES[item.action] || item.action}
                      </span>

                      <span className={styles.timestamp}>
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {/* 관리자 */}
                    <div className={styles.itemInfo}>
                      <span>👤 수정 관리자</span>
                      <strong>{item.username}</strong>
                    </div>

                    {/* 날짜 */}
                    <div className={styles.itemInfo}>
                      <span>📅 일정 날짜</span>
                      <strong>{item.schedule_date}</strong>
                    </div>

                    {/* 상세보기 */}
                    <button
                      className={styles.detailButton}
                      onClick={() => {
                        setExpandedId(expandedId === item.id ? null : item.id);
                      }}
                    >
                      {expandedId === item.id
                        ? "변경 내용 닫기 ▲"
                        : "변경 내용 확인 ▼"}
                    </button>
                    {/* 일정 복구 버튼 */}

                    <button
                      type="button"
                      className={styles.restoreButton}
                      disabled={restoreLoadingId !== null}
                      onClick={() => openRestore(item)}
                    >
                      {restoreLoadingId === item.id
                        ? "복구 정보 확인 중..."
                        : "↩️ 수정 전 상태로 복구"}
                    </button>

                    {/* 수정 전후 비교 */}
                    {expandedId === item.id && (
                      <div className={styles.details}>
                        <h3>📝 변경 내용 비교</h3>

                        {changes.length === 0 ? (
                          <p className={styles.empty}>
                            변경된 항목이 없습니다.
                          </p>
                        ) : (
                          changes.map((change) => (
                            <div key={change.key} className={styles.changeItem}>
                              <h4>{change.name}</h4>

                              <div className={styles.compareGrid}>
                                {/* 수정 전 */}
                                <div className={styles.beforeBox}>
                                  <span>수정 전</span>

                                  <pre>{formatValue(change.before)}</pre>
                                </div>

                                {/* 수정 후 */}
                                <div className={styles.afterBox}>
                                  <span>수정 후</span>

                                  <pre>{formatValue(change.after)}</pre>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* 페이지 이동 */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                이전
              </button>

              <span>
                {page} / {pagination.totalPages}
              </span>

              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage(page + 1)}
              >
                다음
              </button>
            </div>
          )}
        </section>
      </div>
      {/* =====================================
    일정 복구 미리보기
===================================== */}

      {restorePreview && (
        <div
          className={styles.restoreOverlay}
          onClick={() => {
            if (!restoreSaving) {
              setRestorePreview(null);
            }
          }}
        >
          <div
            className={styles.restoreDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="restore-title">↩️ 일정 복구 확인</h2>

            <p className={styles.restoreDescription}>
              {restorePreview.history.scheduleDate} 일정을 복구합니다.
            </p>

            <p className={styles.restoreWarning}>
              복구하면 현재 일정이 선택한 수정 기록의 수정 전 상태로 변경됩니다.
            </p>

            {/* 비교 영역 */}
            <div className={styles.restoreCompare}>
              {/* 현재 일정 */}
              <div className={styles.restoreBox}>
                <h3>현재 일정</h3>

                <pre>
                  {restorePreview.current
                    ? JSON.stringify(restorePreview.current, null, 2)
                    : "등록된 일정이 없습니다."}
                </pre>
              </div>

              {/* 복구할 일정 */}
              <div className={styles.restoreBox}>
                <h3>복구 후 일정</h3>

                <pre>
                  {restorePreview.target
                    ? JSON.stringify(restorePreview.target, null, 2)
                    : "일정이 삭제됩니다."}
                </pre>
              </div>
            </div>

            <p className={styles.restoreNotice}>
              ※ 일정 내용은 과거 상태로 복구되지만, 수정 버전은 새로 부여됩니다.
              복구 작업도 수정 기록에 저장됩니다.
            </p>

            {restoreError && (
              <div className={styles.restoreError} role="alert">
                {restoreError}
              </div>
            )}

            {/* 버튼 */}
            <div className={styles.restoreActions}>
              <button
                type="button"
                className={styles.restoreCancel}
                disabled={restoreSaving}
                onClick={() => {
                  setRestorePreview(null);
                }}
              >
                취소
              </button>

              <button
                type="button"
                className={styles.restoreConfirm}
                disabled={restoreSaving}
                onClick={confirmRestore}
              >
                {restoreSaving ? "복구 중..." : "복구 실행"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
