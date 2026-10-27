import {
  accuracyAt,
  bestF1Threshold,
  brierScore,
  expectedCalibrationError,
} from "@/lib/drift/calibration";
import { jensenShannon } from "@/lib/drift/divergence";
import { kolmogorovSmirnov } from "@/lib/drift/ks";
import { pageHinkley } from "@/lib/drift/pageHinkley";
import { populationStabilityIndex } from "@/lib/drift/psi";
import { dot, sigmoid } from "@/lib/math";
import { FEATURE_COUNT, sampleCovariates } from "@/lib/sim/features";
import {
  ACCURACY_DROP,
  BASE_BIAS,
  BASE_WEIGHTS,
  CONCEPT_BIAS,
  CONCEPT_WEIGHTS,
  ECE_ALARM,
  ECE_WATCH,
  LABEL_MIN,
  LENGTH,
  PH_DELTA,
  PH_LAMBDA,
  PSI_ALARM,
  PSI_WATCH,
  REFERENCE_END,
  SEED,
  STEP,
  TRAIN_END,
  WINDOW,
  type Call,
  type Diagnosis,
  type Scenario,
  type Severity,
  scenarioById,
  strengthAt,
} from "@/lib/sim/protocol";
import { makeRng } from "@/lib/sim/rng";
import { trainLogistic } from "@/lib/sim/train";

export type Sample = {
  x: number[];
  y: 0 | 1;
  pTrue: number;
  pModel: number;
};

export type FittedModel = {
  weights: number[];
  bias: number;
  threshold: number;
  refAccuracy: number;
  refEce: number;
  refBrier: number;
  refResidual: number;
  trainAccuracy: number;
};

export type Frame = {
  t: number;
  psi: number[];
  ks: number[];
  maxPsi: number;
  maxKs: number;
  dominant: number | null;
  predPsi: number;
  predJs: number;
  accuracy: number | null;
  brier: number | null;
  ece: number | null;
  labeled: number;
  ph: number;
  phAlarm: boolean;
  inputAlarm: boolean;
  inputWatch: boolean;
  conceptAlarm: boolean;
  diagnosis: Diagnosis;
  call: Call;
  severity: Severity;
};

export type Study = {
  scenario: Scenario;
  seed: number;
  samples: Sample[];
  model: FittedModel;
  frames: Frame[];
  length: number;
  window: number;
  referenceEnd: number;
  onset: number;
};

const studyCache = new Map<string, Study>();

export function getStudy(id: string, seed = SEED): Study {
  const key = `${id}:${seed}`;
  const cached = studyCache.get(key);
  if (cached) return cached;
  const study = buildStudy(scenarioById(id), seed);
  studyCache.set(key, study);
  return study;
}

export function buildStudy(scenario: Scenario, seed = SEED): Study {
  const samples = generateSamples(scenario, seed);
  const model = fitModel(samples);
  for (const sample of samples) {
    sample.pModel = sigmoid(dot(model.weights, sample.x) + model.bias);
  }
  const frames = buildFrames(samples, model, scenario);
  return {
    scenario,
    seed,
    samples,
    model,
    frames,
    length: LENGTH,
    window: WINDOW,
    referenceEnd: REFERENCE_END,
    onset: scenario.onset,
  };
}

function generateSamples(scenario: Scenario, seed: number): Sample[] {
  const rng = makeRng(seed);
  const samples: Sample[] = [];

  for (let index = 0; index < LENGTH; index++) {
    const strength = strengthAt(index, scenario);
    const x = sampleCovariates(() => rng.normal());
    for (let feature = 0; feature < FEATURE_COUNT; feature++) {
      x[feature] += strength * scenario.meanShift[feature];
    }
    const mix = strength * scenario.conceptMix;
    const weights = BASE_WEIGHTS.map(
      (weight, feature) => weight * (1 - mix) + CONCEPT_WEIGHTS[feature] * mix,
    );
    const bias = BASE_BIAS * (1 - mix) + CONCEPT_BIAS * mix;
    const pTrue = sigmoid(dot(weights, x) + bias);
    const y: 0 | 1 = rng.next() < pTrue ? 1 : 0;
    samples.push({ x, y, pTrue, pModel: 0 });
  }

  return samples;
}

function fitModel(samples: Sample[]): FittedModel {
  const train = samples.slice(0, TRAIN_END);
  const calibration = samples.slice(TRAIN_END, REFERENCE_END);
  const fitted = trainLogistic(train, 420);
  const weights = fitted.weights;
  const bias = fitted.bias;

  const trainProbs = train.map((sample) => sigmoid(dot(weights, sample.x) + bias));
  const trainLabels = train.map((sample) => sample.y);
  const calibrationProbs = calibration.map((sample) => sigmoid(dot(weights, sample.x) + bias));
  const calibrationLabels = calibration.map((sample) => sample.y);
  const threshold = bestF1Threshold(calibrationProbs, calibrationLabels);
  const residuals = calibration.map((sample, index) => {
    const gap = calibrationProbs[index] - sample.y;
    return gap * gap;
  });

  return {
    weights,
    bias,
    threshold,
    refAccuracy: accuracyAt(calibrationProbs, calibrationLabels, threshold),
    refEce: expectedCalibrationError(calibrationProbs, calibrationLabels),
    refBrier: brierScore(calibrationProbs, calibrationLabels),
    refResidual: residuals.reduce((sum, value) => sum + value, 0) / residuals.length,
    trainAccuracy: accuracyAt(trainProbs, trainLabels, threshold),
  };
}

