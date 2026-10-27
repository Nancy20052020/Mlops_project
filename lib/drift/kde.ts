import { mean, stddev } from "@/lib/math";

/** Gaussian kernel density estimate on a supplied grid. */
export function kernelDensity(values: number[], grid: number[]): number[] {
  if (values.length === 0) return grid.map(() => 0);
  const spread = stddev(values);
  const bandwidth = Math.max(0.18, 1.06 * (spread || 1) * values.length ** -0.2);
  const scale = 1 / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
  return grid.map((x) => {
    let sum = 0;
    for (const value of values) {
      const u = (x - value) / bandwidth;
      sum += Math.exp(-0.5 * u * u);
    }
    return sum * scale;
  });
}

export function densityGrid(values: number[], count = 72): number[] {
  if (values.length === 0) {
    return Array.from({ length: count }, (_, index) => -3 + (6 * index) / (count - 1));
  }
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  const pad = Math.max(0.6, (high - low) * 0.12);
  const start = low - pad;
  const end = high + pad;
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}

export function average(values: number[]): number {
  return mean(values);
}
