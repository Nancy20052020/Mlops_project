"use client";

import type { PointerEvent } from "react";
import { PSI_ALARM } from "@/lib/sim/protocol";
import type { Frame } from "@/lib/sim/study";

const WIDTH = 920;
const HEIGHT = 320;
const PAD = { l: 46, r: 44, t: 18, b: 28 };

type Props = {
  frames: Frame[];
  cursor: number;
  onset: number;
  length: number;
  showFront: boolean;
  onScrub: (index: number) => void;
};

export function TimelineChart({ frames, cursor, onset, length, showFront, onScrub }: Props) {
  const visible = frames.slice(0, cursor + 1);
  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;
  const psiPeak = Math.max(0.45, ...visible.map((frame) => frame.maxPsi)) * 1.08;
  const xOf = (t: number) => PAD.l + (t / length) * innerW;
  const yPsi = (value: number) => PAD.t + (1 - Math.min(value, psiPeak) / psiPeak) * innerH;
  const yAcc = (value: number) => {
    const scaled = (Math.min(1, Math.max(0.3, value)) - 0.3) / 0.7;
    return PAD.t + (1 - scaled) * innerH;
  };

  const psiLine = visible
    .map((frame, index) => `${index === 0 ? "M" : "L"} ${xOf(frame.t).toFixed(1)} ${yPsi(frame.maxPsi).toFixed(1)}`)
    .join(" ");
  const last = visible[visible.length - 1];
  const psiArea = last
    ? `${psiLine} L ${xOf(last.t).toFixed(1)} ${yPsi(0).toFixed(1)} L ${xOf(visible[0].t).toFixed(1)} ${yPsi(0).toFixed(1)} Z`
    : "";

  const accuracyPaths: string[] = [];
  let segment = "";
  for (const frame of visible) {
    if (frame.accuracy === null) {
      if (segment) accuracyPaths.push(segment);
      segment = "";
      continue;
    }
    segment += `${segment ? "L" : "M"} ${xOf(frame.t).toFixed(1)} ${yAcc(frame.accuracy).toFixed(1)} `;
  }
  if (segment) accuracyPaths.push(segment);

  const scrub = (event: PointerEvent<SVGSVGElement>) => {
    const point = event.currentTarget.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    const time = ((local.x - PAD.l) / innerW) * length;
    let nearest = 0;
    let best = Infinity;
    frames.forEach((frame, index) => {
      const distance = Math.abs(frame.t - time);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    onScrub(nearest);
  };

  const ticks = [0, 0.25, 0.5, 1].filter((tick) => tick <= psiPeak);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full touch-none"
      role="img"
      aria-label="Population stability index and accuracy across the stream"
      onPointerDown={scrub}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.l}
            x2={WIDTH - PAD.r}
            y1={yPsi(tick)}
            y2={yPsi(tick)}
            stroke="rgb(243 238 228 / 12%)"
          />
          <text x={PAD.l - 8} y={yPsi(tick) + 3} textAnchor="end" fill="rgb(243 238 228 / 55%)" fontSize="10" fontFamily="ui-monospace, monospace">
            {tick.toFixed(2)}
          </text>
        </g>
      ))}
      {[0.4, 0.6, 0.8, 1].map((tick) => (
        <text key={tick} x={WIDTH - PAD.r + 8} y={yAcc(tick) + 3} fill="rgb(215 239 134 / 70%)" fontSize="10" fontFamily="ui-monospace, monospace">
          {Math.round(tick * 100)}
        </text>
      ))}
      <line
        x1={PAD.l}
        x2={WIDTH - PAD.r}
        y1={yPsi(PSI_ALARM)}
        y2={yPsi(PSI_ALARM)}
        stroke="#e4b56a"
        strokeDasharray="4 4"
        strokeOpacity="0.8"
      />
      {showFront ? (
        <g>
          <line x1={xOf(onset)} x2={xOf(onset)} y1={PAD.t} y2={HEIGHT - PAD.b} stroke="rgb(243 238 228 / 45%)" strokeDasharray="2 5" />
          <text x={xOf(onset) + 6} y={PAD.t + 12} fill="rgb(243 238 228 / 55%)" fontSize="10" fontFamily="ui-monospace, monospace">
            front
          </text>
        </g>
      ) : null}
      <path d={psiArea} fill="rgb(228 181 106 / 16%)" />
      <path d={psiLine} fill="none" stroke="#e4b56a" strokeWidth="2" />
      {accuracyPaths.map((path, index) => (
        <path key={index} d={path} fill="none" stroke="#d7ef86" strokeWidth="1.6" />
      ))}
      {last ? <circle cx={xOf(last.t)} cy={yPsi(last.maxPsi)} r="3.5" fill="#f3eee4" /> : null}
      <text x={PAD.l} y={HEIGHT - 8} fill="rgb(243 238 228 / 45%)" fontSize="10" fontFamily="ui-monospace, monospace">
        PSI
      </text>
      <text x={WIDTH - PAD.r} y={HEIGHT - 8} textAnchor="end" fill="rgb(215 239 134 / 70%)" fontSize="10" fontFamily="ui-monospace, monospace">
        accuracy %
      </text>
    </svg>
  );
}
