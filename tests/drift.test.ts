import { describe, expect, it } from "vitest";
import { expectedCalibrationError } from "@/lib/drift/calibration";
import { jensenShannon } from "@/lib/drift/divergence";
import { kolmogorovSmirnov } from "@/lib/drift/ks";
import { pageHinkley } from "@/lib/drift/pageHinkley";
import { populationStabilityIndex } from "@/lib/drift/psi";
import { makeRng } from "@/lib/sim/rng";

function sample(seed: number, count: number, mean: number): number[] {
  const rng = makeRng(seed);
  return Array.from({ length: count }, () => rng.normal() + mean);
}

describe("population stability index", () => {
  it("stays quiet when the two samples share a distribution", () => {
    const reference = sample(3, 800, 0);
    const current = sample(9, 400, 0);
    expect(populationStabilityIndex(reference, current).psi).toBeLessThan(0.08);
  });

  it("crosses the conventional 0.25 band after a two-sd shift", () => {
    const reference = sample(3, 800, 0);
    const current = sample(9, 400, 2);
    expect(populationStabilityIndex(reference, current).psi).toBeGreaterThan(0.25);
  });
});

describe("kolmogorov-smirnov", () => {
  it("is near zero for a sample against itself", () => {
    const values = sample(4, 200, 0);
    expect(kolmogorovSmirnov(values, values).statistic).toBe(0);
  });

  it("rejects a large location shift", () => {
    const result = kolmogorovSmirnov(sample(4, 400, 0), sample(8, 400, 1.5));
    expect(result.statistic).toBeGreaterThan(0.4);
    expect(result.pValue).toBeLessThan(0.01);
  });
});

describe("jensen-shannon", () => {
  it("is symmetric and small for matched samples", () => {
    const left = sample(1, 500, 0);
    const right = sample(2, 500, 0);
    const forward = jensenShannon(left, right);
    const backward = jensenShannon(right, left);
    expect(Math.abs(forward - backward)).toBeLessThan(0.02);
    expect(forward).toBeLessThan(0.05);
    expect(forward).toBeGreaterThanOrEqual(0);
    expect(forward).toBeLessThanOrEqual(1);
  });
});

describe("calibration", () => {
  it("is near zero when observed rates match the predicted bins", () => {
    const probabilities = [
      ...Array.from({ length: 40 }, () => 0.2),
      ...Array.from({ length: 40 }, () => 0.8),
    ];
    const labels = [
      ...Array.from({ length: 40 }, (_, index) => (index < 8 ? 1 : 0)),
      ...Array.from({ length: 40 }, (_, index) => (index < 32 ? 1 : 0)),
    ];
    expect(expectedCalibrationError(probabilities, labels, 5)).toBeLessThan(0.02);
  });
});

describe("page-hinkley", () => {
  it("stays below the threshold on a stable residual", () => {
    const values = sample(5, 400, 0.12);
    const result = pageHinkley(values, 0.12, 0.01, 20);
    expect(result.firstAlarm).toBeNull();
  });

  it("fires after the mean steps up", () => {
    const calm = sample(5, 200, 0.12);
    const shifted = sample(6, 200, 0.28);
    const result = pageHinkley([...calm, ...shifted], 0.12, 0.005, 12);
    expect(result.firstAlarm).not.toBeNull();
    expect(result.firstAlarm!).toBeGreaterThan(180);
    expect(result.firstAlarm!).toBeLessThan(320);
  });
});
