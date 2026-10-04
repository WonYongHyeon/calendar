"use client";

import { useState } from "react";
import styles from "../../../components/gift.module.css";

export default function GiftPage() {
  const [copied, setCopied] = useState(false);

  const name = "해블린";
  const address =
    "(04387) 서울특별시 용산구 서빙고로 17, 센트럴파크타워 29층 샌드박스네트워크";

  const copyInfo = async () => {
    await navigator.clipboard.writeText(`받는 사람: ${name}\n주소: ${address}`);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.gift}>🎁</div>

        <h1>선물 보내실 곳</h1>

        <p className={styles.description}>
          보내주시는 마음만으로도 감사합니다 💕
        </p>

        <div className={styles.info}>
          <div className={styles.item}>
            <span>받는 사람</span>
            <strong>{name}</strong>
          </div>

          <div className={styles.item}>
            <span>주소</span>
            <strong>{address}</strong>
          </div>
        </div>

        <button className={styles.copyButton} onClick={copyInfo}>
          {copied ? "✓ 복사되었습니다!" : "📋 배송정보 한번에 복사"}
        </button>

        <div className={styles.notice}>
          <div className={styles.noticeTitle}>
            ⚠️ 선물을 보내시기 전에 확인해주세요!
          </div>
          <ul>
            <li>음식물 및 변질될 수 있는 상품은 보내지 말아주세요.</li>
            <li>착불 택배는 수령이 어려울 수 있습니다.</li>
            <li>위험물 및 배송이 제한되는 물품은 보내실 수 없습니다.</li>
            <li>보내주신 선물은 방송에서 소개되지 않을 수도 있습니다.</li>
            <li>
              선물을 보내신 후에는 꼭 알려주세요! 회사에서 대신 수령하는
              방식이라, 말씀해주시지 않으면 선물 도착 여부를 확인하기 어려워요.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
