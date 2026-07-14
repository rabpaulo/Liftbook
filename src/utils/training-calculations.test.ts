import { describe, expect, it } from "vitest";

import type { WorkoutSessionDetail, WorkoutSet } from "@/utils/training-types";
import {
  calculateBestPerformance,
  calculateEstimatedOneRepMax,
  calculateSetPersonalRecords,
  calculateWorkoutSummary,
} from "@/utils/training-calculations";

const baseSet: WorkoutSet = {
  id: "set", sessionExerciseId: "exercise", position: 0, weight: null, repetitions: null, rir: null,
  comment: null, isCompleted: false, videoUri: null,
  createdAt: "2026-07-12T10:00:00.000Z", updatedAt: "2026-07-12T10:00:00.000Z",
};

describe("workout calculations", () => {
  it("calculates Epley estimated 1RM only for 1-12 reps and positive weight", () => {
    expect(calculateEstimatedOneRepMax(100, 5)).toBeCloseTo(116.667, 2);
    expect(calculateEstimatedOneRepMax(100, 13)).toBeNull();
    expect(calculateEstimatedOneRepMax(0, 5)).toBeNull();
  });

  it("calculates best resistance performance", () => {
    const best = calculateBestPerformance([
      { ...baseSet, id: "1", weight: 80, repetitions: 10, isCompleted: true },
      { ...baseSet, id: "2", weight: 90, repetitions: 5, isCompleted: true },
      { ...baseSet, id: "3", weight: 90, repetitions: 6, isCompleted: true },
    ]);
    expect(best.highestWeight).toBe(90);
  });

  it("marks strict weight and repetition personal records in set order", () => {
    const records = calculateSetPersonalRecords([
      { ...baseSet, id: "1", weight: 100, repetitions: 8, isCompleted: true },
      { ...baseSet, id: "2", weight: 100, repetitions: 10, isCompleted: true },
      { ...baseSet, id: "3", weight: 105, repetitions: 9, isCompleted: true },
      { ...baseSet, id: "4", weight: 110, repetitions: null, isCompleted: false },
    ], { highestWeight: 100, highestRepetitions: 8 });

    expect(records).toEqual([
      { weight: false, repetitions: false },
      { weight: false, repetitions: true },
      { weight: true, repetitions: false },
      { weight: false, repetitions: false },
    ]);
  });

  it("treats the first logged set as the initial personal record", () => {
    expect(calculateSetPersonalRecords([
      { ...baseSet, weight: 20, repetitions: 12, isCompleted: true },
    ])).toEqual([{ weight: true, repetitions: true }]);
  });

  it("summarizes logged resistance sets", () => {
    const session: WorkoutSessionDetail = {
      id: "session", templateId: null, name: "Upper", notes: null, status: "completed",
      startedAt: "2026-07-12T10:00:00.000Z", completedAt: "2026-07-12T11:00:00.000Z",
      createdAt: "2026-07-12T10:00:00.000Z", updatedAt: "2026-07-12T11:00:00.000Z",
      exercises: [
        { id: "strength", sessionId: "session", exerciseId: "row", exerciseName: "Row", exerciseCategory: "Back", exerciseType: "weight_reps", exerciseNotes: null, position: 0, sets: [{ ...baseSet, weight: 80, repetitions: 8, isCompleted: true }] },
      ],
    };
    const summary = calculateWorkoutSummary(session);
    expect(summary).toMatchObject({ completedResistanceSets: 1, completedSetCount: 1 });
  });
});
