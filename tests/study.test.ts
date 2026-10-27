import { describe, expect, it } from "vitest";
import { runBench } from "@/lib/experiments/bench";
import sweep from "@/lib/experiments/sweep.json";
import { BASE_WEIGHTS, PSI_WATCH } from "@/lib/sim/protocol";
import { getStudy } from "@/lib/sim/study";

const bench = runBench();
const score = (id: string) => {
  const found = bench.scores.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe("deployed model", () => {
  it("recovers the true direction of the boundary on the reference climate", () => {
    const study = getStudy("clear-air");
    expect(study.model.refAccuracy).toBeGreaterThan(0.72);
    expect(study.model.refEce).toBeLessThan(0.12);
    for (let feature = 0; feature < BASE_WEIGHTS.length; feature++) {
      if (Math.abs(BASE_WEIGHTS[feature]) < 0.2) continue;
      expect(Math.sign(study.model.weights[feature])).toBe(Math.sign(BASE_WEIGHTS[feature]));
    }
  });
});

describe("the six weather systems", () => {
  it("stays silent in clear air", () => {
    const clear = score("clear-air");
    const peak = Math.max(...getStudy("clear-air").frames.map((frame) => frame.maxPsi));
    expect(peak).toBeLessThan(PSI_WATCH);
    expect(clear.falseInputAlarms).toBe(0);
    expect(clear.falseConceptAlarms).toBe(0);
    expect(clear.accuracyDelay).toBeNull();
    expect(clear.phDelay).toBeNull();
    expect(clear.endDiagnosis).toBe("stable");
    expect(clear.endCall).toBe("hold");
    expect(clear.diagnosisHit).toBe(true);
  });

  it("inspects a humidity bias without calling for a retrain", () => {
    const wet = score("wet-bulb");
    expect(wet.psiDelay).not.toBeNull();
    expect(wet.psiDelay!).toBeLessThan(160);
    expect(wet.eceDelay).toBeNull();
    expect(wet.endDiagnosis).toBe("covariate");
    expect(wet.endCall).toBe("inspect");
    expect(wet.accuracyDelay).toBeNull();
    expect(wet.dominantFeature).toBe("Humidity");
  });

  it("notices a slow wind shift later than a sudden probe bias", () => {
    const wind = score("veering-wind");
    const wet = score("wet-bulb");
    expect(wind.psiDelay).not.toBeNull();
    expect(wind.psiDelay!).toBeGreaterThan(wet.psiDelay!);
    expect(wind.endDiagnosis).toBe("covariate");
    expect(wind.endCall).toBe("inspect");
  });

  it("is blind to concept drift on inputs and awake on calibration", () => {
    const boundary = score("boundary-break");
    expect(boundary.psiDelay).toBeNull();
    expect(boundary.endMaxPsi).toBeLessThan(0.15);
    expect(boundary.eceDelay).not.toBeNull();
    expect(boundary.eceDelay!).toBeLessThan(220);
    expect(boundary.endDiagnosis).toBe("concept");
    expect(boundary.endCall).toBe("retrain");
  });

  it("names a squall as mixed and asks for a retrain", () => {
    const squall = score("squall-line");
    expect(squall.psiDelay).not.toBeNull();
    expect(squall.eceDelay).not.toBeNull();
    expect(squall.endDiagnosis).toBe("mixed");
    expect(squall.endCall).toBe("retrain");
  });

  it("cannot beat the label lag when only the boundary moves", () => {
    const late = score("late-letters");
    expect(late.psiDelay).toBeNull();
    expect(late.eceDelay).not.toBeNull();
    expect(late.eceDelay!).toBeGreaterThan(late.labelDelay);
    expect(late.endDiagnosis).toBe("concept");
    expect(late.endCall).toBe("retrain");
  });

  it("diagnoses every system on the reference seed", () => {
    expect(bench.diagnosisHits).toBe(bench.scores.length);
  });

  it("keeps the published multi-seed sweep", () => {
    expect(sweep.trials).toBe(144);
    expect(sweep.hits).toBe(143);
    expect(sweep.misses).toHaveLength(1);
    expect(sweep.misses[0].id).toBe("veering-wind");
  });
});
