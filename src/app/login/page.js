"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 이미 로그인되어 있다면 일정표로 이동
  useEffect(() => {
    let cancelled = false;

    async function checkLogin() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled && data.isLoggedIn) {
          router.replace("/");
        }
      } catch (error) {
        console.error("로그인 상태 확인 실패:", error);
      }
    }

    checkLogin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // 로그인 처리
  async function handleLogin(e) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }

      // 로그인 성공
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("로그인 오류:", error);

      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <div className={styles.icon}>🔐</div>

          <h1>해블린 일정표</h1>

          <p>관리자 로그인</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">아이디</label>

            <input
              id="username"
              type="text"
              placeholder="관리자 아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={50}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">비밀번호</label>

            <input
              id="password"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <Link href="/" className={styles.backLink}>
          ← 일정표로 돌아가기
        </Link>
      </div>
    </main>
  );
}
