"use client";

import { useEffect, useMemo, useState } from "react";
import { PSI_ALARM } from "@/lib/sim/protocol";
import { getStudy } from "@/lib/sim/study";

const HUMIDITY = 4;

export function HeroInstrument() {
  const study = useMemo(() => getStudy("wet-bulb"), []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const alarm = study.frames.findIndex((frame) => frame.inputAlarm);
      setIndex(alarm >= 0 ? alarm : study.frames.length - 1);
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((value) => (value >= study.frames.length - 1 ? 0 : value + 1));
    }, 140);
    return () => window.clearInterval(timer);
  }, [study.frames]);

  const frame = study.frames[index];
  const series = study.frames.slice(0, index + 1).map((item) => item.psi[HUMIDITY]);
  const width = 280;
  const height = 72;
  const peak = Math.max(PSI_ALARM, ...series, 0.01);
  const path = series
    .map((value, point) => {
      const x = series.length === 1 ? 0 : (point / (series.length - 1)) * width;
      const y = height - (Math.min(value, peak) / peak) * (height - 8) - 4;
      return `${point === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const thresholdY = height - (PSI_ALARM / peak) * (height - 8) - 4;

  return (
    <div className="border border-ink/15 bg-paper-deep/50 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="kicker text-ink-soft">Live · wet bulb · humidity PSI</p>
        <p className="font-mono text-sm tabular-nums">{frame.psi[HUMIDITY].toFixed(2)}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-20 w-full" role="img" aria-label="Humidity population stability index while a probe bias arrives">
        <line x1="0" x2={width} y1={thresholdY} y2={thresholdY} stroke="#a56b2c" strokeDasharray="3 4" strokeWidth="1" />
        <path d={path} fill="none" stroke="#1c1814" strokeWidth="1.6" />
      </svg>
      <p className="mt-2 font-mono text-[11px] text-ink-soft">
        Sample {String(frame.t).padStart(4, "0")} · alarm band {PSI_ALARM.toFixed(2)} · {frame.call}
      </p>
    </div>
  );
}
