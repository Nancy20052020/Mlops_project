import { dot, sigmoid } from "@/lib/math";

export function trainLogistic(
  rows: { x: number[]; y: number }[],
  epochs = 420,
): { weights: number[]; bias: number } {
  const dimension = rows[0]?.x.length ?? 0;
  const weights = new Array<number>(dimension).fill(0);
  let bias = 0;
  const n = rows.length;
  if (!n || !dimension) return { weights, bias };

  for (let epoch = 0; epoch < epochs; epoch++) {
    const learningRate = 0.45 / (1 + epoch / 90);
    const gradient = new Array<number>(dimension).fill(0);
    let biasGradient = 0;
    for (const row of rows) {
      const prediction = sigmoid(dot(weights, row.x) + bias);
      const error = prediction - row.y;
      for (let feature = 0; feature < dimension; feature++) {
        gradient[feature] += error * row.x[feature];
      }
      biasGradient += error;
    }
    for (let feature = 0; feature < dimension; feature++) {
      weights[feature] -= learningRate * (gradient[feature] / n + 0.001 * weights[feature]);
    }
    bias -= learningRate * (biasGradient / n);
  }

  return { weights, bias };
}
