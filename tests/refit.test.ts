import { describe, expect, it } from "vitest";
import { compareRefit } from "@/lib/sim/refit";
import { getStudy } from "@/lib/sim/study";

describe("refit after the front", () => {
  it("recovers accuracy when the boundary itself moved", () => {
    const report = compareRefit(getStudy("boundary-break"));
    expect(report.refitAccuracy).toBeGreaterThan(report.frozenAccuracy + 0.08);
    expect(report.refitEce).toBeLessThan(report.frozenEce);
  });

  it("gains little when only a near-unused sensor moved", () => {
    const report = compareRefit(getStudy("wet-bulb"));
    expect(report.gain).toBeLessThan(0.08);
  });
});
