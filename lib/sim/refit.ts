import { accuracyAt, bestF1Threshold, expectedCalibrationError } from "@/lib/drift/calibration";
import { dot, sigmoid } from "@/lib/math";
import type { Study } from "@/lib/sim/study";
import { trainLogistic } from "@/lib/sim/train";

export type RefitReport = {
  trainCount: number;
  evalCount: number;
  frozenAccuracy: number;
  frozenEce: number;
  refitAccuracy: number;
  refitEce: number;
  gain: number;
};

/**
 * Spend the labels that arrived after the front. Train on the first part of
 * the post-onset stream, pick a threshold on a short slice of that same
 * spend, and score both models on the samples that follow.
 */
export function compareRefit(study: Study): RefitReport {
  const start = study.onset;
  const split = Math.min(study.samples.length - 160, start + 420);
  const tuneEnd = Math.max(start + 80, split - 80);
  const train = study.samples.slice(start, tuneEnd);
  const tune = study.samples.slice(tuneEnd, split);
  const evalSamples = study.samples.slice(split);
  const fitted = trainLogistic(train, 320);
  const tuneProbs = tune.map((sample) => sigmoid(dot(fitted.weights, sample.x) + fitted.bias));
  const threshold = bestF1Threshold(
    tuneProbs,
    tune.map((sample) => sample.y),
  );
  const refitProbs = evalSamples.map((sample) => sigmoid(dot(fitted.weights, sample.x) + fitted.bias));
  const frozenProbs = evalSamples.map((sample) => sample.pModel);
  const labels = evalSamples.map((sample) => sample.y);
  const frozenAccuracy = accuracyAt(frozenProbs, labels, study.model.threshold);
  const refitAccuracy = accuracyAt(refitProbs, labels, threshold);

  return {
    trainCount: train.length,
    evalCount: evalSamples.length,
    frozenAccuracy,
    frozenEce: expectedCalibrationError(frozenProbs, labels),
    refitAccuracy,
    refitEce: expectedCalibrationError(refitProbs, labels),
    gain: refitAccuracy - frozenAccuracy,
  };
}
