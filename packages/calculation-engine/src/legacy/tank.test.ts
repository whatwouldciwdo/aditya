import { describe, expect, it } from "vitest";

import { calculateLegacyTank, getLegacyTankStatus } from "./tank.js";

describe("legacy tank status characterization", () => {
  it.each([
    [11, "NORMAL"],
    [11.295, "NWL"],
    [11.301, "HIGH"],
    [11.396, "WARNING"],
    [11.445, "CRITICAL"],
  ] as const)("maps RWT level %f to %s", (level, status) => {
    expect(getLegacyTankStatus("RWT", level)).toBe(status);
  });
});

describe("legacy tank calculation", () => {
  it("converts an RWT level to volume and capacity", () => {
    const result = calculateLegacyTank({
      tankCode: "RWT",
      inputType: "LEVEL",
      value: 11.295,
    });
    expect(result.volumeM3).toBeCloseTo(5499.998595, 6);
    expect(result.capacityPercent).toBeCloseTo(100, 4);
    expect(result.status).toBe("NWL");
    expect(result.definition.parameterVersion).toBe(
      "legacy-tank-parameters-v1",
    );
  });

  it("converts MWT volume to level and warns at OFL", () => {
    const result = calculateLegacyTank({
      tankCode: "MWT",
      inputType: "VOLUME",
      value: 15.117 * 167.034,
    });
    expect(result.levelM).toBeCloseTo(15.117, 10);
    expect(result.status).toBe("CRITICAL");
    expect(result.overflowWarning).toBe(true);
  });
});
