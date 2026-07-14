import { describe, expect, it } from "vitest";

import type { WorkoutSessionDetail, WorkoutSet } from "@/utils/training-types";
import { isSetLogged, isValidRepetitionCount, isWorkoutEmpty } from "@/utils/training-validation";

const set: WorkoutSet = { id: "1", sessionExerciseId: "e", position: 0, weight: null, repetitions: null, rir: null, comment: null, isCompleted: true, videoUri: null, createdAt: "", updatedAt: "" };

describe("completed-set validation", () => {
  it("infers completion from logged performance", () => {
    expect(isSetLogged({ ...set, isCompleted: false, weight: 80, repetitions: 8 })).toBe(true);
    expect(isSetLogged({ ...set, isCompleted: true, weight: 80, repetitions: null })).toBe(false);
  });
  it("rejects sets with zero repetitions", () => {
    expect(isValidRepetitionCount(0)).toBe(false);
    expect(isSetLogged({ ...set, weight: 80, repetitions: 0 })).toBe(false);
  });
  it("treats workouts with only blank template sets as empty", () => {
    const workout: WorkoutSessionDetail = {
      id: "workout",
      templateId: "template",
      name: "Template workout",
      notes: null,
      status: "active",
      startedAt: "",
      completedAt: null,
      createdAt: "",
      updatedAt: "",
      exercises: [{
        id: "exercise",
        sessionId: "workout",
        exerciseId: "bench",
        exerciseName: "Bench Press",
        exerciseCategory: "Chest",
        exerciseType: "weight_reps",
        exerciseNotes: null,
        position: 0,
        sets: [{ ...set, isCompleted: false }],
      }],
    };
    expect(isWorkoutEmpty(workout)).toBe(true);
    workout.exercises[0].sets[0].weight = 80;
    workout.exercises[0].sets[0].repetitions = 8;
    expect(isWorkoutEmpty(workout)).toBe(false);
  });
});
