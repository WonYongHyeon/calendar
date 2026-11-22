"use client";

import { useState } from "react";
import { useRouletteStore } from "../src/app/store/useRouletteStore";
import styles from "./Roulette.module.css";

const STATUS_LABEL = {
  IDLE: "대기 중",
  CONNECTING: "연결 중...",
  CONNECTED: "채팅 연결됨",
  ERROR: "연결 오류",
};

export default function RouletteControls({
  channelId,
  onChangeChannelId,
  connectionStatus,
  errorMsg,
}) {
  const [inputChannel, setInputChannel] = useState(channelId || "");
  const [manualLabel, setManualLabel] = useState("");

  const items = useRouletteStore((s) => s.items);
  const isCollecting = useRouletteStore((s) => s.isCollecting);
  const isSpinning = useRouletteStore((s) => s.isSpinning);
  const settings = useRouletteStore((s) => s.settings);

  const setSettings = useRouletteStore((s) => s.setSettings);
  const toggleCollecting = useRouletteStore((s) => s.toggleCollecting);
  const addManualItem = useRouletteStore((s) => s.addManualItem);
  const adjustItemCount = useRouletteStore((s) => s.adjustItemCount);
  const removeItem = useRouletteStore((s) => s.removeItem);
  const resetVotes = useRouletteStore((s) => s.resetVotes);

  const totalVotes = items.reduce((sum, item) => sum + item.count, 0);

  const handleConnectSubmit = (e) => {
    e.preventDefault();
    onChangeChannelId(inputChannel.trim());
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualLabel.trim()) return;
    addManualItem(manualLabel, 1);
    setManualLabel("");
  };

  return (
    <div className={styles.panel}>
      {/* 1. 치지직 채널 연결 */}
      <form onSubmit={handleConnectSubmit} className={styles.channelForm}>
        <label className={styles.label} htmlFor="chzzk-channel-input">
          치지직 채널 ID
        </label>
        <div className={styles.row}>
          <input
            id="chzzk-channel-input"
            type="text"
            value={inputChannel}
            onChange={(e) => setInputChannel(e.target.value)}
            placeholder="예: 45b7e3..."
            className={styles.input}
          />
          <button type="submit" className={styles.primaryBtn}>
            연결
          </button>
        </div>
        <div className={styles.statusRow}>
          <span
            className={`${styles.badge} ${
              styles[`status_${connectionStatus}`] || ""
            }`}
          >
            {STATUS_LABEL[connectionStatus] || connectionStatus}
          </span>
          {errorMsg && <span className={styles.errorText}>{errorMsg}</span>}
        </div>
      </form>

      {/* 2. 투표 규칙 설정 */}
      <div className={styles.optionsBox}>
        <div className={styles.row}>
          <label className={styles.smallLabel}>
            명령어
            <input
              type="text"
              value={settings.commandPrefix}
              onChange={(e) => setSettings({ commandPrefix: e.target.value })}
              className={styles.miniInput}
            />
          </label>

          <button
            type="button"
            aria-pressed={settings.allowDuplicateUser}
            onClick={() =>
              setSettings({ allowDuplicateUser: !settings.allowDuplicateUser })
            }
            className={styles.secondaryBtn}
            style={{
              background: settings.allowDuplicateUser ? "#10b981" : "#334155",
              color: "#ffffff",
            }}
          >
            {settings.allowDuplicateUser ? "중복 투표: ON" : "중복 투표: OFF"}
          </button>
        </div>

        <div className={styles.row}>
          <button
            type="button"
            onClick={() => toggleCollecting()}
            className={styles.secondaryBtn}
          >
            {isCollecting ? "투표 수집 일시정지" : "투표 수집 재개"}
          </button>
          <button
            type="button"
            onClick={resetVotes}
            disabled={isSpinning}
            className={styles.dangerBtn}
          >
            전체 초기화
          </button>
        </div>
      </div>

      {/* 3. 항목 수동 추가 */}
      <form onSubmit={handleManualAdd} className={styles.row}>
        <input
          type="text"
          value={manualLabel}
          onChange={(e) => setManualLabel(e.target.value)}
          placeholder="항목 직접 추가 (예: 치킨)"
          className={styles.input}
        />
        <button type="submit" className={styles.secondaryBtn}>
          추가
        </button>
      </form>

      {/* 4. 집계된 항목 목록 */}
      <div className={styles.listHeader}>
        <span>집계 항목 ({items.length}개)</span>
        <span>총 {totalVotes}표</span>
      </div>

      <ul className={styles.itemList}>
        {items.length === 0 ? (
          <li className={styles.emptyItem}>
            채팅에 <strong>{settings.commandPrefix} 치킨</strong>처럼 입력하면
            항목이 쌓입니다.
          </li>
        ) : (
          items.map((item) => {
            const pct =
              totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0;
            return (
              <li key={item.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemLabel}>{item.label}</span>
                  <span className={styles.itemMeta}>
                    {item.count}표 ({pct}%)
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => adjustItemCount(item.id, -1)}
                    className={styles.iconBtn}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => adjustItemCount(item.id, 1)}
                    className={styles.iconBtn}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => removeItem(item.id)}
                    className={styles.iconBtn}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
