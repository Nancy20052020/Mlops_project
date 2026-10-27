export type PageHinkleyResult = {
  /** PH statistic after each observation. Grows when the mean rises above μ0 + δ. */
  statistic: number[];
  current: number;
  /** Index of the first crossing of λ. Null when the stream stays inside the slack. */
  firstAlarm: number | null;
};

/**
 * Reference-anchored Page-Hinkley test for an increase in the mean.
 * m_t = Σ (x_i − μ0 − δ), PH_t = m_t − min_{i≤t} m_i, alarm when PH_t > λ.
 * Page (1954) and Hinkley (1971). This implementation does not reset: a
 * single front should stay visible after it is detected.
 */
export function pageHinkley(
  values: number[],
  mu0: number,
  delta: number,
  lambda: number,
): PageHinkleyResult {
  let cumulative = 0;
  let minimum = 0;
  const statistic: number[] = [];
  let firstAlarm: number | null = null;

  for (let i = 0; i < values.length; i++) {
    cumulative += values[i] - mu0 - delta;
    if (cumulative < minimum) minimum = cumulative;
    const ph = cumulative - minimum;
    statistic.push(ph);
    if (firstAlarm === null && ph > lambda) firstAlarm = i;
  }

  return {
    statistic,
    current: statistic.length ? statistic[statistic.length - 1] : 0,
    firstAlarm,
  };
}
