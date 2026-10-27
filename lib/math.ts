export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export function dot(weights: number[], x: number[]): number {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) sum += weights[i] * x[i];
  return sum;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  let sum = 0;
  for (const value of values) {
    const d = value - mu;
    sum += d * d;
  }
  return Math.sqrt(sum / (values.length - 1));
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (q <= 0) return sorted[0];
  if (q >= 1) return sorted[sorted.length - 1];
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const weight = position - low;
  return sorted[low] * (1 - weight) + sorted[high] * weight;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
