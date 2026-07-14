import { db } from "@/database/database";
import { exerciseRepository } from "@/database/repositories/exerciseRepository";
import { mapTemplate, type TemplateRow } from "@/database/repositories/trainingMappers";
import type { TemplateExercise, WorkoutTemplate, WorkoutTemplateDetail } from "@/utils/training-types";
import { createId } from "@/utils/training-id";

type TemplateExerciseJoinRow = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  default_set_count: number | null;
  notes_override: string | null;
};

export const workoutTemplateRepository = {
  async list(): Promise<WorkoutTemplate[]> {
    const rows = await db.getAllAsync<TemplateRow>("SELECT * FROM workout_templates ORDER BY updated_at DESC");
    return rows.map(mapTemplate);
  },

  async getById(id: string): Promise<WorkoutTemplateDetail | null> {
    const row = await db.getFirstAsync<TemplateRow>("SELECT * FROM workout_templates WHERE id = ?", id);
    if (!row) return null;
    const links = await db.getAllAsync<TemplateExerciseJoinRow>(
      "SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY position",
      id,
    );
    const exercises: TemplateExercise[] = [];
    for (const link of links) {
      const exercise = await exerciseRepository.findById(link.exercise_id);
      if (!exercise) continue;
      exercises.push({
        id: link.id,
        templateId: link.template_id,
        exerciseId: link.exercise_id,
        position: link.position,
        defaultSetCount: link.default_set_count,
        notesOverride: link.notes_override,
        exercise,
      });
    }
    return { ...mapTemplate(row), exercises };
  },

  async create(name: string, notes: string | null = null): Promise<WorkoutTemplateDetail> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Template name is required.");
    const id = createId();
    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO workout_templates (id, name, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, cleanName, notes?.trim() || null, now, now],
    );
    return { id, name: cleanName, notes: notes?.trim() || null, createdAt: now, updatedAt: now, exercises: [] };
  },

  async update(id: string, name: string, notes: string | null) {
    if (!name.trim()) throw new Error("Template name is required.");
    const result = await db.runAsync(
      "UPDATE workout_templates SET name = ?, notes = ?, updated_at = ? WHERE id = ?",
      [name.trim(), notes?.trim() || null, new Date().toISOString(), id],
    );
    if (result.changes === 0) throw new Error("Template not found.");
  },

  async addExercise(templateId: string, exerciseId: string, defaultSetCount: number | null = null) {
    const exercise = await exerciseRepository.findById(exerciseId);
    if (!exercise) throw new Error("Exercise not found.");
    const duplicate = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM workout_template_exercises WHERE template_id = ? AND exercise_id = ?",
      [templateId, exerciseId],
    );
    if ((duplicate?.count ?? 0) > 0) throw new Error(`${exercise.name} is already in this template.`);
    const positionRow = await db.getFirstAsync<{ next_position: number }>(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM workout_template_exercises WHERE template_id = ?",
      templateId,
    );
    await db.runAsync(
      `INSERT INTO workout_template_exercises
       (id, template_id, exercise_id, position, default_set_count, notes_override)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [
        createId(),
        templateId,
        exerciseId,
        positionRow?.next_position ?? 0,
        defaultSetCount === null ? null : Math.max(1, Math.floor(defaultSetCount)),
      ],
    );
    await db.runAsync("UPDATE workout_templates SET updated_at = ? WHERE id = ?", [new Date().toISOString(), templateId]);
  },

  async updateExercise(id: string, defaultSetCount: number | null) {
    await db.runAsync(
      "UPDATE workout_template_exercises SET default_set_count = ? WHERE id = ?",
      [defaultSetCount === null ? null : Math.max(1, Math.floor(defaultSetCount)), id],
    );
  },

  async removeExercise(id: string) {
    const link = await db.getFirstAsync<{ template_id: string; position: number }>(
      "SELECT template_id, position FROM workout_template_exercises WHERE id = ?",
      id,
    );
    if (!link) return;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM workout_template_exercises WHERE id = ?", id);
      await transaction.runAsync(
        "UPDATE workout_template_exercises SET position = position - 1 WHERE template_id = ? AND position > ?",
        [link.template_id, link.position],
      );
    });
  },

  async reorderExercises(templateId: string, orderedIds: readonly string[]) {
    const rows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM workout_template_exercises WHERE template_id = ?",
      templateId,
    );
    const existingIds = new Set(rows.map((row) => row.id));
    if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
      throw new Error("Exercise order is out of date.");
    }

    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const [position, id] of orderedIds.entries()) {
        await transaction.runAsync(
          "UPDATE workout_template_exercises SET position = ? WHERE id = ? AND template_id = ?",
          [position, id, templateId],
        );
      }
      await transaction.runAsync(
        "UPDATE workout_templates SET updated_at = ? WHERE id = ?",
        [new Date().toISOString(), templateId],
      );
    });
  },

  async duplicate(id: string): Promise<WorkoutTemplateDetail> {
    const source = await this.getById(id);
    if (!source) throw new Error("Template not found.");
    const copy = await this.create(`${source.name} copy`, source.notes);
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const item of source.exercises) {
        await transaction.runAsync(
          `INSERT INTO workout_template_exercises
           (id, template_id, exercise_id, position, default_set_count, notes_override)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [createId(), copy.id, item.exerciseId, item.position, item.defaultSetCount, item.notesOverride],
        );
      }
    });
    const result = await this.getById(copy.id);
    if (!result) throw new Error("Could not duplicate template.");
    return result;
  },

  async delete(id: string) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM workout_templates WHERE id = ?", id);
    });
  },
};
