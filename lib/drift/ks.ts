/**
 * Two-sample Kolmogorov-Smirnov statistic and the Stephens approximation
 * of its asymptotic p-value. Large windows make tiny shifts "significant",
 * so the observatory shows D itself and treats p as a footnote.
 */
export function kolmogorovSmirnov(reference: number[], current: number[]): {
  statistic: number;
  pValue: number;
} {
  if (reference.length === 0 || current.length === 0) {
    return { statistic: 0, pValue: 1 };
  }

  const a = [...reference].sort((x, y) => x - y);
  const b = [...current].sort((x, y) => x - y);
  const n = a.length;
  const m = b.length;
  let i = 0;
  let j = 0;
  let cdfA = 0;
  let cdfB = 0;
  let d = 0;

  while (i < n || j < m) {
    const av = i < n ? a[i] : Infinity;
    const bv = j < m ? b[j] : Infinity;
    if (av < bv) {
      const value = av;
      while (i < n && a[i] === value) i += 1;
      cdfA = i / n;
    } else if (bv < av) {
      const value = bv;
      while (j < m && b[j] === value) j += 1;
      cdfB = j / m;
    } else {
      const value = av;
      while (i < n && a[i] === value) i += 1;
      while (j < m && b[j] === value) j += 1;
      cdfA = i / n;
      cdfB = j / m;
    }
    d = Math.max(d, Math.abs(cdfA - cdfB));
    if (i >= n && j >= m) break;
  }

  const effective = (n * m) / (n + m);
  const root = Math.sqrt(effective);
  const lambda = (root + 0.12 + 0.11 / root) * d;
  let p = 0;
  for (let k = 1; k <= 80; k++) {
    const sign = k % 2 === 0 ? -1 : 1;
    p += 2 * sign * Math.exp(-2 * k * k * lambda * lambda);
  }

  return {
    statistic: d,
    pValue: Math.max(0, Math.min(1, p)),
  };
}
