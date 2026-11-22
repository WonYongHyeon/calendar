"use client";

import { useEffect, useRef, useState } from "react";
import { useRouletteStore } from "../store/useRouletteStore";

export function useChzzkChat(channelId) {
  const [status, setStatus] = useState("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const processChatMessage = useRouletteStore((s) => s.processChatMessage);

  useEffect(() => {
    const cleanId = (channelId || "").trim();
    if (!cleanId) {
      setStatus("IDLE");
      setErrorMsg("");
      return;
    }

    let cancelled = false;

    async function init() {
      setStatus("CONNECTING");
      setErrorMsg("");

      try {
        const res = await fetch(
          `/api/chzzk/token?channelId=${encodeURIComponent(cleanId)}`,
          { cache: "no-store" },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "채팅 토큰을 가져오지 못했습니다.");
        }
        if (cancelled) return;

        const ws = new WebSocket("wss://kr-ss1.chat.naver.com/chat");
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;

          ws.send(
            JSON.stringify({
              ver: "3",
              cmd: 100,
              svcid: "game",
              cid: data.chatChannelId,
              bdy: {
                uid: null,
                devType: 2001,
                accTkn: data.accessToken,
                auth: "READ",
              },
              tid: 1,
            }),
          );

          setStatus("CONNECTED");

          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ ver: "3", cmd: 0 }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);

            // 서버 Ping 응답
            if (packet.cmd === 10000) {
              ws.send(JSON.stringify({ ver: "3", cmd: 10000 }));
              return;
            }

            // 일반 채팅 메시지(cmd: 93101) 처리
            if (packet.cmd === 93101 && Array.isArray(packet.bdy)) {
              for (const chat of packet.bdy) {
                let profile = {};
                let extras = {};

                try {
                  profile = JSON.parse(chat.profile || "{}");
                } catch {
                  profile = {};
                }

                try {
                  extras =
                    typeof chat.extras === "string"
                      ? JSON.parse(chat.extras || "{}")
                      : chat.extras || {};
                } catch {
                  extras = {};
                }

                // 후원(치즈)·미션·이벤트성 메시지 제외
                if (
                  extras?.payAmount ||
                  extras?.donationType ||
                  extras?.missionDonationType
                ) {
                  continue;
                }

                // 일반 텍스트 메시지 타입(1)만 허용
                const msgTypeCode = chat.msgTypeCode ?? extras?.msgTypeCode;
                if (typeof msgTypeCode === "number" && msgTypeCode !== 1) {
                  continue;
                }

                const cleanMsg =
                  typeof chat.msg === "string" ? chat.msg.trim() : "";
                if (!cleanMsg) continue;

                const uid = profile.userIdHash || chat.uid || "";
                const nickname = profile.nickname || "시청자";

                console.log(
                  `[채팅 수신] ${nickname || "시청자"} -> "${cleanMsg}"`,
                );

                processChatMessage(uid, nickname, cleanMsg);
              }
            }
          } catch {
            // 개별 패킷 파싱 오류 무시
          }
        };

        ws.onerror = () => {
          if (!cancelled) {
            setStatus("ERROR");
            setErrorMsg("채팅 웹소켓 연결 중 오류가 발생했습니다.");
          }
        };

        ws.onclose = () => {
          if (pingRef.current) {
            clearInterval(pingRef.current);
            pingRef.current = null;
          }
          if (!cancelled) {
            setStatus("IDLE");
          }
        };
      } catch (err) {
        if (!cancelled) {
          setStatus("ERROR");
          setErrorMsg(err?.message || "연결에 실패했습니다.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [channelId, processChatMessage]);

  return { status, errorMsg };
}
