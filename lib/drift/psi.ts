import { quantile } from "@/lib/math";

const FLOOR = 1e-4;

export type PsiBucket = {
  lower: number;
  upper: number;
  expected: number;
  actual: number;
  contribution: number;
};

export type PsiResult = {
  psi: number;
  buckets: PsiBucket[];
};

/**
 * Population Stability Index against quantile bins of the reference sample.
 * Industry bands, following credit-risk scorecard practice: below 0.10 is
 * stable, 0.10–0.25 is a watch, above 0.25 is a shift worth acting on.
 * Empty bins are floored, then both histograms are renormalized, so two
 * identical samples sit near zero instead of blowing up on a zero count.
 */
export function populationStabilityIndex(
  reference: number[],
  current: number[],
  binCount = 10,
): PsiResult {
  if (reference.length === 0 || current.length === 0) {
    return { psi: 0, buckets: [] };
  }

  const sorted = [...reference].sort((a, b) => a - b);
  const edges = Array.from({ length: binCount + 1 }, (_, index) =>
    quantile(sorted, index / binCount),
  );
  for (let i = 1; i < edges.length; i++) {
    if (edges[i] <= edges[i - 1]) edges[i] = edges[i - 1] + 1e-9;
  }
  edges[edges.length - 1] = Math.max(edges[edges.length - 1], sorted[sorted.length - 1] + 1e-6);

  const refCounts = new Array<number>(binCount).fill(0);
  const curCounts = new Array<number>(binCount).fill(0);
  for (const value of reference) refCounts[binOf(edges, value)] += 1;
  for (const value of current) curCounts[binOf(edges, value)] += 1;

  const expected = renorm(refCounts);
  const actual = renorm(curCounts);
  const buckets: PsiBucket[] = [];
  let psi = 0;

  for (let i = 0; i < binCount; i++) {
    const contribution = (actual[i] - expected[i]) * Math.log(actual[i] / expected[i]);
    psi += contribution;
    buckets.push({
      lower: edges[i],
      upper: edges[i + 1],
      expected: expected[i],
      actual: actual[i],
      contribution,
    });
  }

  return { psi, buckets };
}

function renorm(counts: number[]): number[] {
  const lifted = counts.map((count) => count + FLOOR);
  const total = lifted.reduce((sum, value) => sum + value, 0);
  return lifted.map((value) => value / total);
}

function binOf(edges: number[], value: number): number {
  const last = edges.length - 2;
  if (value <= edges[0]) return 0;
  if (value >= edges[last + 1]) return last;
  let low = 0;
  let high = last;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (value >= edges[mid + 1]) low = mid + 1;
    else high = mid;
  }
  return low;
}
