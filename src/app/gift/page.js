"use client";

import { useState } from "react";

export default function GiftPage() {
  const [copied, setCopied] = useState(false);

  const name = "해블린";
  const address =
    "(04387) 서울특별시 용산구 서빙고로 17, 센트럴파크타워 29층 샌드박스네트워크";

  const copyInfo = async () => {
    const text = `받는 사람: ${name}
주소: ${address}`;

    await navigator.clipboard.writeText(text);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <main className="container">
      <div className="card">
        <div className="gift">🎁</div>

        <h1>선물 보내실 곳</h1>

        <p className="description"></p>

        {/* 배송 정보 */}
        <div className="info">
          <div className="item">
            <span>받는 사람</span>
            <strong>{name}</strong>
          </div>

          <div className="item">
            <span>주소</span>
            <strong>{address}</strong>
          </div>
        </div>

        <button onClick={copyInfo}>
          {copied ? "✓ 복사되었습니다!" : "📋 배송정보 한번에 복사"}
        </button>

        {/* 주의사항 */}
        <div className="notice">
          <div className="noticeTitle">
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

      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff7fa;
          padding: 30px 20px;
        }

        .card {
          width: 100%;
          max-width: 450px;
          padding: 36px 30px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          text-align: center;
        }

        .gift {
          font-size: 48px;
          margin-bottom: 10px;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          color: #333;
        }

        .description {
          margin: 10px 0 30px;
          color: #999;
          font-size: 14px;
        }

        .info {
          background: #fafafa;
          border-radius: 16px;
          padding: 22px;
          text-align: left;
          margin-bottom: 15px;
        }

        .item {
          margin-bottom: 20px;
        }

        .item:last-child {
          margin-bottom: 0;
        }

        .item span {
          display: block;
          color: #aaa;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .item strong {
          display: block;
          color: #333;
          font-size: 16px;
          line-height: 1.6;
          word-break: keep-all;
        }

        button {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          background: #ff6f9f;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
        }

        button:hover {
          background: #ff568d;
        }

        button:active {
          transform: scale(0.98);
        }

        .notice {
          margin-top: 25px;
          padding: 20px;
          background: #fff8e8;
          border: 1px solid #ffe7ad;
          border-radius: 16px;
          text-align: left;
        }

        .noticeTitle {
          color: #8a6514;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .notice ul {
          margin: 0;
          padding-left: 20px;
        }

        .notice li {
          color: #76684a;
          font-size: 13px;
          line-height: 1.7;
          margin-bottom: 5px;
        }

        .notice li:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 480px) {
          .card {
            padding: 30px 22px;
            border-radius: 20px;
          }

          h1 {
            font-size: 24px;
          }

          .notice {
            padding: 17px;
          }
        }
      `}</style>
    </main>
  );
}
