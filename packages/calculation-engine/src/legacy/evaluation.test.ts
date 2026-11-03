import { describe, expect, it } from "vitest";

import { calculateLegacyEvaluation } from "./evaluation.js";

describe("calculateLegacyEvaluation", () => {
  it("mereproduksi metrik evaluasi baseline", () => {
    const result = calculateLegacyEvaluation({
      operationDate: "2026-03-11",
      mode: "COMBINED",
      loadMw: 100,
      fgcCount: 2,
      predictedGasBbtud: 100,
      actualGasBbtud: 110,
      predictionSource: { type: "GAS_MIX", formulaVersion: "test-v1" },
    });

    expect(result.absoluteErrorBbtud).toBe(10);
    expect(result.deviationPercent).toBeCloseTo(9.090909);
    expect(result.accuracyPercent).toBeCloseTo(90.909091);
    expect(result.correctionFactor).toBe(1.1);
    expect(result.signedBiasPercent).toBe(10);
  });

  it("membatasi accuracy minimal nol", () => {
    const result = calculateLegacyEvaluation({
      operationDate: "2026-03-11",
      mode: "OPEN",
      loadMw: 100,
      fgcCount: 0,
      predictedGasBbtud: 300,
      actualGasBbtud: 100,
    });

    expect(result.accuracyPercent).toBe(0);
    expect(result.signedBiasPercent).toBeCloseTo(-66.666667);
  });
});
