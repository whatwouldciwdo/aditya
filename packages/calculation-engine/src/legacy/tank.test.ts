import { describe, expect, it } from "vitest";

import { getLegacyTankStatus } from "./tank.js";

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
