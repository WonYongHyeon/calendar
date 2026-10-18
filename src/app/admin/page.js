"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [admin, setAdmin] = useState(null);
  const [admins, setAdmins] = useState([]);

  // 관리자별 아이디 표시 상태
  const [visibleUsernames, setVisibleUsernames] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 계정 관리 상태
  const [updatingId, setUpdatingId] = useState(null);

  const [resetTargetId, setResetTargetId] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // 관리자 목록 조회
  async function loadAdmins() {
    const response = await fetch("/api/admins", {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "관리자 목록 조회에 실패했습니다.");
    }

    setAdmins(data.admins);
  }

  // 로그인 및 권한 확인
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("로그인 상태 확인에 실패했습니다.");
        }

        const data = await response.json();

        if (!data.isLoggedIn) {
          throw new Error("관리자 로그인이 필요합니다.");
        }

        if (data.admin.role !== "super_admin") {
          throw new Error("최고 관리자만 접근할 수 있습니다.");
        }

        if (!active) return;

        setAdmin(data.admin);

        await loadAdmins();
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  // 새로운 관리자 생성
  async function handleCreate(e) {
    e.preventDefault();

    if (creating) return;

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          nickname: nickname.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "관리자 생성에 실패했습니다.");
      }

      setUsername("");
      setNickname("");
      setPassword("");
      setConfirmPassword("");

      setMessage("관리자 계정이 생성되었습니다.");

      // 관리자 목록 새로고침
      await loadAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // 계정 활성화 / 비활성화
  async function handleSetActive(item) {
    const nextActive = !item.is_active;

    const confirmed = window.confirm(
      nextActive
        ? `${item.username} 계정을 활성화하시겠습니까?`
        : `${item.username} 계정을 비활성화하시겠습니까?\n기존 로그인도 해제됩니다.`,
    );

    if (!confirmed) return;

    setUpdatingId(item.id);
    setActionError("");
    setActionMessage("");

    try {
      const response = await fetch("/api/admins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set_active",
          adminId: item.id,
          isActive: nextActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "계정 상태 변경에 실패했습니다.");
      }

      setActionMessage(data.message);

      await loadAdmins();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // 관리자 비밀번호 초기화
  async function handleResetPassword(e, item) {
    e.preventDefault();

    if (updatingId) return;

    setActionError("");
    setActionMessage("");

    if (newPassword.length < 8) {
      setActionError("비밀번호는 8자리 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setActionError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setUpdatingId(item.id);

    try {
      const response = await fetch("/api/admins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reset_password",
          adminId: item.id,
          password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "비밀번호 변경에 실패했습니다.");
      }

      setActionMessage(data.message);

      setResetTargetId(null);
      setNewPassword("");
      setConfirmNewPassword("");

      await loadAdmins();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // 관리자 아이디 표시 / 숨기기
  function toggleUsername(adminId) {
    setVisibleUsernames((prev) =>
      prev.includes(adminId)
        ? prev.filter((id) => id !== adminId)
        : [...prev, adminId],
    );
  }

  // 날짜 표시
  function formatDate(date) {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleString("ko-KR");
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p>관리자 정보를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 접근 권한 없음
  if (!admin) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h2>접근할 수 없습니다.</h2>

          <p className={styles.error}>{error}</p>

          <Link href="/login" className={styles.button}>
            로그인
          </Link>

          <Link href="/" className={styles.backLink}>
            일정표로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* 상단 */}
        <header className={styles.header}>
          <div>
            <h1>관리자 계정 관리</h1>

            <p>최고 관리자: {admin.nickname || admin.username}</p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin/history" className={styles.backButton}>
              📋 수정 기록
            </Link>

            <Link href="/" className={styles.backButton}>
              ← 일정표
            </Link>
          </div>
        </header>

        {/* 관리자 목록 */}
        <section className={styles.card}>
          <h2>
            관리자 목록
            <span className={styles.count}>{admins.length}명</span>
          </h2>

          {actionError && (
            <div className={styles.error} role="alert">
              {actionError}
            </div>
          )}

          {actionMessage && (
            <div className={styles.success} role="status">
              {actionMessage}
            </div>
          )}

          <div className={styles.adminList}>
            {admins.map((item) => (
              <div key={item.id} className={styles.adminItem}>
                <div className={styles.adminInfo}>
                  <div className={styles.adminTitle}>
                    <strong>{item.nickname || item.username}</strong>

                    <span
                      className={
                        item.role === "super_admin"
                          ? styles.superBadge
                          : styles.adminBadge
                      }
                    >
                      {item.role === "super_admin"
                        ? "최고 관리자"
                        : "일반 관리자"}
                    </span>

                    <span
                      className={
                        item.is_active
                          ? styles.activeBadge
                          : styles.inactiveBadge
                      }
                    >
                      {item.is_active ? "활성" : "비활성"}
                    </span>
                  </div>

                  <div className={styles.adminDetails}>
                    {/* 관리자 아이디 */}
                    <div className={styles.usernameRow}>
                      <span>아이디:</span>

                      <span className={styles.usernameValue}>
                        {visibleUsernames.includes(item.id)
                          ? item.username
                          : "•".repeat(12)}
                      </span>

                      <button
                        type="button"
                        className={styles.visibilityButton}
                        onClick={() => toggleUsername(item.id)}
                        aria-label={
                          visibleUsernames.includes(item.id)
                            ? "아이디 숨기기"
                            : "아이디 표시"
                        }
                        aria-pressed={visibleUsernames.includes(item.id)}
                        title={
                          visibleUsernames.includes(item.id)
                            ? "아이디 숨기기"
                            : "아이디 표시"
                        }
                      >
                        {visibleUsernames.includes(item.id) ? (
                          // 아이디 표시 중 - 눈 감기
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c5.5 0 9.5 4.5 10 7-.3 1.4-1.8 3.5-4 5" />
                            <path d="M6.3 6.3C4.2 7.6 2.7 10 2 12c.8 3 4.8 7 10 7 1.6 0 3.1-.4 4.4-1" />
                            <path d="M10 10a3 3 0 0 0 4 4" />
                          </svg>
                        ) : (
                          // 아이디 숨김 중 - 눈 뜨기
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>

                    <span>생성일: {formatDate(item.created_at)}</span>

                    <span>마지막 로그인: {formatDate(item.last_login_at)}</span>
                  </div>
                  {/* 일반 관리자 계정 관리 */}
                  {item.role === "admin" && (
                    <>
                      <div className={styles.accountActions}>
                        {/* 활성화 / 비활성화 */}
                        <button
                          type="button"
                          className={
                            item.is_active
                              ? styles.dangerButton
                              : styles.secondaryButton
                          }
                          disabled={updatingId !== null}
                          onClick={() => handleSetActive(item)}
                        >
                          {updatingId === item.id
                            ? "처리 중..."
                            : item.is_active
                              ? "비활성화"
                              : "활성화"}
                        </button>

                        {/* 비밀번호 초기화 */}
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={updatingId !== null}
                          onClick={() => {
                            setResetTargetId(
                              resetTargetId === item.id ? null : item.id,
                            );

                            setNewPassword("");
                            setConfirmNewPassword("");
                            setActionError("");
                          }}
                        >
                          비밀번호 초기화
                        </button>
                      </div>

                      {/* 비밀번호 초기화 입력창 */}
                      {resetTargetId === item.id && (
                        <form
                          className={styles.resetForm}
                          onSubmit={(e) => handleResetPassword(e, item)}
                        >
                          <h4>{item.username} 비밀번호 변경</h4>

                          <input
                            type="password"
                            placeholder="새 비밀번호 (8자리 이상)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            required
                          />

                          <input
                            type="password"
                            placeholder="새 비밀번호 확인"
                            value={confirmNewPassword}
                            onChange={(e) =>
                              setConfirmNewPassword(e.target.value)
                            }
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            required
                          />

                          <button
                            type="submit"
                            className={styles.button}
                            disabled={updatingId !== null}
                          >
                            {updatingId === item.id
                              ? "변경 중..."
                              : "비밀번호 변경"}
                          </button>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 관리자 생성 */}
        <section className={styles.card}>
          <h2>새 관리자 생성</h2>

          <p className={styles.description}>
            생성된 계정은 일반 관리자 권한을 갖습니다.
          </p>

          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="username">관리자 아이디</label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="영문, 숫자, 밑줄(_) 3~50자"
                minLength={3}
                maxLength={50}
                pattern="[a-zA-Z0-9_]{3,50}"
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="nickname">관리자 닉네임</label>

              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="화면에 표시할 닉네임 (1~30자)"
                minLength={1}
                maxLength={30}
                autoComplete="off"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">비밀번호</label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상 입력"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">비밀번호 확인</label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 다시 입력"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {message && <div className={styles.success}>{message}</div>}

            <button type="submit" className={styles.button} disabled={creating}>
              {creating ? "생성 중..." : "관리자 계정 생성"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
