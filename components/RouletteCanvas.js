"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouletteStore } from "../src/app/store/useRouletteStore";
import styles from "./Roulette.module.css";

const PALETTE = [
  "#4F46E5",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

export default function RouletteCanvas() {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const rotationRef = useRef(0);
  const chargeIntervalRef = useRef(null);
  const chargeStartRef = useRef(0);
  const powerRef = useRef(0);
  const isChargingRef = useRef(false);

  const [displayAngle, setDisplayAngle] = useState(0);
  const [power, setPower] = useState(0); // 0 ~ 100 (%)

  const items = useRouletteStore((s) => s.items);
  const isSpinning = useRouletteStore((s) => s.isSpinning);
  const winner = useRouletteStore((s) => s.winner);
  const startSpin = useRouletteStore((s) => s.startSpin);
  const finishSpin = useRouletteStore((s) => s.finishSpin);

  const totalVotes = items.reduce((sum, item) => sum + item.count, 0);

  const drawWheel = useCallback(
    (angle) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const size = canvas.width;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 12;

      ctx.clearRect(0, 0, size, size);

      if (items.length === 0 || totalVotes <= 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(148, 163, 184, 0.18)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!투표 항목 을 입력해 주세요", cx, cy);
        return;
      }

      let currentAngle = angle;

      items.forEach((item, idx) => {
        const sliceAngle = (item.count / totalVotes) * Math.PI * 2;
        const endAngle = currentAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, currentAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = PALETTE[idx % PALETTE.length];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();

        const midAngle = currentAngle + sliceAngle / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 15px sans-serif";

        const pct = Math.round((item.count / totalVotes) * 100);
        const labelText =
          sliceAngle > 0.22 ? `${item.label} (${pct}%)` : item.label;
        ctx.fillText(labelText, radius - 18, 0);
        ctx.restore();

        currentAngle = endAngle;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    },
    [items, totalVotes],
  );

  useEffect(() => {
    drawWheel(displayAngle);
  }, [drawWheel, displayAngle]);

  const clearChargeTimer = useCallback(() => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearChargeTimer();
    };
  }, [clearChargeTimer]);

  const executeSpin = useCallback(
    (spinPower) => {
      if (isSpinning || items.length === 0 || totalVotes <= 0) return;

      const selected = startSpin();
      if (!selected) return;

      let acc = 0;
      let sliceStart = 0;
      let sliceSize = 0;

      for (const item of items) {
        const size = (item.count / totalVotes) * Math.PI * 2;
        if (item.id === selected.id) {
          sliceStart = acc;
          sliceSize = size;
          break;
        }
        acc += size;
      }

      const margin = Math.min(sliceSize * 0.15, 0.05);
      const targetOffsetInSlice =
        margin + Math.random() * Math.max(sliceSize - margin * 2, 0.01);
      const pointerAngle = -Math.PI / 2;
      const desiredFinalMod =
        (((pointerAngle - (sliceStart + targetOffsetInSlice)) % (Math.PI * 2)) +
          Math.PI * 2) %
        (Math.PI * 2);

      const startRotation = rotationRef.current;
      const currentMod =
        ((startRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const deltaMod =
        (((desiredFinalMod - currentMod) % (Math.PI * 2)) + Math.PI * 2) %
        (Math.PI * 2);

      // 강도(10~100)에 따라 6~22바퀴, 5.0초~10.0초로 회전
      const clampedPower = Math.max(10, Math.min(100, spinPower));
      const extraSpins =
        Math.round(6 + (clampedPower / 100) * 16) * Math.PI * 2;
      const duration = 5000 + (clampedPower / 100) * 5000;

      const targetRotation = startRotation + extraSpins + deltaMod;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutQuint(progress);
        const nextAngle =
          startRotation + (targetRotation - startRotation) * eased;

        rotationRef.current = nextAngle;
        setDisplayAngle(nextAngle);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          rotationRef.current = targetRotation;
          setDisplayAngle(targetRotation);
          finishSpin();
        }
      };

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(step);
    },
    [isSpinning, items, totalVotes, startSpin, finishSpin],
  );

  const handlePressStart = useCallback(() => {
    if (isSpinning || items.length === 0 || totalVotes <= 0) return;
    if (isChargingRef.current) return;

    clearChargeTimer();
    isChargingRef.current = true;
    chargeStartRef.current = performance.now();
    powerRef.current = 10;
    setPower(10);

    chargeIntervalRef.current = window.setInterval(() => {
      const elapsed = performance.now() - chargeStartRef.current;
      const nextPower = Math.min(100, Math.round(10 + (elapsed / 1200) * 90));
      powerRef.current = nextPower;
      setPower(nextPower);
    }, 30);
  }, [isSpinning, items.length, totalVotes, clearChargeTimer]);

  const handlePressEnd = useCallback(() => {
    clearChargeTimer();
    if (!isChargingRef.current) return;

    isChargingRef.current = false;
    const finalPower = powerRef.current || 10;
    powerRef.current = 0;
    setPower(0);

    executeSpin(finalPower);
  }, [clearChargeTimer, executeSpin]);

  const isDisabled = isSpinning || items.length === 0 || totalVotes <= 0;

  const gaugeColor =
    power >= 75 ? "#ef4444" : power >= 40 ? "#f59e0b" : "#10b981";

  return (
    <div className={styles.wheelSection}>
      <div className={styles.wheelWrapper}>
        <div className={styles.pointer} aria-hidden="true">
          ▼
        </div>
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className={styles.canvas}
        />
      </div>

      <div
        style={{
          width: "220px",
          height: "10px",
          background: "#1e293b",
          borderRadius: "999px",
          overflow: "hidden",
          border: "1px solid #334155",
        }}
        aria-label="회전 강도 게이지"
      >
        <div
          style={{
            width: `${power}%`,
            height: "100%",
            background: gaugeColor,
            transition: power === 0 ? "width 0.15s ease" : "none",
          }}
        />
      </div>

      <button
        type="button"
        disabled={isDisabled}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerLeave={handlePressEnd}
        className={styles.spinBtn}
        style={{ userSelect: "none", touchAction: "none" }}
      >
        {isSpinning
          ? "추첨 중..."
          : power > 0
            ? `강도 ${power}% (떼면 회전)`
            : "길게 눌러서 강도 조절"}
      </button>

      {!isSpinning && winner && (
        <div className={styles.winnerBanner}>
          당첨: <strong>{winner.label}</strong> ({winner.count}표)
        </div>
      )}
    </div>
  );
}
