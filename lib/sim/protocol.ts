/**
 * Pre-registered constants. They are not tuned per scenario.
 * PSI bands are the credit-risk convention (Siddiqi). The ECE rise of 0.07
 * is a practical calibration break, not a p-value.
 */
export const SEED = 11;

export const TRAIN_END = 400;
export const REFERENCE_END = 520;
export const ONSET = 700;
export const LENGTH = 1600;
export const WINDOW = 180;
export const STEP = 20;
export const LABEL_MIN = 90;

/**
 * Textbook PSI watch is 0.10. Here the instrument takes the worst of six
 * features, and that maximum sits near 0.16 even in clear air, so the watch
 * is set just above the observed null. The alarm stays at the textbook 0.25.
 */
export const PSI_WATCH = 0.18;
export const PSI_ALARM = 0.25;
export const ECE_WATCH = 0.04;
export const ECE_ALARM = 0.07;
/** Ten-point drop from the pre-onset median, held for two windows. */
export const ACCURACY_DROP = 0.1;

/** Page-Hinkley slack and threshold on the squared residual. */
export const PH_DELTA = 0.004;
export const PH_LAMBDA = 18;

export const BASE_WEIGHTS = [0.92, 1.08, 0.7, 0.38, 0.02, 0.12];
export const BASE_BIAS = -1.35;

/** A rotated boundary: vibration flips, humidity starts to matter, power reverses. */
export const CONCEPT_WEIGHTS = [-0.15, -0.95, 1.25, 0.1, 0.85, -0.65];
export const CONCEPT_BIAS = -1.05;

export type GroundTruth = "stable" | "covariate" | "concept" | "mixed";
export type Diagnosis = GroundTruth;
export type Call = "hold" | "inspect" | "retrain";
export type Severity = "calm" | "watch" | "alarm" | "retrain";

export type Scenario = {
  id: string;
  name: string;
  kicker: string;
  blurb: string;
  groundTruth: GroundTruth;
  labelDelay: number;
  onset: number;
  ramp: number;
  meanShift: number[];
  conceptMix: number;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "clear-air",
    name: "Clear air",
    kicker: "Null",
    blurb: "The climate holds. A test of whether the instrument can stay quiet.",
    groundTruth: "stable",
    labelDelay: 0,
    onset: ONSET,
    ramp: 0,
    meanShift: [0, 0, 0, 0, 0, 0],
    conceptMix: 0,
  },
  {
    id: "wet-bulb",
    name: "Wet bulb",
    kicker: "Covariate",
    blurb: "The humidity probe reads two standard deviations high. The fault physics do not change.",
    groundTruth: "covariate",
    labelDelay: 0,
    onset: ONSET,
    ramp: 0,
    meanShift: [0, 0, 0, 0, 2, 0],
    conceptMix: 0,
  },
  {
    id: "veering-wind",
    name: "Veering wind",
    kicker: "Covariate, slow",
    blurb: "Wind speed climbs across a fortnight. The boundary is the same; the envelope is not.",
    groundTruth: "covariate",
    labelDelay: 0,
    onset: ONSET,
    ramp: 380,
    meanShift: [1.45, 0, 0, 0, 0, 0],
    conceptMix: 0,
  },
  {
    id: "boundary-break",
    name: "Boundary break",
    kicker: "Concept",
    blurb: "Maintenance practice changes. Same weather, a different meaning for vibration.",
    groundTruth: "concept",
    labelDelay: 0,
    onset: ONSET,
    ramp: 0,
    meanShift: [0, 0, 0, 0, 0, 0],
    conceptMix: 1,
  },
  {
    id: "squall-line",
    name: "Squall line",
    kicker: "Mixed",
    blurb: "The probe drifts and the boundary moves in the same hour.",
    groundTruth: "mixed",
    labelDelay: 0,
    onset: ONSET,
    ramp: 0,
    meanShift: [0, 0, 0, 0, 1.8, 0],
    conceptMix: 1,
  },
  {
    id: "late-letters",
    name: "Late letters",
    kicker: "Concept, delayed labels",
    blurb: "The boundary breaks, but inspection labels take 280 samples to come back from the field.",
    groundTruth: "concept",
    labelDelay: 280,
    onset: ONSET,
    ramp: 0,
    meanShift: [0, 0, 0, 0, 0, 0],
    conceptMix: 1,
  },
];

export function scenarioById(id: string): Scenario {
  const scenario = SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}

export function strengthAt(index: number, scenario: Scenario): number {
  if (index < scenario.onset) return 0;
  if (scenario.ramp <= 0) return 1;
  return Math.min(1, (index - scenario.onset + 1) / scenario.ramp);
}
