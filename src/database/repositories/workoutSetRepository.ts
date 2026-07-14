import { db } from "@/database/database";
import { mapSet, type SetRow } from "@/database/repositories/trainingMappers";
import type { WorkoutSet } from "@/utils/training-types";
import { createId } from "@/utils/training-id";
import { isValidRepetitionCount } from "@/utils/training-validation";

export type WorkoutSetUpdate = Partial<Pick<
  WorkoutSet,
  "weight" | "repetitions" | "rir" | "comment" | "videoUri"
>>;

const columns: Record<keyof WorkoutSetUpdate, string> = {
  weight: "weight",
  repetitions: "repetitions",
  rir: "rir",
  comment: "comment",
  videoUri: "video_uri",
};

function databaseValue(value: WorkoutSetUpdate[keyof WorkoutSetUpdate]) {
  return value ?? null;
}

export const workoutSetRepository = {
  async getById(id: string): Promise<WorkoutSet | null> {
    const row = await db.getFirstAsync<SetRow>("SELECT * FROM workout_sets WHERE id = ?", id);
    return row ? mapSet(row) : null;
  },

  async add(sessionExerciseId: string, copyWeight: number | null = null): Promise<WorkoutSet> {
    const position = await db.getFirstAsync<{ next_position: number }>(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM workout_sets WHERE session_exercise_id = ?",
      sessionExerciseId,
    );
    const id = createId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO workout_sets
       (id, session_exercise_id, position, weight, repetitions, rir, comment, is_completed, video_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, 0, NULL, ?, ?)`,
      [id, sessionExerciseId, position?.next_position ?? 0, copyWeight, now, now],
    );
    const result = await this.getById(id);
    if (!result) throw new Error("Could not create set.");
    return result;
  },

  async update(id: string, patch: WorkoutSetUpdate): Promise<WorkoutSet> {
    if (patch.repetitions !== undefined && !isValidRepetitionCount(patch.repetitions)) {
      throw new Error("A set must have at least 1 repetition.");
    }
    const entries = Object.entries(patch) as [keyof WorkoutSetUpdate, WorkoutSetUpdate[keyof WorkoutSetUpdate]][];
    if (entries.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error("Set not found.");
      return existing;
    }
    const assignments = entries.map(([key]) => `${columns[key]} = ?`);
    const values = entries.map(([key, value]) => (
      key === "comment" && typeof value === "string"
        ? value.trim() || null
        : databaseValue(value)
    ));
    const now = new Date().toISOString();
    let changes = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `UPDATE workout_sets SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`,
        [...values, now, id],
      );
      changes = result.changes;
      await db.runAsync(
        `UPDATE workout_sets
         SET is_completed = CASE WHEN weight IS NOT NULL AND repetitions > 0 THEN 1 ELSE 0 END
         WHERE id = ?`,
        id,
      );
    });
    if (changes === 0) throw new Error("Set not found.");
    const updated = await this.getById(id);
    if (!updated) throw new Error("Set not found.");
    return updated;
  },

  async remove(id: string) {
    const set = await this.getById(id);
    if (!set) return null;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM workout_sets WHERE id = ?", id);
      await transaction.runAsync(
        "UPDATE workout_sets SET position = position - 1 WHERE session_exercise_id = ? AND position > ?",
        [set.sessionExerciseId, set.position],
      );
    });
    return set.videoUri;
  },
};
