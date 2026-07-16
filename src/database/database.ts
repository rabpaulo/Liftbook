import * as SQLite from "expo-sqlite";

import { videoService } from "@/utils/video-service";

export const db = SQLite.openDatabaseSync("liftbook.db");

type ExerciseTableColumn = {
  name: string;
  type: string;
  notnull?: number;
};

type ForeignKeyViolationRow = {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
};

type SchemaMigrationDatabase = {
  execAsync(source: string): Promise<void>;
  getAllAsync<Row>(source: string): Promise<Row[]>;
};

const REQUIRED_EXERCISE_COLUMNS = [
  "id",
  "name",
  "notes",
  "category",
  "type",
  "is_archived",
  "created_at",
  "updated_at",
] as const;

const BODYWEIGHT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS bodyweight (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    image_uri TEXT
  );

  CREATE TABLE IF NOT EXISTS bodyweight_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    goal TEXT NOT NULL DEFAULT 'maintain',
    weekly_target REAL NOT NULL DEFAULT 0.5,
    weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK(weight_unit IN ('kg', 'lbs'))
  );

  CREATE TABLE IF NOT EXISTS bodyweight_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
    goal TEXT NOT NULL CHECK(goal IN ('lose', 'maintain', 'gain')),
    weekly_target REAL NOT NULL CHECK(weekly_target >= 0),
    duration_weeks INTEGER NOT NULL CHECK(duration_weeks BETWEEN 1 AND 104),
    started_on TEXT NOT NULL,
    ended_on TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bodyweight_phases_started_on
    ON bodyweight_phases(started_on DESC, id DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bodyweight_phases_single_open
    ON bodyweight_phases((1)) WHERE ended_on IS NULL;
`;

const APP_SETTINGS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme_preference TEXT NOT NULL DEFAULT 'system'
      CHECK(theme_preference IN ('system', 'light', 'dark'))
  );
`;

const EXERCISES_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type = 'weight_reps'),
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const TRAINING_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS workout_templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    default_set_count INTEGER CHECK(default_set_count IS NULL OR default_set_count > 0),
    notes_override TEXT,
    FOREIGN KEY(template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT,
    name TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'abandoned')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    exercise_id TEXT,
    exercise_name TEXT NOT NULL,
    exercise_category TEXT NOT NULL,
    exercise_type TEXT NOT NULL CHECK(exercise_type = 'weight_reps'),
    exercise_notes TEXT,
    position INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    weight REAL,
    repetitions INTEGER CHECK(repetitions IS NULL OR repetitions > 0),
    rir INTEGER CHECK(rir IS NULL OR rir IN (0, 1, 2)),
    comment TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    video_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status);
  CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_session_exercises_session_position ON workout_session_exercises(session_id, position);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_position ON workout_sets(session_exercise_id, position);
  CREATE INDEX IF NOT EXISTS idx_template_exercises_template_position ON workout_template_exercises(template_id, position);
  CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_workout_sessions_single_active
    ON workout_sessions(status) WHERE status = 'active';
`;

const DEFAULT_EXERCISES_SQL = `
  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-bench-press', 'Bench Press', NULL, 'Chest', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Bench Press' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-squat', 'Squat', NULL, 'Quads', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Squat' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-pullup', 'Pullup', NULL, 'Lats', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pullup' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-barbell-row', 'Barbell Row', NULL, 'Upper Back', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Barbell Row' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-leg-extension', 'Leg Extension', NULL, 'Quads', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Extension' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-seated-leg-curl', 'Seated Leg Curl', NULL, 'Hamstrings', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Seated Leg Curl' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-lying-leg-curl', 'Lying Leg Curl', NULL, 'Hamstrings', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Lying Leg Curl' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-barbell-curl', 'Barbell Curl', NULL, 'Biceps', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Barbell Curl' COLLATE NOCASE);

  INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
  SELECT 'default-triceps-extension', 'Triceps Extension', NULL, 'Triceps', 'weight_reps', 0,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Triceps Extension' COLLATE NOCASE);
`;

const NORMALIZE_SET_COMPLETION_SQL = `
  UPDATE workout_sets
  SET is_completed = CASE WHEN weight IS NOT NULL AND repetitions > 0 THEN 1 ELSE 0 END;
`;

const REMOVE_LEGACY_NON_RESISTANCE_DATA_SQL = `
  DELETE FROM workout_template_exercises
  WHERE exercise_id IN (SELECT id FROM exercises WHERE type != 'weight_reps');

  DELETE FROM workout_session_exercises
  WHERE exercise_type != 'weight_reps';

  DELETE FROM exercises WHERE type != 'weight_reps';
