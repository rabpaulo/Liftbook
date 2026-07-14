import { describe, expect, it } from "vitest";

import { formatRir, normalizeDecimal, normalizeInteger } from "@/utils/training-format";

describe("training input formatting", () => {
  it("normalizes decimal commas and periods", () => {
    expect(normalizeDecimal("22,5")).toBe(22.5);
    expect(normalizeDecimal("102.5")).toBe(102.5);
    expect(normalizeDecimal("1,2.3")).toBeNull();
    expect(normalizeDecimal("-1")).toBeNull();
  });

  it("accepts only non-negative integers for repetitions", () => {
    expect(normalizeInteger("0")).toBe(0);
    expect(normalizeInteger("8.5")).toBeNull();
  });

  it("uses the requested RIR labels", () => {
    expect([null, 0, 1, 2].map((value) => formatRir(value as null | 0 | 1 | 2))).toEqual(["?", "0", "1", "2+"]);
  });
});
