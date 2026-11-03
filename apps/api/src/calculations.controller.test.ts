import { UnprocessableEntityException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { CalculationsController } from "./calculations.controller.js";

describe("CalculationsController", () => {
  const controller = new CalculationsController();

  it("returns the complete versioned Gas Mix result", () => {
    const result = controller.calculateGasMix({ loadMw: 100, fgcCount: 2 });

    expect(result.input).toEqual({ loadMw: 100, fgcCount: 2 });
    expect(result.totalGasBbtud).toBeCloseTo(32.059, 10);
    expect(result.pheBbtud).toBeCloseTo(3.941, 10);
    expect(result.pgnBbtud).toBe(28.118);
    expect(result.gtNetMw).toBe(92);
    expect(result.stNetMw).toBeCloseTo(56.673, 10);
    expect(result.totalNetMw).toBeCloseTo(148.673, 10);
    expect(result.formulaVersion).toBe("legacy-characterization-v1");
  });

  it.each([
    [{ loadMw: -1, fgcCount: 2 }, "loadMw"],
    [{ loadMw: 100, fgcCount: 1.5 }, "fgcCount"],
    [{ loadMw: "abc", fgcCount: 2 }, "loadMw"],
  ])(
    "returns an explicit validation error for invalid input %#",
    (input, field) => {
      expect.assertions(3);

      try {
        controller.calculateGasMix(input);
      } catch (error) {
        expect(error).toBeInstanceOf(UnprocessableEntityException);
        const response = (error as UnprocessableEntityException).getResponse();
        expect(response).toMatchObject({ code: "VALIDATION_ERROR" });
        expect(response).toMatchObject({ fieldErrors: [{ field }] });
      }
    },
  );

  it("returns versioned evaluation metrics with source traceability", () => {
    const result = controller.calculateEvaluation({
      operationDate: "2026-03-11",
      mode: "COMBINED",
      loadMw: 100,
      fgcCount: 2,
      predictedGasBbtud: 100,
      actualGasBbtud: 110,
      predictionSource: {
        type: "GAS_MIX",
        formulaVersion: "legacy-characterization-v1",
      },
    });

    expect(result.absoluteErrorBbtud).toBe(10);
    expect(result.correctionFactor).toBe(1.1);
    expect(result.input.predictionSource).toEqual({
      type: "GAS_MIX",
      formulaVersion: "legacy-characterization-v1",
    });
    expect(result.formulaVersion).toBe("legacy-evaluation-characterization-v1");
  });

  it.each(["predictedGasBbtud", "actualGasBbtud"])(
    "rejects a zero %s for ratio metrics",
    (field) => {
      expect(() =>
        controller.calculateEvaluation({
          operationDate: "2026-03-11",
          mode: "OPEN",
          loadMw: 100,
          fgcCount: 0,
          predictedGasBbtud: 100,
          actualGasBbtud: 100,
          [field]: 0,
        }),
      ).toThrow(UnprocessableEntityException);
    },
  );

  it("returns a versioned tank conversion with master parameters", () => {
    const result = controller.calculateTank({
      tankCode: "RWT",
      inputType: "LEVEL",
      value: 11.445,
    });
    expect(result.status).toBe("CRITICAL");
    expect(result.overflowWarning).toBe(true);
    expect(result.definition.oflM).toBe(11.445);
    expect(result.formulaVersion).toBe("legacy-tank-characterization-v1");
  });

  it("rejects negative tank input explicitly", () => {
    expect(() =>
      controller.calculateTank({
        tankCode: "MWT",
        inputType: "VOLUME",
        value: -1,
      }),
    ).toThrow(UnprocessableEntityException);
  });
});
