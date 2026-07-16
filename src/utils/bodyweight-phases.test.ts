import { describe, expect, it } from "vitest";

import {
  formatLocalDate,
  getActiveBodyweightPhase,
  getBodyweightPhasePlannedEnd,
  getBodyweightPhaseProgress,
  getBodyweightPhaseStatus,
  isValidBodyweightPhaseDraft,
  normalizeBodyweightPhaseDraft,
} from "@/utils/bodyweight-phases";
import type { BodyweightPhase } from "@/utils/bodyweight-types";

function phase(overrides: Partial<BodyweightPhase> = {}): BodyweightPhase {
  return {
    id: 1,
    name: "Cutting summer 2026",
    goal: "lose",
    weeklyTarget: 0.5,
    durationWeeks: 2,
    startedOn: "2026-07-15",
    endedOn: null,
    createdAt: "2026-07-15T12:00:00.000Z",
    updatedAt: "2026-07-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("bodyweight phases", () => {
  it("uses inclusive calendar-week boundaries", () => {
    const item = phase();

    expect(formatLocalDate(getBodyweightPhasePlannedEnd(item))).toBe("2026-07-28");
    expect(getBodyweightPhaseStatus(item, new Date(2026, 6, 15))).toBe("current");
    expect(getBodyweightPhaseStatus(item, new Date(2026, 6, 28))).toBe("current");
    expect(getBodyweightPhaseStatus(item, new Date(2026, 6, 29))).toBe("completed");
  });

  it("treats an explicitly ended phase as completed", () => {
    const item = phase({ endedOn: "2026-07-20" });
    expect(getBodyweightPhaseStatus(item, new Date(2026, 6, 20))).toBe("completed");
  });

  it("finds only the current phase and calculates its progress", () => {
    const expired = phase({ id: 1, startedOn: "2026-06-01", durationWeeks: 1 });
    const current = phase({ id: 2 });

    expect(getActiveBodyweightPhase([expired, current], new Date(2026, 6, 21))?.id).toBe(2);
    expect(getBodyweightPhaseProgress(current, new Date(2026, 6, 21))).toEqual({
      currentDay: 7,
      totalDays: 14,
      progress: 0.5,
    });
  });

  it("normalizes maintain phases to a zero weekly trend", () => {
    const draft = normalizeBodyweightPhaseDraft({
      name: "  Maintenance  ",
      goal: "maintain",
      weeklyTarget: 0.5,
      durationWeeks: 6.8,
    });

    expect(draft).toEqual({
      name: "Maintenance",
      goal: "maintain",
      weeklyTarget: 0,
      durationWeeks: 6,
    });
    expect(isValidBodyweightPhaseDraft(draft)).toBe(true);
  });

  it("rejects unnamed, unbounded, or non-positive trend phases", () => {
    expect(isValidBodyweightPhaseDraft({
      name: "",
      goal: "lose",
      weeklyTarget: 0.5,
      durationWeeks: 12,
    })).toBe(false);
    expect(isValidBodyweightPhaseDraft({
      name: "Too long",
      goal: "gain",
      weeklyTarget: 0,
      durationWeeks: 105,
    })).toBe(false);
  });
});

