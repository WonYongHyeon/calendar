"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";

import styles from "./page.module.css";
import Calendar from "../../components/Calendar";

export default function Home() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // =====================================
  // 1. 로그인 상태 확인
  // =====================================

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("인증 확인 실패");
        }

        const data = await response.json();

        if (active) {
          setAdmin(data.isLoggedIn ? data.admin : null);
        }
      } catch (error) {
        console.error("Auth error:", error);

        if (active) {
          setAuthError(true);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  // =====================================
  // 2. 로그아웃
  // =====================================

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("로그아웃 실패");
      }

      setAdmin(null);
      setAuthError(false);
    } catch (error) {
      console.error("Logout error:", error);
      setAuthError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  // =====================================
  // 3. 관리자 권한 확인
  // =====================================

  const isAdmin =
    !checking && !authError && ["admin", "super_admin"].includes(admin?.role);

  // =====================================
  // 4. 화면
  // =====================================

  return (
    <div className={styles.container}>
      <Head>
        <title>해블린 일정표</title>
      </Head>

      <div className={styles.pageWrapper}>
        {/* =====================================
            페이지 헤더
        ===================================== */}

        <header className={styles.redesignHeader}>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>
              <h1 className={styles.pageTitle}>해블린 월간 일정표</h1>{" "}
              <span>MONTHLY SCHEDULE</span>
            </div>
          </div>
        </header>

        {/* =====================================
            관리자 로그인 영역
        ===================================== */}

        <div className={styles.authBar}>
          {checking ? (
            <span className={styles.authStatus}>로그인 확인 중...</span>
          ) : authError ? (
            <span className={styles.authStatus}>
              로그인 상태 확인에 실패했습니다.
              <button
                className={styles.authButton}
                onClick={() => window.location.reload()}
              >
                다시 시도
              </button>
            </span>
          ) : admin ? (
            <>
              <span className={styles.adminName}>
                👤 {admin.nickname || admin.username}
                {admin.role === "super_admin" && (
                  <span className={styles.superAdminBadge}>최고 관리자</span>
                )}
              </span>

              {admin.role === "super_admin" && (
                <Link href="/admin" className={styles.authButton}>
                  ⚙️ 관리자 관리
                </Link>
              )}

              <button
                className={styles.authButton}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "처리 중..." : "로그아웃"}
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.authButton}>
              🔐 관리자 로그인
            </Link>
          )}
        </div>

        {/* =====================================
            월간 일정표
        ===================================== */}

        <main className={styles.main}>
          <Calendar isAdmin={isAdmin} />
        </main>
      </div>
    </div>
  );
}
