import { describe, expect, it } from "vitest";

import {
  calculateLearning,
  calculateNomination,
  calculateRoh,
  calculateSimulation,
  NOMINATION_SLOTS,
  OPERATION_SLOTS,
  ROH_SLOTS,
} from "./operations.js";

describe("legacy operation calculations", () => {
  it("preserves the 24-hour simulation formula and linepack sequence", () => {
    const result = calculateSimulation({
      mode: "COMBINED",
      initialLinepack: 100,
      flowInPhe: 25,
      nominationPheBbtud: 20,
      rows: OPERATION_SLOTS.map(() => ({ loadMw: 230, fgcCount: 2 })),
    });

    expect(result.rows).toHaveLength(24);
    expect(result.rows[0]).toMatchObject({
      slot: "01:00",
      gtNetMw: 222,
      stNetMw: 116.98,
      totalNetMw: 338.98,
      pgnBbtud: 28.118,
      linepack: 100,
    });
    expect(result.rows[1]!.linepack).toBeCloseTo(
      100 - result.rows[0]!.flowPhe + 25,
      5,
    );
    expect(result.nominationWarnings.phe).toBe(true);
  });

  it("switches simulation net output for open cycle", () => {
    const result = calculateSimulation({
      mode: "OPEN",
      initialLinepack: 0,
      flowInPhe: 0,
      rows: OPERATION_SLOTS.map((_, index) => ({
        loadMw: index === 0 ? 100 : 0,
        fgcCount: 0,
      })),
    });
    expect(result.rows[0]).toMatchObject({
      gtNetMw: 99,
      stNetMw: 0,
      totalNetMw: 99,
    });
  });

  it("calculates ROH own-use deductions and gas split", () => {
    const result = calculateRoh({
      ownUseUnit: "GT11",
      rows: ROH_SLOTS.map((_, index) => ({
        gt11OpenMw: index === 0 ? 100 : 0,
        gt12OpenMw: index === 0 ? 90 : 0,
        gt11CombinedMw: 0,
        gt12CombinedMw: 0,
        fgcCount: index === 0 ? 2 : 0,
      })),
    });
    expect(result.rows).toHaveLength(48);
    expect(result.rows[0]).toMatchObject({
      slot: "00:30",
      gt11OpenNetMw: 99,
      gt12OpenNetMw: 89,
      stNetMw: 0,
      totalLoadMw: 188,
    });
    expect(result.rows[0]!.pgnBbtud).toBe(28.118);
    expect(result.rows[0]!.totalGasBbtud).toBeGreaterThan(0);
  });

  it("derives ROH steam-turbine netto from combined-cycle load", () => {
    const result = calculateRoh({
      ownUseUnit: "GT11",
      nominationPheBbtud: 1,
      rows: ROH_SLOTS.map((_, index) => ({
        gt11OpenMw: 0,
        gt12OpenMw: 0,
        gt11CombinedMw: index === 0 ? 100 : 0,
        gt12CombinedMw: index === 0 ? 90 : 0,
        fgcCount: 0 as const,
      })),
    });
    expect(result.rows[0]).toMatchObject({
      stNetMw: 102.6,
      gt11CombinedNetMw: 90,
      gt12CombinedNetMw: 89,
      totalLoadMw: 281.6,
    });
    expect(result.nominationWarnings.phe).toBe(true);
  });

  it("calculates nomination forecast totals", () => {
    const result = calculateNomination({
      submissionDate: "2026-03-11",
      effectiveDate: "2026-03-12",
      deliveryPoint: "A",
      receiptPoint: "B",
      dailySwapBbtud: 10,
      dailyStockBbtud: 5,
      rows: NOMINATION_SLOTS.map(() => ({ swapBbtud: 10, stockBbtud: 5 })),
    });
    expect(result.dailyTotalBbtud).toBe(15);
    expect(result.averageTotalBbtud).toBe(15);
    expect(result.rows[0]).toMatchObject({ slot: "00:00", totalBbtud: 15 });
  });

  it("uses comparable evaluation history for learning", () => {
    const history = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      createdAt: "2026-03-11T00:00:00.000Z",
      input: {
        operationDate: "2026-03-11",
        mode: "COMBINED" as const,
        loadMw: 225 + index,
        fgcCount: 3,
        predictedGasBbtud: 50,
        actualGasBbtud: 51,
      },
      result: {
        input: {
          operationDate: "2026-03-11",
          mode: "COMBINED" as const,
          loadMw: 225 + index,
          fgcCount: 3,
          predictedGasBbtud: 50,
          actualGasBbtud: 51,
        },
        absoluteErrorBbtud: 1,
        deviationPercent: 1.96,
        accuracyPercent: 98.04,
        correctionFactor: 1.02,
        signedBiasPercent: 2,
        formulaVersion: "test",
      },
    }));
    const result = calculateLearning(history, {
      mode: "COMBINED",
      loadMw: 230,
      fgcCount: 3,
      predictedGasBbtud: 60,
    });
    expect(result).toMatchObject({
      sampleCount: 5,
      learningFactor: 1.02,
      recommendedGasBbtud: 61.2,
      confidence: "MEDIUM",
    });
  });
});
