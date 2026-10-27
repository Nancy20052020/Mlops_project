import { COURSE } from "@/lib/course";
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
  | { type: "shot"; src: string; alt: string; caption: string }
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
    kicker: `${COURSE.code} ${COURSE.subject} · ${COURSE.student} · ${COURSE.registration} · ${COURSE.branch}`,
    title: "Heliograph: detecting covariate shift and concept drift before retraining",
    standfirst: `This report is for AIM4142 MLOps. I built a small monitoring setup for a gearbox-fault classifier and tested it on simulated wind-turbine data where the type of drift is known. The monitor uses the population stability index on the inputs and expected calibration error on the labels, then picks one action: hold the model, inspect the sensor, or retrain. On seed ${SEED} it gets all six test cases right. Across seeds ${sweep.seeds[0]} to ${sweep.seeds[sweep.seeds.length - 1]} it is right on ${sweep.hits} of ${sweep.trials} runs.`,
    blocks: [
      { type: "h2", id: "problem", text: "Problem statement" },
      {
        type: "p",
        text: "Once a model is deployed, the data it sees later is not always the data it was trained on. Sometimes only the inputs change. A humidity sensor can start reading higher than it did in training, while the fault logic stays the same. That is covariate shift. Sometimes the relationship changes. The same vibration value may no longer mean the same fault if maintenance practice has changed. That is concept drift. Both can happen together, and the labels that would show it often come in late.",
      },
      {
        type: "p",
        text: "Watching accuracy alone is not enough. Accuracy needs labels, so it is late by definition. It also does not say what to do next. A bad sensor and a changed decision boundary can both reduce accuracy. Retraining on every small input change wastes labels. Waiting until accuracy has already fallen means the model keeps making poor predictions in the meantime.",
      },
      {
        type: "p",
        text: "For this project I used a simulated wind-turbine setting. The classifier predicts a gearbox fault from six sensor readings. Because the data is generated, each scenario has a known ground truth. The monitor is deliberately simple: population stability index (PSI) on the features, and expected calibration error (ECE) on the labels that have arrived. The output is one of three actions. Hold the current weights, inspect the sensor, or retrain.",
      },
      { type: "h2", id: "objectives", text: "Objectives" },
      {
        type: "ul",
        items: [
          "Implement PSI, the two-sample Kolmogorov-Smirnov statistic, Jensen-Shannon divergence, expected calibration error, and a Page-Hinkley test from their definitions.",
          "Train a logistic regression on a fixed reference window, freeze it, and run six drift scenarios with known causes.",
          "Compare the combined rule with two simpler baselines: PSI only, and a ten-point drop in accuracy.",
          "Put the same code on Vercel so the numbers in this report can be checked in the app.",
        ],
      },
      { type: "h2", id: "methodology", text: "Methodology" },
      {
        type: "p",
        text: `Each run has ${LENGTH} samples and six features: wind speed, vibration, gearbox temperature, rotor speed, humidity, and power. I kept wind, rotor speed, and power correlated, because that is how a turbine actually behaves. Humidity is almost independent of the others, so a fault in that sensor is easy to separate from a real change in the fault logic. Labels are drawn from a logistic model. The true weights are [${BASE_WEIGHTS.map((weight) => weight.toFixed(2)).join(", ")}] with bias ${BASE_BIAS.toFixed(2)}. When I inject concept drift, those weights change: the vibration coefficient flips sign, humidity starts to matter, and the power coefficient reverses.`,
      },
      {
        type: "p",
        text: `The deployed model is a second logistic regression. I trained it with batch gradient descent on samples 0 to ${TRAIN_END}, with a small L2 penalty, and chose the threshold that maximises F1 on samples ${TRAIN_END} to ${REFERENCE_END}. After that the weights are frozen. On the calibration slice the accuracy is ${percent(clear.refAccuracy)} and the ECE is ${fixed(clear.refEce, 3)}. The learned signs match the true signs on the important features. The magnitudes do not match exactly, because wind, rotor speed, and power carry overlapping information and the fit can split the weight between them.`,
      },
      {
        type: "p",
        text: `The drift starts at sample ${ONSET}. Before that, every scenario uses the same stream from seed ${SEED}. I check a sliding window of ${WINDOW} samples every 20 steps. For inputs I take the worst PSI across the six features, using quantile bins from the reference. The usual bands are 0.10 and 0.25. With six features the worst PSI can reach about 0.16 even when nothing has changed, so I set the watch level at ${PSI_WATCH.toFixed(2)} and kept the alarm at ${PSI_ALARM.toFixed(2)}. I also compute the KS statistic and Jensen-Shannon divergence, but they are only shown. I did not use them in the decision, because a p-value on a large window flags very small shifts.`,
      },
      {
        type: "p",
        text: `For concept drift I only use labels that have already arrived. In five scenarios the label is available immediately. In Late letters it arrives ${late.labelDelay} samples later. ECE is computed once the window has at least ${LABEL_MIN} labels. If ECE rises by ${ECE_ALARM.toFixed(2)} above the reference, that is a concept alarm. I also run a Page-Hinkley test on the squared residual, with delta ${PH_DELTA} and lambda ${PH_LAMBDA}. It is reported next to the decision. The decision itself uses PSI and ECE, which are easier to explain.`,
      },
      {
        type: "p",
        text: `I fixed the rule before looking at the scores. If only the inputs alarm, the action is to inspect the sensor and keep the weights. If calibration alarms, the action is to retrain, even if the inputs also moved. Otherwise the action is to hold. The accuracy baseline is separate. It retrains when accuracy falls by ${ACCURACY_DROP.toFixed(2)} from the median before the drift and stays down for two windows. That baseline does not know which scenario it is in. The combined rule does not either.`,
      },
      {
        type: "p",
        text: "There are six scenarios. Clear air has no drift. Wet bulb is a sudden humidity bias of two standard deviations. Veering wind is a slow rise in wind speed of 1.45 standard deviations over 380 samples. Boundary break changes the logistic weights and leaves the inputs alone. Squall line does both at once. Late letters is the same boundary change, but the labels are delayed by 280 samples.",
      },
      { type: "h2", id: "implementation", text: "Implementation" },
      {
        type: "p",
        text: `I implemented the project as a Next.js app in TypeScript, without a Python runtime or any API key. The statistics and the simulator are in lib/drift and lib/sim. The dashboard, the field desk, the results table, and this report all call those functions, so the numbers here are the same numbers the tests check. Vitest covers the detectors, the six scenarios on seed 11, and a refit on the labels that arrive after the drift. On the field desk I can change humidity bias, wind shift, how far the boundary rotates, and the label delay, and the same rule responds. The app is deployed at ${COURSE.vercel}. The code is at ${COURSE.github}.`,
      },
      {
        type: "shot",
        src: "/images/report/home.jpg",
        alt: "Home page of the Heliograph site, with the project title and a live humidity PSI chart",
        caption: "Figure 1. Home page of the deployed project.",
      },
      {
        type: "p",
        text: "The main screen replays one scenario. A cursor moves through the stream. One chart shows PSI and accuracy, and another compares the reference distribution with the current window. The recommended action is written out in a short note. A checkbox can show where the drift actually started. The monitor does not use that line. It only sees the features and the labels that have arrived.",
      },
      {
        type: "shot",
        src: "/images/report/observatory-wet-bulb.jpg",
        alt: "Observatory on the wet-bulb scenario, with humidity shifted and the action set to inspect",
        caption: "Figure 2. Observatory, wet bulb. Humidity has moved and the action is inspect.",
      },
      {
        type: "p",
        text: "The field desk uses the same rule, with the inputs left open. I rotated the decision boundary and cast it. The action came back as retrain, and a new fit on the labels after the change lifted accuracy on the later window from 45.2% to 71.7%.",
      },
      {
        type: "shot",
        src: "/images/report/field-desk.jpg",
        alt: "Field desk after rotating the decision boundary, with a retrain call and the refit comparison",
        caption: "Figure 3. Field desk after a boundary change. A refit on the later labels lifts accuracy from 45.2% to 71.7%.",
      },
      {
        type: "table",
        caption: "True weights and the weights learned on seed 11. Wind, rotor speed, and power overlap, so the fit does not recover the exact values.",
        headers: ["Term", "Truth", "Deployed"],
        rows: weightRows,
      },
      { type: "h2", id: "results", text: "Results" },
      {
        type: "p",
        text: `On seed ${SEED} the final diagnosis matches the ground truth in all six scenarios. In clear air, PSI, ECE, Page-Hinkley, and the accuracy rule all stay quiet, and the action is hold. In wet bulb, PSI crosses 0.25 at ${wet.psiDelay} samples after the drift starts, and the feature responsible is humidity. ECE does not rise, so the action is inspect. The sensor moved. The decision boundary did not.`,
      },
      {
        type: "p",
        text: `Veering wind is the same kind of change, but slower. PSI crosses 0.25 at ${wind.psiDelay} samples, which is later than the sudden humidity bias. The final action is again inspect. Accuracy does not fall by ten points. The inputs left the training range, and the probabilities are still reasonable.`,
      },
      {
        type: "p",
        text: `Boundary break is the case where an input test cannot help. PSI at the end of the stream is ${fixed(boundary.endMaxPsi)}, which is below the watch level, and the PSI rule never alarms. ECE rises ${boundary.eceDelay} samples after the drift starts. Page-Hinkley follows at ${boundary.phDelay} samples, and the accuracy rule at ${boundary.accuracyDelay}. Window accuracy falls from about ${percent(clear.refAccuracy)} to ${percent(boundary.endAccuracy)}. The action is retrain. Squall line trips both PSI and ECE at ${squall.psiDelay} samples. I label that case mixed, and the action is also retrain.`,
      },
      {
        type: "shot",
        src: "/images/report/observatory-boundary.jpg",
        alt: "Observatory on boundary break, with overlapping vibration densities and a retrain action",
        caption: "Figure 4. Observatory, boundary break. The vibration densities still overlap, and the action is retrain.",
      },
      {
        type: "p",
        text: `Late letters repeats the boundary break with a label delay of ${late.labelDelay} samples. PSI stays quiet. ECE alarms at ${late.eceDelay} samples, Page-Hinkley at ${late.phDelay}, and the accuracy rule at ${late.accuracyDelay}. All three are after the delay. A method that needs the label cannot detect the change before the label exists. During the wait the inputs still match the reference, which is useful to know, but it does not replace the missing labels.`,
      },
      {
        type: "table",
        caption: "Samples after the drift starts, seed 11. Silent means that rule never fired. The last column is the action at the end of the run.",
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
        type: "shot",
        src: "/images/report/protocol.jpg",
        alt: "Protocol page showing zero false alarms in clear air, a humidity delay of 60, and 143 of 144 correct diagnoses",
        caption: "Figure 5. Protocol page for seed 11, with the 143 of 144 result across seeds 1 to 24.",
      },
      {
        type: "callout",
        kicker: "Comparison with the baselines",
        text: `PSI catches Wet bulb and Veering wind, and it misses both concept-drift cases. The accuracy rule misses both covariate cases. On Late letters it is as late as ECE, because both of them wait for labels. Using the two signals together is what makes the action specific.`,
      },
      {
        type: "p",
        text: `I repeated the six scenarios on seeds ${sweep.seeds[0]} to ${sweep.seeds[sweep.seeds.length - 1]}. The final diagnosis is correct on ${sweep.hits} of ${sweep.trials} runs. Clear air, Wet bulb, Boundary break, Squall line, and Late letters are correct on every seed. The one miss is Veering wind on seed ${miss.seed}. PSI fires, and much later ECE also rises (delay ${miss.eceDelay}), so the final label is ${miss.endDiagnosis} instead of covariate. A long shift in a feature the model actually uses can affect calibration. The rule then asks for a retrain. I left this result in, because changing the threshold to hide one seed would be fitting the test.`,
      },
      { type: "h2", id: "conclusion", text: "Conclusion" },
      {
        type: "p",
        text: "PSI and calibration are answering different questions. If a sensor leaves the training range and P(Y|X) is unchanged, the practical next step is to check the sensor. Retraining does not fix a biased probe. If the decision boundary changes while the inputs still look normal, PSI will stay quiet and only the labels will show the problem. If those labels are delayed, every method that needs them is delayed by at least that much. The useful part of this project is running the two checks side by side and writing the threshold down before scoring the scenarios.",
      },
      {
        type: "p",
        text: "This is a common MLOps situation. There is a reference window from training, features that can drift, a labelling step that is slow, and a retraining job that costs time. PSI is already used in credit scorecards. Calibration plots are used wherever a probability is acted on. Page-Hinkley is an old test for a change in the mean. I am not claiming a new detector. The point is that using only one of these checks leads to the wrong action.",
      },
      {
        type: "p",
        text: "The data here is a logistic simulation with one change point. Real drift is messier. Categorical features need their own bins, and a neural network can become miscalibrated for reasons this linear model does not show. ECE with five bins is rough in a short window. I raised the PSI watch level from 0.10 to 0.18 because I was taking the maximum over six features. Another feature set would need its own check on data with no drift. Seasonal drift is not in these six scenarios. The same two measurements can still be used on a real pipeline if the reference window comes from training data and the label delay is taken from the actual labelling process.",
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
    `${COURSE.university}`,
    `${COURSE.school}`,
    `${COURSE.department}`,
    "",
    `Course: ${COURSE.code} ${COURSE.subject}`,
    `Submitted by: ${COURSE.student}`,
    `Registration number: ${COURSE.registration}`,
    `Branch: ${COURSE.branch}`,
    "",
    `GitHub: ${COURSE.github}`,
    `Vercel: ${COURSE.vercel}`,
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
    } else if (block.type === "shot") {
      const src = block.src.replace(/^\//, "public/");
      lines.push(`![${block.alt}](${src})`, "", `*${block.caption}*`, "");
    } else if (block.type === "figure") {
      lines.push("The monitoring path is: locked reference, frozen model, sliding window, PSI on inputs, ECE and Page-Hinkley on arrived labels, then hold, inspect, or retrain.", "");
    } else if (block.type === "refs") {
      for (const item of block.items) lines.push(`- ${item}`);
      lines.push("");
    }
  }

  lines.push(`Deployed project: ${COURSE.vercel}`);
  lines.push(`GitHub: ${COURSE.github}`);
  lines.push("");
  return lines.join("\n");
}
