import { runBench } from "../lib/experiments/bench";

const bench = runBench();
const rows = bench.scores.map((score) => ({
  id: score.id,
  truth: score.groundTruth,
  psi: score.psiDelay,
  ece: score.eceDelay,
  accuracy: score.accuracyDelay,
  action: score.actionDelay,
  end: score.endDiagnosis,
  call: score.endCall,
  hit: score.diagnosisHit,
  psiEnd: Number(score.endMaxPsi.toFixed(3)),
  eceEnd: score.endEce === null ? null : Number(score.endEce.toFixed(3)),
  acc: score.endAccuracy === null ? null : Number(score.endAccuracy.toFixed(3)),
  refAcc: Number(score.refAccuracy.toFixed(3)),
  refEce: Number(score.refEce.toFixed(3)),
  feature: score.dominantFeature,
  falseIn: score.falseInputAlarms,
  falseConcept: score.falseConceptAlarms,
}));

console.log(JSON.stringify({ seed: bench.seed, hits: bench.diagnosisHits, rows }, null, 2));
console.log(
  "weights",
  bench.scores[0].weights.map((weight) => Number(weight.toFixed(3))),
  "bias",
  Number(bench.scores[0].bias.toFixed(3)),
  "threshold",
  bench.scores[0].threshold,
);
