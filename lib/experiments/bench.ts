import { FEATURES } from "@/lib/sim/features";
import { SCENARIOS, SEED, type Call, type Diagnosis } from "@/lib/sim/protocol";
import { accuracyRuleDelay, firstWhere, getStudy, type Frame, type Study } from "@/lib/sim/study";

export type ScenarioScore = {
  id: string;
  name: string;
  kicker: string;
  blurb: string;
  groundTruth: Diagnosis;
  labelDelay: number;
  onset: number;
  refAccuracy: number;
  refEce: number;
  refBrier: number;
  endAccuracy: number | null;
  endEce: number | null;
  endMaxPsi: number;
  endDiagnosis: Diagnosis;
  endCall: Call;
  dominantFeature: string | null;
  psiDelay: number | null;
  eceDelay: number | null;
  accuracyDelay: number | null;
  phDelay: number | null;
  actionDelay: number | null;
  falseInputAlarms: number;
  falseConceptAlarms: number;
  diagnosisHit: boolean;
  weights: number[];
  bias: number;
  threshold: number;
};

export type BenchResult = {
  seed: number;
  scores: ScenarioScore[];
  diagnosisHits: number;
  clearAirFalseAlarms: number;
};

let cached: BenchResult | null = null;

export function getBench(seed = SEED): BenchResult {
  if (cached && cached.seed === seed) return cached;
  cached = runBench(seed);
  return cached;
}

export function runBench(seed = SEED): BenchResult {
  const scores = SCENARIOS.map((scenario) => scoreStudy(getStudy(scenario.id, seed)));
  return {
    seed,
    scores,
    diagnosisHits: scores.filter((score) => score.diagnosisHit).length,
    clearAirFalseAlarms:
      (scores.find((score) => score.id === "clear-air")?.falseInputAlarms ?? 0) +
      (scores.find((score) => score.id === "clear-air")?.falseConceptAlarms ?? 0),
  };
}

function scoreStudy(study: Study): ScenarioScore {
  const expectedCall = callFor(study.scenario.groundTruth);
  const psiFrame = firstAfterOnset(study, (frame) => frame.inputAlarm);
  const eceFrame = firstAfterOnset(study, (frame) => frame.conceptAlarm);
  const phFrame = firstAfterOnset(study, (frame) => frame.phAlarm);
  const actionFrame = firstAfterOnset(study, (frame) => frame.call === expectedCall);
  const end = study.frames[study.frames.length - 1];
  const falseInputAlarms = study.frames.filter((frame) => frame.t < study.onset && frame.inputAlarm).length;
  const falseConceptAlarms = study.frames.filter(
    (frame) => frame.t < study.onset && frame.conceptAlarm,
  ).length;

  const settled = settle(study.frames, study.onset);
  const diagnosisHit =
    study.scenario.groundTruth === "stable"
      ? falseInputAlarms === 0 && falseConceptAlarms === 0 && settled.diagnosis === "stable"
      : settled.diagnosis === study.scenario.groundTruth;

  return {
    id: study.scenario.id,
    name: study.scenario.name,
    kicker: study.scenario.kicker,
    blurb: study.scenario.blurb,
    groundTruth: study.scenario.groundTruth,
    labelDelay: study.scenario.labelDelay,
    onset: study.onset,
    refAccuracy: study.model.refAccuracy,
    refEce: study.model.refEce,
    refBrier: study.model.refBrier,
    endAccuracy: end.accuracy,
    endEce: end.ece,
    endMaxPsi: end.maxPsi,
    endDiagnosis: settled.diagnosis,
    endCall: settled.call,
    dominantFeature:
      end.dominant === null ? null : FEATURES[end.dominant]?.label ?? null,
    psiDelay: psiFrame ? psiFrame.t - study.onset : null,
    eceDelay: eceFrame ? eceFrame.t - study.onset : null,
    accuracyDelay: accuracyRuleDelay(study),
    phDelay: phFrame ? phFrame.t - study.onset : null,
    actionDelay: actionFrame ? actionFrame.t - study.onset : null,
    falseInputAlarms,
    falseConceptAlarms,
    diagnosisHit,
    weights: study.model.weights,
    bias: study.model.bias,
    threshold: study.model.threshold,
  };
}

function callFor(truth: Diagnosis): Call {
  if (truth === "concept" || truth === "mixed") return "retrain";
  if (truth === "covariate") return "inspect";
  return "hold";
}

function firstAfterOnset(study: Study, predicate: (frame: Frame) => boolean): Frame | null {
  return firstWhere(study.frames, (frame) => frame.t >= study.onset && predicate(frame));
}

/** Last quarter of the stream, so a ramp has time to arrive and a single noisy window cannot decide. */
function settle(frames: Frame[], onset: number): Frame {
  const late = frames.filter((frame) => frame.t >= onset + 360);
  return late[late.length - 1] ?? frames[frames.length - 1];
}

export function scoreById(bench: BenchResult, id: string): ScenarioScore {
  const score = bench.scores.find((item) => item.id === id);
  if (!score) throw new Error(`Missing score: ${id}`);
  return score;
}
