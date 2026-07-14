import { db } from "@/database/database";
import { exerciseRepository } from "@/database/repositories/exerciseRepository";
import {
  mapSession,
  mapSessionExercise,
  mapSet,
  type SessionExerciseRow,
  type SessionRow,
  type SetRow,
} from "@/database/repositories/trainingMappers";
import { workoutTemplateRepository } from "@/database/repositories/workoutTemplateRepository";
import type {
  Exercise,
  ExercisePersonalRecords,
  WorkoutHistoryItem,
  WorkoutSessionDetail,
  WorkoutStatus,
} from "@/utils/training-types";
import { calculateWorkoutSummary } from "@/utils/training-calculations";
import { createId } from "@/utils/training-id";
import { localDayBounds } from "@/utils/training-date";
import {
  buildTemplateSetSeeds,
  type PreviousTemplateSetValues,
} from "@/utils/template-set-prefill";

type PreviousTemplateSetRow = PreviousTemplateSetValues & {
  exercise_id: string;
};

type PersonalRecordRow = {
  highest_weight: number | null;
  highest_repetitions: number | null;
};

type HistoryListDatabase = {
  getAllAsync<Row>(source: string, values: string[]): Promise<Row[]>;
};

type DailyWorkoutTransaction = {
  runAsync(source: string, values: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<Row>(source: string, values: (string | number | null)[]): Promise<Row | null>;
};

type DailyWorkoutDatabase = {
  withExclusiveTransactionAsync(
    task: (transaction: DailyWorkoutTransaction) => Promise<void>,
  ): Promise<void>;
};

export async function rolloverDailyWorkout(
  database: DailyWorkoutDatabase,
  date = new Date(),
) {
  const bounds = localDayBounds(date);
  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `UPDATE workout_sessions
       SET status = CASE WHEN EXISTS (
         SELECT 1 FROM workout_session_exercises se
         JOIN workout_sets ws ON ws.session_exercise_id = se.id
         WHERE se.session_id = workout_sessions.id
           AND ws.weight IS NOT NULL
           AND ws.repetitions > 0
       ) THEN 'completed' ELSE 'abandoned' END,
       completed_at = CASE WHEN EXISTS (
         SELECT 1 FROM workout_session_exercises se
         JOIN workout_sets ws ON ws.session_exercise_id = se.id
         WHERE se.session_id = workout_sessions.id
           AND ws.weight IS NOT NULL
           AND ws.repetitions > 0
       ) THEN updated_at ELSE NULL END
       WHERE status = 'active' AND (started_at < ? OR started_at >= ?)`,
      [bounds.start, bounds.end],
    );

    const current = await transaction.getFirstAsync<{ id: string }>(
      `SELECT id FROM workout_sessions
       WHERE status = 'active' AND started_at >= ? AND started_at < ?
       LIMIT 1`,
      [bounds.start, bounds.end],
    );
    if (!current) {
      const completed = await transaction.getFirstAsync<{ id: string }>(
        `SELECT s.id FROM workout_sessions s
         WHERE s.status = 'completed'
           AND s.started_at >= ? AND s.started_at < ?
           AND EXISTS (
             SELECT 1 FROM workout_session_exercises se
             JOIN workout_sets ws ON ws.session_exercise_id = se.id
             WHERE se.session_id = s.id
               AND ws.weight IS NOT NULL
               AND ws.repetitions > 0
           )
         ORDER BY s.updated_at DESC LIMIT 1`,
        [bounds.start, bounds.end],
      );
      if (completed) {
        await transaction.runAsync(
          "UPDATE workout_sessions SET status = 'active', completed_at = NULL WHERE id = ?",
          [completed.id],
        );
      }
    }
  });
  return bounds;
}

