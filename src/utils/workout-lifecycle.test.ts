import { describe, expect, it } from "vitest";

import type { WorkoutSessionDetail } from "@/utils/training-types";
import { DailyWorkoutExistsError, createWorkoutLifecycle, type WorkoutLifecycleRepository } from "@/utils/workout-lifecycle";

const now = new Date("2026-07-12T10:00:00.000Z");

function blankSession(id: string, name: string): WorkoutSessionDetail {
  return { id, templateId: null, name, notes: null, status: "active", startedAt: now.toISOString(), completedAt: null, createdAt: now.toISOString(), updatedAt: now.toISOString(), exercises: [] };
}

class MemoryRepository implements WorkoutLifecycleRepository {
  sessions: WorkoutSessionDetail[] = [];
  templateExerciseName = "Chest-Supported Row";
  copiedPreviousValues = false;

  async getToday() { return this.sessions.find((session) => session.status === "active") ?? null; }
  async startEmpty(name: string) {
    const session = blankSession(`session-${this.sessions.length + 1}`, name);
    this.sessions.push(session);
    return session;
  }
  async startFromTemplate(templateId: string, copyPreviousValues = false) {
    this.copiedPreviousValues = copyPreviousValues;
    const snapshotName = this.templateExerciseName;
    const session: WorkoutSessionDetail = {
      ...blankSession(`session-${this.sessions.length + 1}`, "Full Body 1"),
      templateId,
      exercises: [{
        id: "snapshot", sessionId: "session", exerciseId: "row", exerciseName: snapshotName,
        exerciseCategory: "Upper Back", exerciseType: "weight_reps", exerciseNotes: "Third pin",
        position: 0,
        sets: [0, 1, 2].map((position) => ({
          id: `set-${position}`, sessionExerciseId: "snapshot", position, weight: null, repetitions: null,
          rir: null, comment: null, isCompleted: false,
          videoUri: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
        })),
      }],
    };
    this.sessions.push(session);
    return session;
  }
}

describe("workout lifecycle", () => {
  it("starts and returns today’s workout", async () => {
    const repository = new MemoryRepository();
    const service = createWorkoutLifecycle(repository, () => now);
    const workout = await service.startEmptyWorkout();
    expect(workout.name).toContain("Workout");
    expect(await service.getTodayWorkout()).toBe(workout);
  });

  it("prevents a second workout on the same day", async () => {
    const repository = new MemoryRepository();
    const service = createWorkoutLifecycle(repository, () => now);
    await service.startEmptyWorkout("First");
    await expect(service.startEmptyWorkout("Second")).rejects.toBeInstanceOf(DailyWorkoutExistsError);
  });

  it("starts from a template with independent exercise and blank-set snapshots", async () => {
    const repository = new MemoryRepository();
    const service = createWorkoutLifecycle(repository, () => now);
    const workout = await service.startWorkoutFromTemplate("template-1");
    repository.templateExerciseName = "Renamed Row";
    expect(workout.exercises[0].exerciseName).toBe("Chest-Supported Row");
    expect(workout.exercises[0].sets).toHaveLength(3);
    expect(workout.exercises[0].sets.every((set) => !set.isCompleted && set.weight === null)).toBe(true);
  });

  it("passes the previous-value choice when starting from a template", async () => {
    const repository = new MemoryRepository();
    const service = createWorkoutLifecycle(repository, () => now);
    await service.startWorkoutFromTemplate("template-1", true);
    expect(repository.copiedPreviousValues).toBe(true);
  });

});
