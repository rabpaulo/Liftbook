import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

import {
  migrateWorkoutSetCommentsIfNeeded,
  repairWorkoutSetForeignKeys,
  repairWorkoutSessionExerciseForeignKeys,
} from "@/database/database";

vi.mock("expo-sqlite", () => ({
  openDatabaseSync: () => ({}),
}));

vi.mock("@/utils/video-service", () => ({
  videoService: { removeMany: vi.fn() },
}));

describe("workout set comment migration", () => {
  it("adds the nullable column once without changing existing sets", async () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(`
      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        weight REAL,
        repetitions INTEGER,
        rir INTEGER,
        is_completed INTEGER NOT NULL,
        video_uri TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO workout_sets
        (id, weight, repetitions, rir, is_completed, video_uri, created_at, updated_at)
      VALUES ('existing-set', 82.5, 8, 1, 1, 'file:///set.mp4', 'created', 'updated');
    `);
    const database = {
      execAsync: async (source: string) => { sqlite.exec(source); },
      getAllAsync: async <Row>(source: string) => sqlite.prepare(source).all() as Row[],
    };

    await migrateWorkoutSetCommentsIfNeeded(database);
    await migrateWorkoutSetCommentsIfNeeded(database);

    expect(sqlite.prepare(
      "SELECT id, weight, repetitions, rir, is_completed, video_uri, created_at, updated_at, comment FROM workout_sets",
    ).get()).toEqual({
      id: "existing-set",
      weight: 82.5,
      repetitions: 8,
      rir: 1,
      is_completed: 1,
      video_uri: "file:///set.mp4",
      created_at: "created",
      updated_at: "updated",
      comment: null,
    });
    expect(sqlite.prepare("PRAGMA table_info(workout_sets)").all().filter((column) => (
      column as { name: string }
    ).name === "comment")).toHaveLength(1);
    sqlite.close();
  });
});

