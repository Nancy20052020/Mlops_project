import { scoreById, type BenchResult } from "@/lib/experiments/bench";
import sweepJson from "@/lib/experiments/sweep.json";
import { callLabel, fixed, percent, samplesAfter } from "@/lib/format";
import { FEATURES } from "@/lib/sim/features";
import {
  ACCURACY_DROP,
  BASE_BIAS,
  BASE_WEIGHTS,
  ECE_ALARM,
  LABEL_MIN,
  LENGTH,
  ONSET,
  PH_DELTA,
  PH_LAMBDA,
  PSI_ALARM,
  PSI_WATCH,
  REFERENCE_END,
  SEED,
  TRAIN_END,
  WINDOW,
} from "@/lib/sim/protocol";

const sweep = sweepJson as {
  hits: number;
  trials: number;
  seeds: number[];
  misses: { seed: number; id: string; endDiagnosis: string; eceDelay: number | null }[];
};

export type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; kicker: string; text: string }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] }
  | { type: "figure" }
  | { type: "refs"; items: string[] };

export type ReportModel = {
  kicker: string;
  title: string;
  standfirst: string;
  blocks: Block[];
};

export function buildReport(bench: BenchResult): ReportModel {
  const clear = scoreById(bench, "clear-air");
  const wet = scoreById(bench, "wet-bulb");
  const wind = scoreById(bench, "veering-wind");
  const boundary = scoreById(bench, "boundary-break");
  const squall = scoreById(bench, "squall-line");
  const late = scoreById(bench, "late-letters");
  const miss = sweep.misses[0];

  const weightRows = FEATURES.map((feature, index) => [
    feature.label,
    BASE_WEIGHTS[index].toFixed(2),
    clear.weights[index].toFixed(2),
  ]);
  weightRows.push(["Bias", BASE_BIAS.toFixed(2), clear.bias.toFixed(2)]);

  return {
    kicker: "AIM4142 · MLOps research project · Manipal University Jaipur",
    title: "Heliograph: telling covariate shift from concept drift before you retrain",
    standfirst: `A production fault model can go stale in three different ways, and each one asks for a different response. This project builds a small, fully specified observatory — population stability, calibration error, and a Page-Hinkley residual test — and runs it against a wind-turbine stream whose drift is known by construction. On the reference seed the rule names all six weathers correctly. Across seeds ${sweep.seeds[0]}–${sweep.seeds[sweep.seeds.length - 1]} it is right on ${sweep.hits} of ${sweep.trials} runs.`,
    blocks: [
      { type: "h2", id: "problem", text: "Problem statement" },
      {
        type: "p",
        text: "A model that was honest on the day it shipped does not stay honest. In production the joint distribution of inputs and labels moves. Sometimes only the inputs move: a humidity probe reads high, or a new season pushes wind speed outside the training envelope. That is covariate shift. Sometimes the relationship itself moves: the same vibration no longer means the same fault, because a maintenance practice changed. That is concept drift. Sometimes both happen in the same hour, and the labels that would reveal it come back from the field much later.",
      },
      {
        type: "p",
        text: "Accuracy is a weak instrument for this. It is dark until labels arrive. A harmless sensor bias and a broken decision boundary can look alike in a single percentage. Retraining on every twitch spends labeling budget. Waiting for a visible collapse ships bad decisions in the meantime. The operational question is narrower than “did the world change?” It is: hold the deployed weights, inspect the sensors, or retrain.",
      },
      {
        type: "p",
        text: "Heliograph treats that question as a measurement problem. The setting is a fictional coastal wind farm, the North array, where a logistic model predicts a gearbox fault from six sensors. The world is simulated so every front has a ground truth. The monitors are classical, implemented from their definitions, and frozen before the scenarios are scored.",
      },
      { type: "h2", id: "objectives", text: "Objectives" },
      {
        type: "ul",
        items: [
          "Implement the population stability index, the two-sample Kolmogorov-Smirnov statistic, Jensen-Shannon divergence, expected calibration error, and a reference-anchored Page-Hinkley test without an ML framework.",
          "Freeze a logistic fault model on a locked reference window, then stream six weathers with known covariate shift, concept drift, a mixture, and a label delay.",
          "Compare the ensemble rule with two naive baselines: PSI alone, and a ten-point accuracy drop.",
          "Publish the instrument as a Vercel application so the same numbers in this report can be replayed, scrubbed, and screenshotted.",
        ],
      },
      { type: "h2", id: "methodology", text: "Methodology" },
      {
        type: "p",
        text: `The stream has ${LENGTH} samples and six standardized features: wind speed, vibration, gearbox temperature, rotor speed, humidity, and power. Wind, rotor speed, and power are correlated. Humidity is nearly independent, which makes a probe bias easy to isolate. Labels are Bernoulli draws from a logistic boundary. The base weights are [${BASE_WEIGHTS.map((weight) => weight.toFixed(2)).join(", ")}] with bias ${BASE_BIAS.toFixed(2)}. A concept drift rotates that boundary: vibration changes sign, humidity starts to matter, and power reverses.`,
      },
      {
        type: "p",
        text: `The deployed model is a second logistic regression. It is trained by batch gradient descent on samples 0–${TRAIN_END}, with a light L2 penalty. The decision threshold is chosen to maximize F1 on the calibration slice ${TRAIN_END}–${REFERENCE_END}, then frozen. On that slice the reference model reaches ${percent(clear.refAccuracy)} accuracy and an expected calibration error of ${fixed(clear.refEce, 3)}. Learned weights follow the true signs on the strong features. They do not match the true magnitudes, because wind, rotor speed, and power carry the same information and the fit is free to split weight among them.`,
      },
      {
        type: "p",
        text: `A front arrives at sample ${ONSET}. Until then every scenario is the same weather, drawn from seed ${SEED}. Monitors use a sliding window of ${WINDOW} samples, stepped every 20. Input drift is the worst population stability index across the six features, binned by reference quantiles. The textbook bands are 0.10 and 0.25. The worst-of-six maximum sits near 0.16 even in clear air, so the watch is placed at ${PSI_WATCH.toFixed(2)}, just above that null, and the alarm stays at the textbook ${PSI_ALARM.toFixed(2)}. Kolmogorov-Smirnov and Jensen-Shannon are computed and shown. They do not vote, because a p-value on a large window calls tiny shifts significant.`,
      },
      {
        type: "p",
        text: `Concept drift is read from labels that have actually arrived. In five scenarios the label is immediate. In Late letters it arrives ${late.labelDelay} samples after the observation. Expected calibration error is computed on the latest window once at least ${LABEL_MIN} labels are in hand. A rise of ${ECE_ALARM.toFixed(2)} above the calibration-slice ECE is a concept alarm. Page-Hinkley watches the squared residual against the reference mean, with slack δ = ${PH_DELTA} and threshold λ = ${PH_LAMBDA}. It is reported beside the rule. The decision itself uses PSI and calibration, which an operator can read without a sequential-test appendix.`,
      },
      {
        type: "p",
        text: "The action is pre-registered. Input alarm alone: inspect the feed and keep the weights. Concept alarm, whether or not the inputs also moved: retrain. Otherwise: hold. A separate accuracy baseline retrains when accuracy falls ten points below the pre-onset median and stays there for two windows. That baseline never sees the scenario name. Neither does the ensemble.",
      },
      { type: "figure" },
      {
        type: "p",
        text: "Six systems make up the protocol. Clear air is the null. Wet bulb is a sudden two-standard-deviation humidity bias. Veering wind is a slow 1.45-standard-deviation rise in wind speed across 380 samples. Boundary break rotates the logistic weights with no change in the inputs. Squall line does both at once. Late letters is the boundary break again, with inspection labels delayed by 280 samples.",
      },
      { type: "h2", id: "implementation", text: "Implementation" },
      {
        type: "p",
        text: "The project is a Next.js application in TypeScript. Statistics, the simulator, and the policy live in plain modules under lib/drift and lib/sim. The observatory, the protocol page, and this report all call those modules, so a number on the page is the number the test asserts. Vitest covers the detectors on synthetic samples and the six scenarios on seed 11. There is no Python runtime and no environment variable, which is what makes the project a direct Vercel deploy: framework preset Next.js, build command next build, and nothing else to configure.",
      },
      {
        type: "p",
        text: "The observatory replays a scenario as a field watch. A playhead walks the precomputed frames. Density curves compare the locked reference with the current window. A paper ticket states the action in a sentence. An answer-key toggle draws the known front; the monitors do not read that line. The background is a slow particle field whose speed follows the severity, and it stays still when the visitor has asked for reduced motion.",
      },
      {
        type: "table",
        caption: "True boundary against the frozen deployed weights on seed 11. Collinear wind, rotor speed, and power explain the split.",
        headers: ["Term", "Truth", "Deployed"],
        rows: weightRows,
      },
      { type: "h2", id: "results", text: "Results" },
      {
        type: "p",
        text: `On seed ${SEED} the settled diagnosis matches the ground truth in all six systems. Clear air produces no input alarm, no calibration alarm, no Page-Hinkley crossing, and no accuracy alarm. Wet bulb trips PSI at ${wet.psiDelay} samples after the front. The dominant feature is humidity. Calibration, Page-Hinkley, and the accuracy rule all stay silent, so the call is inspect: the probe moved, and the boundary still describes the labels.`,
      },
      {
        type: "p",
        text: `Veering wind is the same kind of shift, stretched out. PSI crosses 0.25 at ${wind.psiDelay} samples, later than the sudden probe, and the settled call is again inspect. Accuracy never falls ten points. The envelope moved. The probabilities are still honest.`,
      },
      {
        type: "p",
        text: `Boundary break is the case input monitors cannot see. End-of-stream PSI is ${fixed(boundary.endMaxPsi)}, under the watch band, and the PSI rule stays silent. Calibration error rises by sample ${ONSET + (boundary.eceDelay ?? 0)} — a delay of ${boundary.eceDelay}. Page-Hinkley follows at ${boundary.phDelay}, and the accuracy rule at ${boundary.accuracyDelay}. Window accuracy falls from a pre-onset level near ${percent(clear.refAccuracy)} to ${percent(boundary.endAccuracy)}. The call is retrain. Squall line trips both channels at ${squall.psiDelay} samples and is named mixed, which also retrains.`,
      },
      {
        type: "p",
        text: `Late letters repeats the boundary break with a ${late.labelDelay}-sample label lag. PSI stays silent. Calibration fires at ${late.eceDelay} samples after the front, Page-Hinkley at ${late.phDelay}, and the accuracy rule at ${late.accuracyDelay}. All three sit past the lag. That is a physical limit: a monitor that needs Y cannot beat the time Y takes to arrive. What the ensemble adds during the wait is a sentence. The inputs still match the reference, and the performance instruments are dark because the letters are late.`,
      },
      {
        type: "table",
        caption: "Samples after the front on seed 11. Silent means that rule never fired. The call is the action at the end of the stream.",
        headers: ["System", "Truth", "PSI", "ECE", "Page-Hinkley", "Accuracy", "Call"],
        rows: bench.scores.map((score) => [
          score.name,
          pretty(score.groundTruth),
          samplesAfter(score.psiDelay),
          samplesAfter(score.eceDelay),
          samplesAfter(score.phDelay),
          samplesAfter(score.accuracyDelay),
          callLabel(score.endCall),
        ]),
      },
      {
        type: "callout",
        kicker: "What the baselines miss",
        text: `PSI is the right tool for Wet bulb and Veering wind, and it is blind on both concept-drift systems. The accuracy rule is blind on both covariate systems, and on Late letters it waits out the same lag as calibration. The useful object is the pair: which channel fired, and therefore which action to take.`,
      },
      {
        type: "p",
        text: `The same protocol on seeds ${sweep.seeds[0]} through ${sweep.seeds[sweep.seeds.length - 1]} is correct on ${sweep.hits} of ${sweep.trials} scenario runs. Clear air, Wet bulb, Boundary break, Squall line, and Late letters are correct on all ${sweep.seeds.length} seeds. The single miss is Veering wind on seed ${miss.seed}: PSI fires, and much later the calibration error also rises (ECE delay ${miss.eceDelay}), so the settled label is ${miss.endDiagnosis} rather than covariate. A long shift in a feature the model actually uses can bruise calibration. The rule then asks for a retrain. That is the conservative mistake, and it is reported rather than tuned away.`,
      },
      { type: "h2", id: "conclusion", text: "Conclusion" },
      {
        type: "p",
        text: "Input stability and calibration answer different questions. A sensor can leave the training support while P(Y|X) holds, and the right spend is an engineer with the probe, not a new training run. The decision boundary can move while every marginal looks familiar, and in that case the inputs will never raise the alarm. Label delay sets a floor under every performance monitor. Heliograph’s contribution is the diagnosis that falls out of running those instruments side by side, with the thresholds written down before the score.",
      },
      {
        type: "p",
        text: "The setting is the one MLOps teams already occupy: a model card with a reference window, a feature store that can drift, a labeling loop that is slow, and a retraining job that is expensive. Population stability is standard in credit scorecards. Calibration plots are standard wherever probabilities are acted on. Page-Hinkley is a classical sequential test for a change in level. None of the pieces is exotic. The failure mode this project is aimed at is using only one of them.",
      },
      {
        type: "p",
        text: "The world here is a logistic simulation with one front. Real concept drift is messier, categorical features need their own bins, and a deep model can lose calibration for reasons this linear fit never sees. Five-bin ECE is coarse. The watch threshold was lifted from 0.10 to 0.18 because of the max over six features; another feature set would need its own null. Recurring and seasonal drift are outside the protocol. Those are reasons to carry the same three instruments into a real pipeline, with a reference window taken from training data and a label-arrival clock taken from the warehouse, and to keep the rule as explicit as the one in this report.",
      },
      { type: "h2", id: "references", text: "References" },
      {
        type: "refs",
        items: [
          "Breck, E., Cai, S., Nielsen, E., Salib, M., and Sculley, D. The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction. IEEE International Conference on Big Data, 2017.",
          "Gama, J., Žliobaitė, I., Bifet, A., Pechenizkiy, M., and Bouchachia, A. A Survey on Concept Drift Adaptation. ACM Computing Surveys, 46(4), 2014.",
          "Guo, C., Pleiss, G., Sun, Y., and Weinberger, K. Q. On Calibration of Modern Neural Networks. International Conference on Machine Learning, 2017.",
          "Hinkley, D. V. Inference about the Change-Point from Cumulative Sum Tests. Biometrika, 1971.",
          "Lu, J., Liu, A., Dong, F., Gu, F., Gama, J., and Zhang, G. Learning under Concept Drift: A Review. IEEE Transactions on Knowledge and Data Engineering, 31(12), 2019.",
          "Moreno-Torres, J. G., Raeder, T., Alaiz-Rodríguez, R., Chawla, N. V., and Herrera, F. A Unifying View on Dataset Shift in Classification. Pattern Recognition, 45(1), 2012.",
          "Page, E. S. Continuous Inspection Schemes. Biometrika, 41(1/2), 100–115, 1954.",
          "Rabanser, S., Günnemann, S., and Lipton, Z. Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift. Advances in Neural Information Processing Systems, 2019.",
          "Sculley, D., Holt, G., Golovin, D., Davydov, E., Phillips, T., Ebner, D., Chaudhary, V., Young, M., Crespo, J.-F., and Dennison, D. Hidden Technical Debt in Machine Learning Systems. Advances in Neural Information Processing Systems, 2015.",
          "Siddiqi, N. Credit Risk Scorecards: Developing and Implementing Intelligent Credit Scoring. Wiley, 2006.",
          "Webb, G. I., Hyde, R., Cao, H., Nguyen, H. L., and Petitjean, F. Characterizing Concept Drift. Data Mining and Knowledge Discovery, 30(4), 2016.",
          "Žliobaitė, I. Learning under Concept Drift: an Overview. arXiv:1010.4784, 2010.",
        ],
      },
    ],
  };
}

