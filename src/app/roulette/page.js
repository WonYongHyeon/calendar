"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChzzkChat } from "../hooks/useChzzkChat";
import RouletteCanvas from "../../../components/RouletteCanvas";
import RouletteControls from "../../../components/RouletteControls";
import styles from "../../../components/Roulette.module.css";

function RouletteContent() {
  const searchParams = useSearchParams();
  const initialChannel = searchParams.get("channel") || "";
  const isObs =
    searchParams.get("obs") === "1" || searchParams.get("obs") === "true";

  const [channelId, setChannelId] = useState(initialChannel);
  const { status, errorMsg } = useChzzkChat(channelId);

  if (isObs) {
    return (
      <main className={styles.obsPage}>
        <RouletteCanvas />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>치지직 채팅 투표 룰렛</h1>
            <p className={styles.subtitle}>
              시청자가 <strong>!투표 항목</strong>을 입력하면 득표수 비율로
              룰렛이 만들어집니다.
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          <RouletteCanvas />
          <RouletteControls
            channelId={channelId}
            onChangeChannelId={setChannelId}
            connectionStatus={status}
            errorMsg={errorMsg}
          />
        </div>
      </div>
    </main>
  );
}

export default function RoulettePage() {
  return (
    <Suspense fallback={<div className={styles.page}>불러오는 중...</div>}>
      <RouletteContent />
    </Suspense>
  );
}