describe("workout session exercise foreign-key repair", () => {
  it("preserves workout data while repairing missing exercise and session references", async () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE exercises (id TEXT PRIMARY KEY NOT NULL);
      CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT,
        name TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE workout_session_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT,
        exercise_name TEXT NOT NULL,
        exercise_category TEXT NOT NULL,
        exercise_type TEXT NOT NULL,
        exercise_notes TEXT,
        position INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
      );
      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_exercise_id TEXT NOT NULL,
        weight REAL,
        repetitions INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE
      );

      INSERT INTO exercises (id) VALUES ('existing-exercise');
      INSERT INTO workout_sessions
        (id, name, notes, status, started_at, created_at, updated_at)
      VALUES
        ('existing-session', 'Existing workout', NULL, 'completed', '2026-01-01', '2026-01-01', '2026-01-01'),
        ('empty-recovery', 'Recovered workout', 'Recovered automatically from existing workout data.', 'completed', '2026-01-02', '2026-01-02', '2026-01-02');
      INSERT INTO workout_session_exercises
        (id, session_id, exercise_id, exercise_name, exercise_category, exercise_type, position)
      VALUES
        ('missing-exercise-link', 'existing-session', 'removed-exercise', 'Archived lift', 'Other', 'weight_reps', 0),
        ('missing-session-link', 'removed-session', 'existing-exercise', 'Bench Press', 'Chest', 'weight_reps', 0),
        ('blank-session-link', 'blank-session', 'existing-exercise', 'Bench Press', 'Chest', 'weight_reps', 0),
        ('empty-recovery-link', 'empty-recovery', 'existing-exercise', 'Bench Press', 'Chest', 'weight_reps', 0);
      INSERT INTO workout_sets
        (id, session_exercise_id, weight, repetitions, created_at, updated_at)
      VALUES
        ('preserved-set', 'missing-session-link', 80, 8, '2026-02-01', '2026-02-02'),
        ('blank-set', 'blank-session-link', NULL, NULL, '2026-03-01', '2026-03-02'),
        ('empty-recovery-set', 'empty-recovery-link', NULL, NULL, '2026-03-01', '2026-03-02');
      PRAGMA foreign_keys = ON;
    `);
    const database = {
      execAsync: async (source: string) => { sqlite.exec(source); },
      getAllAsync: async <Row>(source: string) => sqlite.prepare(source).all() as Row[],
    };

    await repairWorkoutSessionExerciseForeignKeys(database);
    await repairWorkoutSessionExerciseForeignKeys(database);

    expect(sqlite.prepare(
      "SELECT id, session_id, exercise_id, exercise_name FROM workout_session_exercises ORDER BY id",
    ).all()).toEqual([
      {
        id: "missing-exercise-link",
        session_id: "existing-session",
        exercise_id: null,
        exercise_name: "Archived lift",
      },
      {
        id: "missing-session-link",
        session_id: "removed-session",
        exercise_id: "existing-exercise",
        exercise_name: "Bench Press",
      },
    ]);
    expect(sqlite.prepare(
      "SELECT id, name, status, started_at, completed_at, created_at, updated_at FROM workout_sessions WHERE id = 'removed-session'",
    ).get()).toEqual({
      id: "removed-session",
      name: "Recovered workout",
      status: "completed",
      started_at: "2026-02-01",
      completed_at: "2026-02-02",
      created_at: "2026-02-01",
      updated_at: "2026-02-02",
    });
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM workout_sessions").get()).toEqual({ count: 2 });
    expect(sqlite.prepare("SELECT id FROM workout_sets").all()).toEqual([{ id: "preserved-set" }]);
    expect(sqlite.prepare("PRAGMA foreign_key_check(workout_session_exercises)").all()).toEqual([]);
    sqlite.close();
  });
});

describe("workout set foreign-key repair", () => {
  it("recovers logged sets and removes only empty orphan groups and their videos", async () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT,
        name TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE workout_session_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT,
        exercise_name TEXT NOT NULL,
        exercise_category TEXT NOT NULL,
        exercise_type TEXT NOT NULL,
        exercise_notes TEXT,
        position INTEGER NOT NULL,
        FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );
      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        weight REAL,
        repetitions INTEGER,
        rir INTEGER,
        comment TEXT,
        is_completed INTEGER NOT NULL,
        video_uri TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE
      );

      INSERT INTO workout_sets
        (id, session_exercise_id, position, weight, repetitions, rir, comment,
         is_completed, video_uri, created_at, updated_at)
      VALUES
        ('logged-orphan', 'missing-logged-exercise', 0, 90, 6, 1, 'Keep this', 1,
         'file:///keep.mp4', '2026-04-01', '2026-04-02'),
        ('blank-sibling', 'missing-logged-exercise', 1, NULL, NULL, NULL, 'Keep sibling', 0,
         NULL, '2026-04-01', '2026-04-03'),
        ('blank-orphan', 'missing-empty-exercise', 0, NULL, NULL, NULL, NULL, 0,
         'file:///remove.mp4', '2026-05-01', '2026-05-02'),
        ('partial-orphan', 'missing-empty-exercise', 1, 70, NULL, NULL, NULL, 0,
         NULL, '2026-05-01', '2026-05-03');
      PRAGMA foreign_keys = ON;
    `);
    const database = {
      execAsync: async (source: string) => { sqlite.exec(source); },
      getAllAsync: async <Row>(source: string) => sqlite.prepare(source).all() as Row[],
    };

    const removedVideoUris = await repairWorkoutSetForeignKeys(database);
    const secondRemovedVideoUris = await repairWorkoutSetForeignKeys(database);

    expect(removedVideoUris).toEqual(["file:///remove.mp4"]);
    expect(secondRemovedVideoUris).toEqual([]);
    expect(sqlite.prepare(
      "SELECT id, session_exercise_id, weight, repetitions, comment, video_uri FROM workout_sets ORDER BY position",
    ).all()).toEqual([
      {
        id: "logged-orphan",
        session_exercise_id: "missing-logged-exercise",
        weight: 90,
        repetitions: 6,
        comment: "Keep this",
        video_uri: "file:///keep.mp4",
      },
      {
        id: "blank-sibling",
        session_exercise_id: "missing-logged-exercise",
        weight: null,
        repetitions: null,
        comment: "Keep sibling",
        video_uri: null,
      },
    ]);
    expect(sqlite.prepare(
      "SELECT id, session_id, exercise_name FROM workout_session_exercises",
    ).get()).toEqual({
      id: "missing-logged-exercise",
      session_id: "recovered-set-session:missing-logged-exercise",
      exercise_name: "Recovered exercise",
    });
    expect(sqlite.prepare(
      "SELECT id, name, status, started_at, completed_at FROM workout_sessions",
    ).get()).toEqual({
      id: "recovered-set-session:missing-logged-exercise",
      name: "Recovered workout",
      status: "completed",
      started_at: "2026-04-01",
      completed_at: "2026-04-03",
    });
    expect(sqlite.prepare("PRAGMA foreign_key_check(workout_sets)").all()).toEqual([]);
    sqlite.close();
  });
});
