export type ReliabilityBin = {
  count: number;
  meanPrediction: number;
  observedRate: number;
};

export function reliability(
  probabilities: number[],
  labels: number[],
  binCount = 5,
): ReliabilityBin[] {
  const bins = Array.from({ length: binCount }, () => ({
    count: 0,
    prediction: 0,
    positives: 0,
  }));

  for (let i = 0; i < probabilities.length; i++) {
    const probability = Math.min(1 - 1e-9, Math.max(0, probabilities[i]));
    const index = Math.min(binCount - 1, Math.floor(probability * binCount));
    bins[index].count += 1;
    bins[index].prediction += probability;
    bins[index].positives += labels[i];
  }

  return bins.map((bin) => ({
    count: bin.count,
    meanPrediction: bin.count ? bin.prediction / bin.count : 0,
    observedRate: bin.count ? bin.positives / bin.count : 0,
  }));
}

/** Expected calibration error. Stays small when P(Y|X) is unchanged. */
export function expectedCalibrationError(
  probabilities: number[],
  labels: number[],
  binCount = 5,
): number {
  if (probabilities.length === 0) return 0;
  const bins = reliability(probabilities, labels, binCount);
  let error = 0;
  for (const bin of bins) {
    if (!bin.count) continue;
    error += (bin.count / probabilities.length) * Math.abs(bin.observedRate - bin.meanPrediction);
  }
  return error;
}

export function brierScore(probabilities: number[], labels: number[]): number {
  if (probabilities.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < probabilities.length; i++) {
    const gap = probabilities[i] - labels[i];
    sum += gap * gap;
  }
  return sum / probabilities.length;
}

export function accuracyAt(probabilities: number[], labels: number[], threshold: number): number {
  if (probabilities.length === 0) return 0;
  let correct = 0;
  for (let i = 0; i < probabilities.length; i++) {
    const predicted = probabilities[i] >= threshold ? 1 : 0;
    if (predicted === labels[i]) correct += 1;
  }
  return correct / probabilities.length;
}

export function f1At(probabilities: number[], labels: number[], threshold: number): number {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (let i = 0; i < probabilities.length; i++) {
    const predicted = probabilities[i] >= threshold ? 1 : 0;
    if (predicted === 1 && labels[i] === 1) tp += 1;
    else if (predicted === 1 && labels[i] === 0) fp += 1;
    else if (predicted === 0 && labels[i] === 1) fn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function bestF1Threshold(probabilities: number[], labels: number[]): number {
  let bestThreshold = 0.5;
  let best = -1;
  for (let step = 1; step < 20; step++) {
    const threshold = step / 20;
    const score = f1At(probabilities, labels, threshold);
    if (score > best) {
      best = score;
      bestThreshold = threshold;
    }
  }
  return bestThreshold;
}
