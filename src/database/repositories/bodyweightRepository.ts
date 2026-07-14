import { db } from '@/database/database';
import type { BodyweightGoal, BodyweightLog, WeightUnit } from '@/hooks/use-bodyweight';

export type BodyweightSettingsRecord = {
  goal: BodyweightGoal;
  weekly_target: number;
  weight_unit: WeightUnit;
};

export const BodyweightRepository = {
  async create(date: string, weight: number, imageUri?: string | null) {
    const result = await db.runAsync(
      'INSERT INTO bodyweight (date, weight, image_uri) VALUES (?, ?, ?)',
      date,
      weight,
      imageUri ?? null,
    );
    return result.lastInsertRowId;
  },

  async remove(id: number) {
    await db.runAsync('DELETE FROM bodyweight WHERE id = ?', id);
  },

  async update(id: number, weight: number) {
    await db.runAsync('UPDATE bodyweight SET weight = ? WHERE id = ?', weight, id);
  },

  async updateImage(id: number, imageUri: string | null) {
    await db.runAsync('UPDATE bodyweight SET image_uri = ? WHERE id = ?', imageUri, id);
  },

  async existsByDate(date: string) {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bodyweight WHERE date = ?', 
      [date]
    );
    return (result?.count || 0) > 0;
  },

  async findAll() {
    const allRows = await db.getAllAsync<BodyweightLog>('SELECT * FROM bodyweight ORDER BY id DESC');
    return allRows;
  },

  async getSettings() {
    const row = await db.getFirstAsync<BodyweightSettingsRecord>(
      'SELECT goal, weekly_target, weight_unit FROM bodyweight_settings WHERE id = 1'
    );
    return row;
  },

  async upsertSettings(goal: BodyweightGoal, weeklyTarget: number, weightUnit: WeightUnit) {
    await db.runAsync(
      `INSERT INTO bodyweight_settings (id, goal, weekly_target, weight_unit)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET goal = excluded.goal, weekly_target = excluded.weekly_target,
         weight_unit = excluded.weight_unit`,
      goal,
      weeklyTarget,
      weightUnit,
    );
  }
};