`;

let initialization: Promise<void> | null = null;

function exerciseTableNeedsRebuild(columns: readonly ExerciseTableColumn[]) {
  const names = new Set(columns.map((column) => column.name));
  const idColumn = columns.find((column) => column.name === "id");
  return REQUIRED_EXERCISE_COLUMNS.some((name) => !names.has(name)) || idColumn?.type.toUpperCase() !== "TEXT";
}

async function rebuildLegacyExercisesTableIfNeeded() {
  const columns = await db.getAllAsync<ExerciseTableColumn>("PRAGMA table_info(exercises)");
  if (!exerciseTableNeedsRebuild(columns)) return;

  const names = new Set(columns.map((column) => column.name));
  if (!names.has("id") || !names.has("name")) {
    throw new Error("The legacy exercises table does not contain the required id and name fields.");
  }

  const notes = names.has("notes") ? "CAST(notes AS TEXT)" : "NULL";
  const category = names.has("category")
    ? "COALESCE(NULLIF(TRIM(CAST(category AS TEXT)), ''), 'Other')"
    : names.has("muscle_group")
      ? "COALESCE(NULLIF(TRIM(CAST(muscle_group AS TEXT)), ''), 'Other')"
      : "'Other'";
  const type = "'weight_reps'";
  const resistanceOnly = names.has("type") ? "WHERE type = 'weight_reps'" : "";
  const archived = names.has("is_archived") ? "CASE WHEN is_archived = 1 THEN 1 ELSE 0 END" : "0";
  const createdAt = names.has("created_at")
    ? "COALESCE(NULLIF(CAST(created_at AS TEXT), ''), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"
    : "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
  const updatedAt = names.has("updated_at")
    ? "COALESCE(NULLIF(CAST(updated_at AS TEXT), ''), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))"
    : createdAt;

  await db.execAsync("PRAGMA foreign_keys = OFF");
  try {
    await db.execAsync(`
      BEGIN IMMEDIATE;
      DROP TABLE IF EXISTS exercises_schema_upgrade;
      CREATE TABLE exercises_schema_upgrade (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        category TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type = 'weight_reps'),
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO exercises_schema_upgrade
        (id, name, notes, category, type, is_archived, created_at, updated_at)
      SELECT
        CAST(id AS TEXT),
        COALESCE(NULLIF(TRIM(CAST(name AS TEXT)), ''), 'Exercise ' || CAST(id AS TEXT)),
        ${notes},
        ${category},
        ${type},
        ${archived},
        ${createdAt},
        ${updatedAt}
      FROM exercises
      ${resistanceOnly};
      DROP TABLE exercises;
      ALTER TABLE exercises_schema_upgrade RENAME TO exercises;
      CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE);
      COMMIT;
    `);
  } catch (error) {
    try {
      await db.execAsync("ROLLBACK");
    } catch {
      // SQLite may already have rolled back the transaction.
    }
    throw error;
  } finally {
    await db.execAsync("PRAGMA foreign_keys = ON");
  }
}

async function rebuildTemplateExercisesTableIfNeeded() {
  const columns = await db.getAllAsync<ExerciseTableColumn>(
    "PRAGMA table_info(workout_template_exercises)",
  );
  const setCountColumn = columns.find((column) => column.name === "default_set_count");
  if (!setCountColumn || setCountColumn.notnull !== 1) return;

  await db.execAsync("PRAGMA foreign_keys = OFF");
  try {
    await db.execAsync(`
      BEGIN IMMEDIATE;
      DROP TABLE IF EXISTS workout_template_exercises_optional_sets;
      CREATE TABLE workout_template_exercises_optional_sets (
        id TEXT PRIMARY KEY NOT NULL,
        template_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        default_set_count INTEGER CHECK(default_set_count IS NULL OR default_set_count > 0),
        notes_override TEXT,
        FOREIGN KEY(template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id)
      );
      INSERT INTO workout_template_exercises_optional_sets
        (id, template_id, exercise_id, position, default_set_count, notes_override)
      SELECT id, template_id, exercise_id, position, default_set_count, notes_override
      FROM workout_template_exercises;
      DROP TABLE workout_template_exercises;
      ALTER TABLE workout_template_exercises_optional_sets RENAME TO workout_template_exercises;
      CREATE INDEX idx_template_exercises_template_position
        ON workout_template_exercises(template_id, position);
      COMMIT;
    `);
  } catch (error) {
    try {
      await db.execAsync("ROLLBACK");
    } catch {
      // SQLite may already have rolled back the transaction.
    }
    throw error;
  } finally {
    await db.execAsync("PRAGMA foreign_keys = ON");
  }
}

export async function migrateWorkoutSetCommentsIfNeeded(database: SchemaMigrationDatabase = db) {
  const columns = await database.getAllAsync<ExerciseTableColumn>("PRAGMA table_info(workout_sets)");
  if (columns.some((column) => column.name === "comment")) return;
  await database.execAsync("ALTER TABLE workout_sets ADD COLUMN comment TEXT");
}

export async function ensureBodyweightSchema(database: SchemaMigrationDatabase = db) {
  await database.execAsync(BODYWEIGHT_SCHEMA_SQL);
  const bodyweightSettingsColumns = await database.getAllAsync<ExerciseTableColumn>(
    "PRAGMA table_info(bodyweight_settings)",
  );
  if (!bodyweightSettingsColumns.some((column) => column.name === "weight_unit")) {
    await database.execAsync(
      "ALTER TABLE bodyweight_settings ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK(weight_unit IN ('kg', 'lbs'))",
    );
  }
}

export async function repairWorkoutSetForeignKeys(
  database: SchemaMigrationDatabase = db,
) {
  const removedVideoRows = await database.getAllAsync<{ video_uri: string }>(`
    SELECT orphan_set.video_uri
    FROM workout_sets orphan_set
    LEFT JOIN workout_session_exercises session_exercise
      ON session_exercise.id = orphan_set.session_exercise_id
    WHERE session_exercise.id IS NULL
      AND orphan_set.video_uri IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM workout_sets related_set
        WHERE related_set.session_exercise_id = orphan_set.session_exercise_id
          AND related_set.weight IS NOT NULL
          AND related_set.repetitions > 0
      )
  `);

  await database.execAsync(`
    INSERT INTO workout_sessions
      (id, template_id, name, notes, status, started_at, completed_at, created_at, updated_at)
    SELECT
      'recovered-set-session:' || orphan_set.session_exercise_id,
      NULL,
      'Recovered workout',
      'Recovered automatically from existing workout data.',
      'completed',
      MIN(orphan_set.created_at),
      MAX(orphan_set.updated_at),
      MIN(orphan_set.created_at),
      MAX(orphan_set.updated_at)
    FROM workout_sets orphan_set
    LEFT JOIN workout_session_exercises session_exercise
      ON session_exercise.id = orphan_set.session_exercise_id
    WHERE session_exercise.id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM workout_sessions existing_session
        WHERE existing_session.id = 'recovered-set-session:' || orphan_set.session_exercise_id
      )
    GROUP BY orphan_set.session_exercise_id
    HAVING SUM(
      CASE WHEN orphan_set.weight IS NOT NULL AND orphan_set.repetitions > 0 THEN 1 ELSE 0 END
    ) > 0;

    INSERT INTO workout_session_exercises
      (id, session_id, exercise_id, exercise_name, exercise_category, exercise_type,
       exercise_notes, position)
    SELECT
      orphan_set.session_exercise_id,
      'recovered-set-session:' || orphan_set.session_exercise_id,
      NULL,
      'Recovered exercise',
      'Other',
      'weight_reps',
      'Recovered automatically from existing set data.',
      0
    FROM workout_sets orphan_set
    LEFT JOIN workout_session_exercises session_exercise
      ON session_exercise.id = orphan_set.session_exercise_id
    WHERE session_exercise.id IS NULL
      AND EXISTS (
        SELECT 1
        FROM workout_sets related_set
        WHERE related_set.session_exercise_id = orphan_set.session_exercise_id
          AND related_set.weight IS NOT NULL
          AND related_set.repetitions > 0
      )
    GROUP BY orphan_set.session_exercise_id;

    DELETE FROM workout_sets
    WHERE NOT EXISTS (
      SELECT 1
      FROM workout_session_exercises
      WHERE workout_session_exercises.id = workout_sets.session_exercise_id
    );
  `);

  return removedVideoRows.map((row) => row.video_uri);
}

export async function repairWorkoutSessionExerciseForeignKeys(
  database: SchemaMigrationDatabase = db,
) {
  await database.execAsync(`
    DELETE FROM workout_sessions
    WHERE name = 'Recovered workout'
      AND notes = 'Recovered automatically from existing workout data.'
      AND NOT EXISTS (
        SELECT 1
        FROM workout_session_exercises recovered_exercise
        JOIN workout_sets recovered_set
          ON recovered_set.session_exercise_id = recovered_exercise.id
        WHERE recovered_exercise.session_id = workout_sessions.id
          AND recovered_set.weight IS NOT NULL
          AND recovered_set.repetitions > 0
      );

    DELETE FROM workout_session_exercises
    WHERE NOT EXISTS (
        SELECT 1 FROM workout_sessions
        WHERE workout_sessions.id = workout_session_exercises.session_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM workout_session_exercises related_exercise
        JOIN workout_sets related_set
          ON related_set.session_exercise_id = related_exercise.id
        WHERE related_exercise.session_id = workout_session_exercises.session_id
          AND related_set.weight IS NOT NULL
          AND related_set.repetitions > 0
      );

    INSERT INTO workout_sessions
      (id, template_id, name, notes, status, started_at, completed_at, created_at, updated_at)
    SELECT
      session_exercise.session_id,
      NULL,
      'Recovered workout',
      'Recovered automatically from existing workout data.',
      'completed',
      COALESCE(MIN(workout_set.created_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      COALESCE(MAX(workout_set.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      COALESCE(MIN(workout_set.created_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      COALESCE(MAX(workout_set.updated_at), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    FROM workout_session_exercises session_exercise
    LEFT JOIN workout_sessions session ON session.id = session_exercise.session_id
    LEFT JOIN workout_sets workout_set
      ON workout_set.session_exercise_id = session_exercise.id
    WHERE session.id IS NULL
      AND EXISTS (
        SELECT 1
        FROM workout_session_exercises related_exercise
        JOIN workout_sets related_set
          ON related_set.session_exercise_id = related_exercise.id
        WHERE related_exercise.session_id = session_exercise.session_id
          AND related_set.weight IS NOT NULL
          AND related_set.repetitions > 0
      )
    GROUP BY session_exercise.session_id;

    UPDATE workout_session_exercises
    SET exercise_id = NULL
    WHERE exercise_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM exercises WHERE exercises.id = workout_session_exercises.exercise_id
      );
  `);
}

async function initializeDatabase() {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await ensureBodyweightSchema();
  await db.execAsync(APP_SETTINGS_SCHEMA_SQL);
  await db.execAsync(EXERCISES_SCHEMA_SQL);
  await rebuildLegacyExercisesTableIfNeeded();
  await db.execAsync(TRAINING_SCHEMA_SQL);
  await rebuildTemplateExercisesTableIfNeeded();
  await migrateWorkoutSetCommentsIfNeeded();
  const removedVideoRows = await db.getAllAsync<{ video_uri: string }>(`
    SELECT ws.video_uri
    FROM workout_sets ws
    JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
    WHERE se.exercise_type != 'weight_reps' AND ws.video_uri IS NOT NULL
  `);
  const emptyOrphanVideoRows = await db.getAllAsync<{ video_uri: string }>(`
    SELECT ws.video_uri
    FROM workout_sets ws
    JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
    LEFT JOIN workout_sessions session ON session.id = se.session_id
    WHERE session.id IS NULL
      AND ws.video_uri IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM workout_session_exercises related_exercise
        JOIN workout_sets related_set
          ON related_set.session_exercise_id = related_exercise.id
        WHERE related_exercise.session_id = se.session_id
          AND related_set.weight IS NOT NULL
          AND related_set.repetitions > 0
      )
  `);
  const emptyRecoveredVideoRows = await db.getAllAsync<{ video_uri: string }>(`
    SELECT ws.video_uri
    FROM workout_sets ws
    JOIN workout_session_exercises se ON se.id = ws.session_exercise_id
    JOIN workout_sessions session ON session.id = se.session_id
    WHERE session.name = 'Recovered workout'
      AND session.notes = 'Recovered automatically from existing workout data.'
      AND ws.video_uri IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM workout_session_exercises recovered_exercise
        JOIN workout_sets recovered_set
          ON recovered_set.session_exercise_id = recovered_exercise.id
        WHERE recovered_exercise.session_id = session.id
          AND recovered_set.weight IS NOT NULL
          AND recovered_set.repetitions > 0
      )
  `);
  let orphanSetVideoUris: string[] = [];
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(REMOVE_LEGACY_NON_RESISTANCE_DATA_SQL);
    await transaction.execAsync(NORMALIZE_SET_COMPLETION_SQL);
    await transaction.execAsync(DEFAULT_EXERCISES_SQL);
    orphanSetVideoUris = await repairWorkoutSetForeignKeys(transaction);
    await repairWorkoutSessionExerciseForeignKeys(transaction);
  });
  await videoService.removeMany(removedVideoRows.map((row) => row.video_uri));
  await videoService.removeMany(emptyOrphanVideoRows.map((row) => row.video_uri));
  await videoService.removeMany(emptyRecoveredVideoRows.map((row) => row.video_uri));
  await videoService.removeMany(orphanSetVideoUris);
  const violations = await db.getAllAsync<ForeignKeyViolationRow>("PRAGMA foreign_key_check");
  if (violations.length > 0) {
    const affectedTables = [...new Set(violations.map((violation) => violation.table))].join(", ");
    throw new Error(`Database foreign-key validation failed for: ${affectedTables}.`);
  }
}

export function initDB() {
  if (!initialization) {
    initialization = initializeDatabase().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
