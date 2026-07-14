import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";

import {
  findHistorySessionRows,
  rolloverDailyWorkout,
} from "@/database/repositories/workoutSessionRepository";

vi.mock("@/database/database", () => ({ db: {} }));

function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE workout_session_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL
    );
    CREATE TABLE workout_sets (
      id TEXT PRIMARY KEY NOT NULL,
      session_exercise_id TEXT NOT NULL,
      weight REAL,
      repetitions INTEGER
    );
  `);
  const database = {
    async withExclusiveTransactionAsync(task: (transaction: {
      runAsync(source: string, values: (string | number | null)[]): Promise<unknown>;
      getFirstAsync<Row>(source: string, values: (string | number | null)[]): Promise<Row | null>;
    }) => Promise<void>) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        await task({
          runAsync: async (source, values) => sqlite.prepare(source).run(...values),
          getFirstAsync: async <Row>(source: string, values: (string | number | null)[]) => (
            (sqlite.prepare(source).get(...values) as Row | undefined) ?? null
          ),
        });
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { sqlite, database };
}

describe("daily workout rollover", () => {
  it("closes the previous day and reopens today’s logged workout for editing", async () => {
    const { sqlite, database } = createDatabase();
    const today = new Date(2026, 6, 14, 18, 30);
    sqlite.prepare("INSERT INTO workout_sessions VALUES (?, ?, ?, NULL, ?)").run(
      "yesterday", "active", new Date(2026, 6, 13, 23, 59).toISOString(), new Date(2026, 6, 13, 23, 59).toISOString(),
    );
    sqlite.prepare("INSERT INTO workout_sessions VALUES (?, ?, ?, ?, ?)").run(
      "today", "completed", new Date(2026, 6, 14, 0, 1).toISOString(), new Date(2026, 6, 14, 0, 5).toISOString(), new Date(2026, 6, 14, 0, 5).toISOString(),
    );
    sqlite.exec(`
      INSERT INTO workout_session_exercises VALUES ('yesterday-exercise', 'yesterday');
      INSERT INTO workout_session_exercises VALUES ('today-exercise', 'today');
      INSERT INTO workout_sets VALUES ('yesterday-set', 'yesterday-exercise', 80, 8);
      INSERT INTO workout_sets VALUES ('today-set', 'today-exercise', 82.5, 8);
    `);

    await rolloverDailyWorkout(database, today);

    expect(sqlite.prepare("SELECT status FROM workout_sessions WHERE id = 'yesterday'").get()).toEqual({ status: "completed" });
    expect(sqlite.prepare("SELECT status, completed_at FROM workout_sessions WHERE id = 'today'").get()).toEqual({ status: "active", completed_at: null });
    sqlite.close();
  });

  it("moves an empty workout from a previous day out of normal history", async () => {
    const { sqlite, database } = createDatabase();
    sqlite.prepare("INSERT INTO workout_sessions VALUES (?, ?, ?, NULL, ?)").run(
      "empty", "active", new Date(2026, 6, 13, 12).toISOString(), new Date(2026, 6, 13, 12).toISOString(),
    );
    sqlite.exec(`
      INSERT INTO workout_session_exercises VALUES ('empty-exercise', 'empty');
      INSERT INTO workout_sets VALUES ('empty-set', 'empty-exercise', NULL, NULL);
    `);

    await rolloverDailyWorkout(database, new Date(2026, 6, 14, 12));

    expect(sqlite.prepare("SELECT status, completed_at FROM workout_sessions WHERE id = 'empty'").get()).toEqual({ status: "abandoned", completed_at: null });
    sqlite.close();
  });
});

describe("workout history", () => {
  it("includes today and completed logged workouts while excluding empty and abandoned records", async () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(`
      CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL
      );
      CREATE TABLE workout_session_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL
      );
      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_exercise_id TEXT NOT NULL,
        weight REAL,
        repetitions INTEGER
      );

      INSERT INTO workout_sessions VALUES
        ('today', 'Today workout', 'active', '2026-07-14T12:00:00.000Z'),
        ('completed', 'Upper body', 'completed', '2026-07-13T12:00:00.000Z'),
        ('abandoned', 'Abandoned', 'abandoned', '2026-07-12T12:00:00.000Z'),
        ('empty', 'Empty', 'completed', '2026-07-11T12:00:00.000Z');
      INSERT INTO workout_session_exercises VALUES
        ('today-exercise', 'today', 'Bench Press'),
        ('completed-exercise', 'completed', 'Barbell Row'),
        ('abandoned-exercise', 'abandoned', 'Squat'),
        ('empty-exercise', 'empty', 'Pullup');
      INSERT INTO workout_sets VALUES
        ('today-set', 'today-exercise', 80, 8),
        ('completed-set', 'completed-exercise', 100, 5),
        ('abandoned-set', 'abandoned-exercise', 60, 10),
        ('empty-set', 'empty-exercise', NULL, NULL);
    `);
    const database = {
      async getAllAsync<Row>(source: string, values: string[]) {
        return sqlite.prepare(source).all(...values) as Row[];
      },
    };

    const rows = await findHistorySessionRows(database);
    expect(rows.map((row) => row.id)).toEqual(["today", "completed"]);
    expect((await findHistorySessionRows(database, "row")).map((row) => row.id)).toEqual(["completed"]);
    sqlite.close();
  });
});