function buildFrames(samples: Sample[], model: FittedModel, scenario: Scenario): Frame[] {
  const reference = samples.slice(0, REFERENCE_END);
  const referenceColumns = columns(reference);
  const referencePredictions = reference.map((sample) => sample.pModel);
  const frames: Frame[] = [];

  for (let t = REFERENCE_END; t <= LENGTH; t += STEP) {
    const window = samples.slice(Math.max(0, t - WINDOW), t);
    const windowColumns = columns(window);
    const psi = referenceColumns.map((column, feature) =>
      populationStabilityIndex(column, windowColumns[feature]).psi,
    );
    const ks = referenceColumns.map(
      (column, feature) => kolmogorovSmirnov(column, windowColumns[feature]).statistic,
    );
    let maxPsi = 0;
    let maxKs = 0;
    let dominant: number | null = null;
    for (let feature = 0; feature < psi.length; feature++) {
      if (psi[feature] > maxPsi) {
        maxPsi = psi[feature];
        dominant = feature;
      }
      if (ks[feature] > maxKs) maxKs = ks[feature];
    }
    if (maxPsi < PSI_WATCH) dominant = null;

    const windowPredictions = window.map((sample) => sample.pModel);
    const predPsi = populationStabilityIndex(referencePredictions, windowPredictions).psi;
    const predJs = jensenShannon(referencePredictions, windowPredictions);

    const labeled = recentLabeled(samples, t, scenario.labelDelay, WINDOW);
    const labelsReady = labeled.length >= LABEL_MIN;
    const accuracy = labelsReady
      ? accuracyAt(
          labeled.map((sample) => sample.pModel),
          labeled.map((sample) => sample.y),
          model.threshold,
        )
      : null;
    const brier = labelsReady
      ? brierScore(
          labeled.map((sample) => sample.pModel),
          labeled.map((sample) => sample.y),
        )
      : null;
    const ece = labelsReady
      ? expectedCalibrationError(
          labeled.map((sample) => sample.pModel),
          labeled.map((sample) => sample.y),
        )
      : null;

    const residualSeries: number[] = [];
    const lastLabeledIndex = t - scenario.labelDelay;
    for (let index = REFERENCE_END; index < lastLabeledIndex && index < samples.length; index++) {
      const gap = samples[index].pModel - samples[index].y;
      residualSeries.push(gap * gap);
    }
    const ph = pageHinkley(residualSeries, model.refResidual, PH_DELTA, PH_LAMBDA);

    const inputAlarm = maxPsi >= PSI_ALARM;
    const inputWatch = maxPsi >= PSI_WATCH;
    const conceptAlarm = labelsReady && ece !== null && ece - model.refEce >= ECE_ALARM;
    const conceptWatch = labelsReady && ece !== null && ece - model.refEce >= ECE_WATCH;

    let diagnosis: Diagnosis = "stable";
    if (inputAlarm && conceptAlarm) diagnosis = "mixed";
    else if (inputAlarm) diagnosis = "covariate";
    else if (conceptAlarm) diagnosis = "concept";

    let call: Call = "hold";
    if (diagnosis === "concept" || diagnosis === "mixed") call = "retrain";
    else if (diagnosis === "covariate") call = "inspect";

    let severity: Severity = "calm";
    if (call === "retrain") severity = "retrain";
    else if (call === "inspect") severity = "alarm";
    else if (inputWatch || conceptWatch || ph.firstAlarm !== null) severity = "watch";

    frames.push({
      t,
      psi,
      ks,
      maxPsi,
      maxKs,
      dominant,
      predPsi,
      predJs,
      accuracy,
      brier,
      ece,
      labeled: labeled.length,
      ph: ph.current,
      phAlarm: ph.firstAlarm !== null,
      inputAlarm,
      inputWatch,
      conceptAlarm,
      diagnosis,
      call,
      severity,
    });
  }

  return frames;
}

function recentLabeled(samples: Sample[], t: number, labelDelay: number, window: number): Sample[] {
  const last = t - labelDelay;
  if (last <= 0) return [];
  const start = Math.max(0, last - window);
  return samples.slice(start, last);
}

function columns(samples: Sample[]): number[][] {
  const series = Array.from({ length: FEATURE_COUNT }, () => new Array<number>(samples.length));
  for (let index = 0; index < samples.length; index++) {
    for (let feature = 0; feature < FEATURE_COUNT; feature++) {
      series[feature][index] = samples[index].x[feature];
    }
  }
  return series;
}

export function firstWhere(frames: Frame[], predicate: (frame: Frame) => boolean): Frame | null {
  return frames.find(predicate) ?? null;
}

/**
 * Naive baseline: retrain when accuracy falls ACCURACY_DROP below the
 * median of the pre-onset windows and stays there for two steps.
 * The reference is the live climate, not the smaller calibration slice.
 */
export function accuracyRuleDelay(study: Study): number | null {
  const pre = study.frames
    .filter((frame) => frame.t < study.onset && frame.accuracy !== null)
    .map((frame) => frame.accuracy as number)
    .sort((a, b) => a - b);
  if (pre.length === 0) return null;
  const baseline = pre[Math.floor(pre.length / 2)];
  let run = 0;
  for (const frame of study.frames) {
    if (frame.t < study.onset || frame.accuracy === null) {
      run = 0;
      continue;
    }
    if (frame.accuracy <= baseline - ACCURACY_DROP) {
      run += 1;
      if (run >= 2) return frame.t - study.onset;
    } else {
      run = 0;
    }
  }
  return null;
}
