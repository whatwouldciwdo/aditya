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
});