async function loadDetail(row: SessionRow): Promise<WorkoutSessionDetail> {
  const exerciseRows = await db.getAllAsync<SessionExerciseRow>(
    "SELECT * FROM workout_session_exercises WHERE session_id = ? ORDER BY position",
    row.id,
  );
  const exercises = [];
  for (const exerciseRow of exerciseRows) {
    const setRows = await db.getAllAsync<SetRow>(
      "SELECT * FROM workout_sets WHERE session_exercise_id = ? ORDER BY position",
      exerciseRow.id,
    );
    exercises.push(mapSessionExercise(exerciseRow, setRows.map(mapSet)));
  }
  return { ...mapSession(row), exercises };
}

async function mapHistoryItems(rows: readonly SessionRow[]): Promise<WorkoutHistoryItem[]> {
  const result: WorkoutHistoryItem[] = [];
  for (const row of rows) {
    const detail = await loadDetail(row);
    const summary = calculateWorkoutSummary(detail);
    result.push({
      ...mapSession(row),
      exerciseCount: summary.exerciseCount,
      completedSetCount: summary.completedSetCount,
    });
  }
  return result;
}

export async function findHistorySessionRows(
  database: HistoryListDatabase,
  search = "",
): Promise<SessionRow[]> {
  const conditions = [
    "s.status IN ('active', 'completed')",
    `EXISTS (
      SELECT 1 FROM workout_session_exercises se
      JOIN workout_sets ws ON ws.session_exercise_id = se.id
      WHERE se.session_id = s.id
        AND ws.weight IS NOT NULL
        AND ws.repetitions > 0
    )`,
  ];
  const values: string[] = [];
  if (search.trim()) {
    conditions.push(`(s.name LIKE ? COLLATE NOCASE OR EXISTS (
      SELECT 1 FROM workout_session_exercises se
      WHERE se.session_id = s.id AND se.exercise_name LIKE ? COLLATE NOCASE
    ))`);
    values.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  return database.getAllAsync<SessionRow>(
    `SELECT s.* FROM workout_sessions s
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.started_at DESC`,
    values,
  );
}

export const workoutSessionRepository = {
  async getById(id: string): Promise<WorkoutSessionDetail | null> {
    const row = await db.getFirstAsync<SessionRow>("SELECT * FROM workout_sessions WHERE id = ?", id);
    return row ? loadDetail(row) : null;
  },

  async getToday(date = new Date()): Promise<WorkoutSessionDetail | null> {
    const { start, end } = await rolloverDailyWorkout(db, date);
    const row = await db.getFirstAsync<SessionRow>(
      `SELECT * FROM workout_sessions
       WHERE status = 'active' AND started_at >= ? AND started_at < ?
       ORDER BY updated_at DESC LIMIT 1`,
      [start, end],
    );
    return row ? loadDetail(row) : null;
  },

  async listHistory(search = ""): Promise<WorkoutHistoryItem[]> {
    await this.getToday();
    const rows = await findHistorySessionRows(db, search);
    return mapHistoryItems(rows);
  },

  async workoutToday(date = new Date()): Promise<WorkoutHistoryItem | null> {
    const detail = await this.getToday(date);
    if (!detail) return null;
    const summary = calculateWorkoutSummary(detail);
    if (summary.completedSetCount === 0) return null;
    return {
      ...detail,
      exerciseCount: summary.exerciseCount,
      completedSetCount: summary.completedSetCount,
    };
  },

  async startEmpty(name: string, startedAt = new Date()): Promise<WorkoutSessionDetail> {
    const existing = await this.getToday(startedAt);
    if (existing) throw new Error("A workout already exists for today.");
    const id = createId();
    const now = startedAt.toISOString();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO workout_sessions
         (id, template_id, name, notes, status, started_at, completed_at, created_at, updated_at)
         VALUES (?, NULL, ?, NULL, 'active', ?, NULL, ?, ?)`,
        [id, name.trim(), now, now, now],
      );
    });
    const result = await this.getById(id);
    if (!result) throw new Error("Could not start workout.");
    return result;
  },

  async startFromTemplate(
    templateId: string,
    copyPreviousValues = false,
    startedAt = new Date(),
  ): Promise<WorkoutSessionDetail> {
    const existing = await this.getToday(startedAt);
    if (existing) throw new Error("A workout already exists for today.");
    const template = await workoutTemplateRepository.getById(templateId);
    if (!template) throw new Error("Template not found.");
    const previousSetsByExercise = new Map<string, PreviousTemplateSetValues[]>();
    if (copyPreviousValues) {
      const previousSession = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM workout_sessions
         WHERE template_id = ? AND status = 'completed'
         ORDER BY COALESCE(completed_at, started_at) DESC, started_at DESC
         LIMIT 1`,
        templateId,
      );
      if (previousSession) {
        const previousRows = await db.getAllAsync<PreviousTemplateSetRow>(
          `SELECT se.exercise_id, ws.position, ws.weight, ws.repetitions, ws.rir
           FROM workout_session_exercises se
           JOIN workout_sets ws ON ws.session_exercise_id = se.id
           WHERE se.session_id = ?
             AND se.exercise_id IS NOT NULL
             AND ws.weight IS NOT NULL
             AND ws.repetitions > 0
           ORDER BY se.position, ws.position`,
          previousSession.id,
        );
        for (const row of previousRows) {
          const values = previousSetsByExercise.get(row.exercise_id) ?? [];
          values.push({
            position: row.position,
            weight: row.weight,
            repetitions: row.repetitions,
            rir: row.rir,
          });
          previousSetsByExercise.set(row.exercise_id, values);
        }
      }
    }
    const id = createId();
    const now = startedAt.toISOString();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO workout_sessions
         (id, template_id, name, notes, status, started_at, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, NULL, ?, ?)`,
        [id, template.id, template.name, template.notes, now, now, now],
      );
      for (const item of template.exercises) {
        const sessionExerciseId = createId();
        await transaction.runAsync(
          `INSERT INTO workout_session_exercises
           (id, session_id, exercise_id, exercise_name, exercise_category, exercise_type, exercise_notes, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionExerciseId,
            id,
            item.exercise.id,
            item.exercise.name,
            item.exercise.category,
            item.exercise.type,
            item.notesOverride ?? item.exercise.notes,
            item.position,
          ],
        );
        const setSeeds = buildTemplateSetSeeds(
          item.defaultSetCount,
          previousSetsByExercise.get(item.exercise.id) ?? [],
          copyPreviousValues,
        );
        for (const seed of setSeeds) {
          await transaction.runAsync(
            `INSERT INTO workout_sets
             (id, session_exercise_id, position, weight, repetitions, rir, comment, is_completed, video_uri, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)`,
            [
              createId(),
              sessionExerciseId,
              seed.position,
              seed.weight,
              seed.repetitions,
              seed.rir,
              seed.weight !== null && seed.repetitions !== null ? 1 : 0,
              now,
              now,
            ],
          );
        }
      }
    });
    const result = await this.getById(id);
    if (!result) throw new Error("Could not start workout.");
    return result;
  },

  async update(id: string, patch: { name?: string; notes?: string | null }) {
    const assignments: string[] = [];
    const values: (string | null)[] = [];
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new Error("Workout name is required.");
      assignments.push("name = ?");
      values.push(patch.name.trim());
    }
    if (patch.notes !== undefined) {
      assignments.push("notes = ?");
      values.push(patch.notes?.trim() || null);
    }
    if (assignments.length === 0) return;
    assignments.push("updated_at = ?");
    values.push(new Date().toISOString(), id);
    await db.runAsync(`UPDATE workout_sessions SET ${assignments.join(", ")} WHERE id = ?`, values);
  },

  async addExercise(sessionId: string, exerciseOrId: Exercise | string) {
    const exercise = typeof exerciseOrId === "string" ? await exerciseRepository.findById(exerciseOrId) : exerciseOrId;
    if (!exercise) throw new Error("Exercise not found.");
    const session = await this.getById(sessionId);
    if (!session || session.status !== "active") throw new Error("Today’s workout not found.");
    if (session.exercises.some((item) => item.exerciseId === exercise.id)) {
      throw new Error(`${exercise.name} is already in this workout.`);
    }
    const sessionExerciseId = createId();
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO workout_session_exercises
         (id, session_id, exercise_id, exercise_name, exercise_category, exercise_type, exercise_notes, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionExerciseId, sessionId, exercise.id, exercise.name, exercise.category, exercise.type, exercise.notes, session.exercises.length],
      );
      await transaction.runAsync(
        `INSERT INTO workout_sets
         (id, session_exercise_id, position, weight, repetitions, rir, comment, is_completed, video_uri, created_at, updated_at)
         VALUES (?, ?, 0, NULL, NULL, NULL, NULL, 0, NULL, ?, ?)`,
        [createId(), sessionExerciseId, now, now],
      );
    });
  },

  async updateExerciseNotes(id: string, notes: string | null) {
    await db.runAsync("UPDATE workout_session_exercises SET exercise_notes = ? WHERE id = ?", [notes?.trim() || null, id]);
  },

  async removeExercise(id: string) {
    const row = await db.getFirstAsync<{ session_id: string; position: number }>(
      "SELECT session_id, position FROM workout_session_exercises WHERE id = ?",
      id,
    );
    if (!row) return [];
    const videoRows = await db.getAllAsync<{ video_uri: string }>(
      "SELECT video_uri FROM workout_sets WHERE session_exercise_id = ? AND video_uri IS NOT NULL",
      id,
    );
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM workout_session_exercises WHERE id = ?", id);
      await transaction.runAsync(
        "UPDATE workout_session_exercises SET position = position - 1 WHERE session_id = ? AND position > ?",
        [row.session_id, row.position],
      );
    });
    return videoRows.map((video) => video.video_uri);
  },

  async reorderExercises(sessionId: string, orderedIds: readonly string[]) {
    const session = await db.getFirstAsync<{ status: WorkoutStatus }>(
      "SELECT status FROM workout_sessions WHERE id = ?",
      sessionId,
    );
    if (!session || session.status !== "active") throw new Error("Today’s workout not found.");

    const rows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_session_exercises WHERE session_id = ?",
      sessionId,
    );
    const existingIds = new Set(rows.map((row) => row.id));
    const orderedIdSet = new Set(orderedIds);
    if (
      orderedIds.length !== existingIds.size
      || orderedIdSet.size !== existingIds.size
      || orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new Error("Exercise order is out of date.");
    }

    await db.withExclusiveTransactionAsync(async (transaction) => {
      const sessionUpdate = await transaction.runAsync(
        "UPDATE workout_sessions SET updated_at = ? WHERE id = ? AND status = 'active'",
        [new Date().toISOString(), sessionId],
      );
      if (sessionUpdate.changes === 0) throw new Error("Today’s workout not found.");
      for (const [position, exerciseId] of orderedIds.entries()) {
        const result = await transaction.runAsync(
          "UPDATE workout_session_exercises SET position = ? WHERE id = ? AND session_id = ?",
          [position, exerciseId, sessionId],
        );
        if (result.changes === 0) throw new Error("Exercise order is out of date.");
      }
    });
  },

  async previousPerformance(exerciseId: string, before: string) {
    const previousSession = await db.getFirstAsync<{ id: string }>(
      `SELECT s.id FROM workout_sessions s
       JOIN workout_session_exercises se ON se.session_id = s.id
       WHERE s.status = 'completed' AND se.exercise_id = ? AND s.started_at < ?
       ORDER BY s.started_at DESC LIMIT 1`,
      [exerciseId, before],
    );
    if (!previousSession) return [];
    const rows = await db.getAllAsync<SetRow>(
      `SELECT ws.* FROM workout_sets ws
       JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
       WHERE se.session_id = ? AND se.exercise_id = ? AND ws.is_completed = 1
       ORDER BY ws.position`,
      [previousSession.id, exerciseId],
    );
    return rows.map(mapSet);
  },

  async personalRecordsBefore(
    exerciseId: string,
    before: string,
  ): Promise<ExercisePersonalRecords> {
    const row = await db.getFirstAsync<PersonalRecordRow>(
      `SELECT MAX(ws.weight) AS highest_weight,
              MAX(ws.repetitions) AS highest_repetitions
       FROM workout_sets ws
       JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
       JOIN workout_sessions s ON s.id = se.session_id
       WHERE s.status = 'completed'
         AND s.started_at < ?
         AND se.exercise_id = ?
         AND ws.is_completed = 1
         AND ws.weight IS NOT NULL
         AND ws.repetitions > 0`,
      [before, exerciseId],
    );
    return {
      highestWeight: row?.highest_weight ?? null,
      highestRepetitions: row?.highest_repetitions ?? null,
    };
  },

  async delete(id: string) {
    const videoRows = await db.getAllAsync<{ video_uri: string }>(
      `SELECT ws.video_uri FROM workout_sets ws
       JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
       WHERE se.session_id = ? AND ws.video_uri IS NOT NULL`,
      id,
    );
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM workout_sessions WHERE id = ?", id);
    });
    return videoRows.map((row) => row.video_uri);
  },

  async duplicateForToday(id: string, prefill = false) {
    const source = await this.getById(id);
    if (!source) throw new Error("Workout not found.");
    const current = await this.getToday();
    if (current) throw new Error("A workout already exists for today.");
    const sessionId = createId();
    const now = new Date().toISOString();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO workout_sessions
         (id, template_id, name, notes, status, started_at, completed_at, created_at, updated_at)
         VALUES (?, NULL, ?, ?, 'active', ?, NULL, ?, ?)`,
        [sessionId, source.name, source.notes, now, now, now],
      );
      for (const exercise of source.exercises) {
        const exerciseId = createId();
        await transaction.runAsync(
          `INSERT INTO workout_session_exercises
           (id, session_id, exercise_id, exercise_name, exercise_category, exercise_type, exercise_notes, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [exerciseId, sessionId, exercise.exerciseId, exercise.exerciseName, exercise.exerciseCategory, exercise.exerciseType, exercise.exerciseNotes, exercise.position],
        );
        for (const set of exercise.sets) {
          const isCompleted = prefill && set.weight !== null && set.repetitions !== null;
          await transaction.runAsync(
            `INSERT INTO workout_sets
             (id, session_exercise_id, position, weight, repetitions, rir, comment, is_completed, video_uri, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
            [
              createId(), exerciseId, set.position,
              prefill ? set.weight : null, prefill ? set.repetitions : null, prefill ? set.rir : null,
              prefill ? set.comment : null, isCompleted ? 1 : 0, now, now,
            ],
          );
        }
      }
    });
    const result = await this.getById(sessionId);
    if (!result) throw new Error("Could not duplicate workout.");
    return result;
  },

  async saveAsTemplate(id: string, replaceTemplateId?: string) {
    const source = await this.getById(id);
    if (!source) throw new Error("Workout not found.");
    if (replaceTemplateId) await workoutTemplateRepository.delete(replaceTemplateId);
    const template = await workoutTemplateRepository.create(source.name, source.notes);
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const exercise of source.exercises) {
        if (!exercise.exerciseId) continue;
        await transaction.runAsync(
          `INSERT INTO workout_template_exercises
           (id, template_id, exercise_id, position, default_set_count, notes_override)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [createId(), template.id, exercise.exerciseId, exercise.position, Math.max(1, exercise.sets.length), exercise.exerciseNotes],
        );
      }
    });
    return workoutTemplateRepository.getById(template.id);
  },
};
