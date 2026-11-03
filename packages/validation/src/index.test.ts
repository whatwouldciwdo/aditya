import { describe, expect, it } from "vitest";

import { documentStatusSchema, gasMixInputSchema } from "./index.js";

describe("documentStatusSchema", () => {
  it.each(["DRAFT", "ARCHIVED"])("accepts %s", (status) => {
    expect(documentStatusSchema.parse(status)).toBe(status);
  });

  it.each(["SUBMITTED", "APPROVED", "REJECTED"])(
    "rejects legacy status %s",
    (status) => {
      expect(documentStatusSchema.safeParse(status).success).toBe(false);
    },
  );
});

describe("gasMixInputSchema", () => {
  it("accepts valid load and FGC values", () => {
    expect(gasMixInputSchema.parse({ loadMw: 100, fgcCount: 2 })).toEqual({
      loadMw: 100,
      fgcCount: 2,
    });
  });

  it.each([
    [{ loadMw: -1, fgcCount: 2 }, "Load turbin tidak boleh negatif."],
    [{ loadMw: 100, fgcCount: 1.5 }, "Jumlah FGC harus berupa bilangan bulat."],
    [{ loadMw: 100, fgcCount: 5 }, "Jumlah FGC maksimal 4 unit."],
  ])("rejects invalid input %#", (input, message) => {
    const result = gasMixInputSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(message);
  });
});
