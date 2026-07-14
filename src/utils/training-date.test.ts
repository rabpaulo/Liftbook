import { describe, expect, it } from "vitest";

import { localDayBounds } from "@/utils/training-date";

describe("daily workout date bounds", () => {
  it("uses local calendar boundaries instead of the workout time", () => {
    const { start, end } = localDayBounds(new Date(2026, 6, 14, 23, 59, 59));
    const startDate = new Date(start);
    const endDate = new Date(end);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(endDate.getHours()).toBe(0);
    expect(endDate.getDate()).toBe(new Date(2026, 6, 15).getDate());
  });
});
