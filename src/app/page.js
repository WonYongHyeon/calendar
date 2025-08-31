"use client";
// pages/index.js
import Head from "next/head";
import styles from "./page.module.css";
import Calendar from "../../component/Calendar";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Next.js 월별 일정표</title>
        <meta name="description" content="Next.js로 만든 월별 일정표" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>🗓️ 월별 일정표</h1>
        <Calendar />
      </main>
    </div>
  );
}
