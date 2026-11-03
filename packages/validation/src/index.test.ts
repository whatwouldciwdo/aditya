import { describe, expect, it } from "vitest";

import { documentStatusSchema } from "./index.js";

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
