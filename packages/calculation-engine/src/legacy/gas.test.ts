import { describe, expect, it } from "vitest";

import { calculateLegacyGasTotal, getLegacyPgnEnergy } from "./gas.js";

describe("legacy gas characterization", () => {
  it.each([
    [0, 13.409],
    [100, 32.059],
    [200, 52.309],
  ])("matches baseline polynomial for load %d", (load, expected) => {
    expect(calculateLegacyGasTotal(load)).toBeCloseTo(expected, 10);
  });

  it.each([
    [0, 0],
    [1, 14.67],
    [2, 28.118],
    [3, 41.938],
    [4, 53.874],
  ] as const)("maps %d FGC to %f BBTUD", (fgc, expected) => {
    expect(getLegacyPgnEnergy(fgc)).toBe(expected);
  });

  it("rejects non-finite load", () => {
    expect(() => calculateLegacyGasTotal(Number.NaN)).toThrow(TypeError);
  });
});
