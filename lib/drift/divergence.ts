/** Jensen-Shannon divergence, in bits. Symmetric, and bounded by 1. */
export function jensenShannon(reference: number[], current: number[], binCount = 16): number {
  if (reference.length === 0 || current.length === 0) return 0;
  let low = Infinity;
  let high = -Infinity;
  for (const value of reference) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  for (const value of current) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  if (high - low < 1e-9) return 0;

  const p = histogram(reference, low, high, binCount);
  const q = histogram(current, low, high, binCount);
  const mixture = p.map((value, index) => 0.5 * (value + q[index]));
  return 0.5 * kl(p, mixture) + 0.5 * kl(q, mixture);
}

function histogram(values: number[], low: number, high: number, binCount: number): number[] {
  const counts = new Array<number>(binCount).fill(0);
  const span = high - low;
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(((value - low) / span) * binCount)));
    counts[index] += 1;
  }
  const total = values.length + binCount * 1e-6;
  return counts.map((count) => (count + 1e-6) / total);
}

function kl(p: number[], q: number[]): number {
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0 && q[i] > 0) sum += p[i] * Math.log2(p[i] / q[i]);
  }
  return sum;
}
