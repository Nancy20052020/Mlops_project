"use client";

import { useMemo } from "react";
import { percent } from "@/lib/format";
import { compareRefit } from "@/lib/sim/refit";
import type { Study } from "@/lib/sim/study";

export function RefitPanel({ study, tone = "night" }: { study: Study; tone?: "night" | "paper" }) {
  const report = useMemo(() => compareRefit(study), [study]);
  const night = tone === "night";
  const recovered = report.gain >= 0.05;
  const width = (value: number) => `${Math.max(4, Math.min(100, value * 100))}%`;

  return (
    <section className={night ? "border border-white/10 bg-black/25 p-4" : "border border-ink/15 bg-paper-deep/50 p-4"}>
      <p className={night ? "kicker text-paper/50" : "kicker text-brass"}>If the letters are spent on a refit</p>
      <h3 className={night ? "display mt-2 text-2xl text-paper" : "display mt-2 text-2xl"}>{recovered ? "The new fit earns its keep" : "The new fit barely moves"}</h3>
      <p className={night ? "mt-2 text-sm leading-6 text-paper/70" : "mt-2 text-sm leading-6 text-ink-soft"}>
        {recovered
          ? `Trained on ${report.trainCount} post-front labels and scored on the ${report.evalCount} that follow. Accuracy climbs ${percent(report.frozenAccuracy)} to ${percent(report.refitAccuracy)}.`
          : `The same spend, ${report.trainCount} labels, changes accuracy from ${percent(report.frozenAccuracy)} to ${percent(report.refitAccuracy)}. The frozen weights were already honest enough.`}
      </p>
      <div className="mt-4 space-y-3">
        <Bar label="Frozen" value={report.frozenAccuracy} width={width(report.frozenAccuracy)} night={night} brass={false} />
        <Bar label="Refit" value={report.refitAccuracy} width={width(report.refitAccuracy)} night={night} brass />
      </div>
      <p className={night ? "mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/40" : "mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft"}>
        Calibration {report.frozenEce.toFixed(3)} → {report.refitEce.toFixed(3)}
      </p>
    </section>
  );
}

function Bar({
  label,
  value,
  width,
  night,
  brass,
}: {
  label: string;
  value: number;
  width: string;
  night: boolean;
  brass: boolean;
}) {
  return (
    <div>
      <div className={night ? "flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60" : "flex justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft"}>
        <span>{label}</span>
        <span>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className={night ? "mt-1 h-1.5 bg-white/10" : "mt-1 h-1.5 bg-ink/10"}>
        <div className={brass ? "h-full bg-brass-bright" : night ? "h-full bg-phosphor" : "h-full bg-sea"} style={{ width }} />
      </div>
    </div>
  );
}
