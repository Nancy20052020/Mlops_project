"use client";

import { densityGrid, kernelDensity } from "@/lib/drift/kde";
import { mean } from "@/lib/math";
import { FEATURES, toRaw } from "@/lib/sim/features";

type Props = {
  reference: number[];
  current: number[];
  feature: number;
};

export function DensityChart({ reference, current, feature }: Props) {
  const spec = FEATURES[feature];
  const grid = densityGrid([...reference, ...current], 80);
  const referenceDensity = kernelDensity(reference, grid);
  const currentDensity = kernelDensity(current, grid);
  const peak = Math.max(0.01, ...referenceDensity, ...currentDensity);
  const width = 640;
  const height = 250;
  const pad = 18;
  const xOf = (index: number) => pad + (index / (grid.length - 1)) * (width - pad * 2);
  const yOf = (value: number) => height - pad - (value / peak) * (height - pad * 2);
  const area = (series: number[]) => {
    const line = series
      .map((value, index) => `${index === 0 ? "M" : "L"} ${xOf(index).toFixed(1)} ${yOf(value).toFixed(1)}`)
      .join(" ");
    return `${line} L ${xOf(series.length - 1).toFixed(1)} ${(height - pad).toFixed(1)} L ${xOf(0).toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  };
  const referenceMean = toRaw(mean(reference), feature);
  const currentMean = toRaw(mean(current), feature);
  const digits = Math.abs(referenceMean) >= 100 ? 0 : 1;

  return (
    <figure className="border border-white/10 bg-night-2/80 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <figcaption>
          <p className="kicker text-paper/50">Distribution</p>
          <p className="display mt-1 text-2xl">{spec.label}</p>
        </figcaption>
        <p className="font-mono text-xs text-paper/70">
          {referenceMean.toFixed(digits)} {spec.unit}
          <span className="px-2 text-brass-bright">→</span>
          {currentMean.toFixed(digits)} {spec.unit}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-auto w-full" role="img" aria-label={`${spec.label} density, reference against the current window`}>
        <path d={area(referenceDensity)} fill="rgb(120 176 168 / 28%)" stroke="#8fcdc4" strokeWidth="1.4" />
        <path d={area(currentDensity)} fill="rgb(228 181 106 / 22%)" stroke="#e4b56a" strokeWidth="1.6" />
      </svg>
      <div className="mt-1 flex gap-5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/55">
        <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 bg-[#8fcdc4]" /> Reference</span>
        <span className="inline-flex items-center gap-2"><i className="inline-block h-2 w-2 bg-brass-bright" /> This window</span>
      </div>
    </figure>
  );
}