function pretty(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function renderMarkdown(report: ReportModel): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    report.kicker,
    "",
    report.standfirst,
    "",
  ];

  for (const block of report.blocks) {
    if (block.type === "h2") {
      lines.push(`## ${block.text}`, "");
    } else if (block.type === "p" || block.type === "callout") {
      lines.push(block.type === "callout" ? `> **${block.kicker}.** ${block.text}` : block.text, "");
    } else if (block.type === "ul") {
      for (const item of block.items) lines.push(`- ${item}`);
      lines.push("");
    } else if (block.type === "table") {
      lines.push(`*${block.caption}*`, "");
      lines.push(`| ${block.headers.join(" | ")} |`);
      lines.push(`| ${block.headers.map(() => "---").join(" | ")} |`);
      for (const row of block.rows) lines.push(`| ${row.join(" | ")} |`);
      lines.push("");
    } else if (block.type === "figure") {
      lines.push("The monitoring path is: locked reference, frozen model, sliding window, PSI on inputs, ECE and Page-Hinkley on arrived labels, then hold, inspect, or retrain.", "");
    } else if (block.type === "refs") {
      for (const item of block.items) lines.push(`- ${item}`);
      lines.push("");
    }
  }

  lines.push("Course: AIM4142 MLOps, Department of AI & ML, School of Computer Science and Engineering, Manipal University Jaipur.");
  lines.push("The interactive instrument and this text are the same program. Deploy the repository on Vercel and open /report.");
  lines.push("");
  return lines.join("\n");
}
