import { db } from "@/database/database";
import type { Exercise } from "@/utils/training-types";
import { createId } from "@/utils/training-id";
import { type ExerciseRow, mapExercise } from "@/database/repositories/trainingMappers";

export type ExerciseInput = {
  name: string;
  category: string;
  notes?: string | null;
};

export type ExerciseFilters = {
  search?: string;
  category?: string | null;
  includeArchived?: boolean;
};

function cleanInput(input: ExerciseInput) {
  const name = input.name.trim();
  const category = input.category.trim();
  if (!name) throw new Error("Exercise name is required.");
  if (!category) throw new Error("Exercise category is required.");
  return { name, category, type: "weight_reps" as const, notes: input.notes?.trim() || null };
}

export const exerciseRepository = {
  async list(filters: ExerciseFilters = {}): Promise<Exercise[]> {
    const conditions: string[] = ["type = 'weight_reps'"];
    const values: (string | number)[] = [];
    if (!filters.includeArchived) conditions.push("is_archived = 0");
    if (filters.search?.trim()) {
      conditions.push("name LIKE ? COLLATE NOCASE");
      values.push(`%${filters.search.trim()}%`);
    }
    if (filters.category) {
      conditions.push("category = ? COLLATE NOCASE");
      values.push(filters.category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await db.getAllAsync<ExerciseRow>(
      `SELECT * FROM exercises ${where} ORDER BY is_archived, name COLLATE NOCASE`,
      values,
    );
    return rows.map(mapExercise);
  },

  async categories(): Promise<string[]> {
    const rows = await db.getAllAsync<{ category: string }>(
      "SELECT DISTINCT category FROM exercises WHERE is_archived = 0 AND type = 'weight_reps' ORDER BY category COLLATE NOCASE",
    );
    return rows.map((row) => row.category);
  },

  async findById(id: string): Promise<Exercise | null> {
    const row = await db.getFirstAsync<ExerciseRow>("SELECT * FROM exercises WHERE id = ? AND type = 'weight_reps'", id);
    return row ? mapExercise(row) : null;
  },

  async findDuplicateName(name: string, excludingId?: string): Promise<Exercise | null> {
    const row = await db.getFirstAsync<ExerciseRow>(
      `SELECT * FROM exercises WHERE type = 'weight_reps' AND name = ? COLLATE NOCASE ${excludingId ? "AND id != ?" : ""} LIMIT 1`,
      excludingId ? [name.trim(), excludingId] : [name.trim()],
    );
    return row ? mapExercise(row) : null;
  },

  async create(input: ExerciseInput): Promise<Exercise> {
    const value = cleanInput(input);
    const id = createId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO exercises (id, name, notes, category, type, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, value.name, value.notes, value.category, value.type, now, now],
    );
    return { id, ...value, isArchived: false, createdAt: now, updatedAt: now };
  },

  async update(id: string, input: ExerciseInput): Promise<Exercise> {
    const value = cleanInput(input);
    const now = new Date().toISOString();
    const result = await db.runAsync(
      "UPDATE exercises SET name = ?, notes = ?, category = ?, type = ?, updated_at = ? WHERE id = ?",
      [value.name, value.notes, value.category, value.type, now, id],
    );
    if (result.changes === 0) throw new Error("Exercise not found.");
    const exercise = await this.findById(id);
    if (!exercise) throw new Error("Exercise not found.");
    return exercise;
  },

  async setArchived(id: string, archived: boolean) {
    const result = await db.runAsync(
      "UPDATE exercises SET is_archived = ?, updated_at = ? WHERE id = ?",
      [archived ? 1 : 0, new Date().toISOString(), id],
    );
    if (result.changes === 0) throw new Error("Exercise not found.");
  },
};
