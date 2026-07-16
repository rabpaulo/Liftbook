import { db } from '@/database/database';
import type {
  BodyweightLog,
  BodyweightPhase,
  BodyweightPhaseDraft,
  WeightUnit,
} from '@/utils/bodyweight-types';

export type BodyweightSettingsRecord = {
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
      'SELECT weight_unit FROM bodyweight_settings WHERE id = 1'
    );
    return row;
  },

  async upsertWeightUnit(weightUnit: WeightUnit) {
    await db.runAsync(
      `INSERT INTO bodyweight_settings (id, weight_unit)
       VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET weight_unit = excluded.weight_unit`,
      weightUnit,
    );
  },

  async findAllPhases() {
    return db.getAllAsync<BodyweightPhase>(
      `SELECT id, name, goal, weekly_target AS weeklyTarget,
        duration_weeks AS durationWeeks, started_on AS startedOn, ended_on AS endedOn,
        created_at AS createdAt, updated_at AS updatedAt
       FROM bodyweight_phases
       ORDER BY started_on DESC, id DESC`,
    );
  },

  async createPhase(draft: BodyweightPhaseDraft, startedOn: string, timestamp: string) {
    let id = 0;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE bodyweight_phases
         SET ended_on = MIN(
           ?,
           date(started_on, '+' || ((duration_weeks * 7) - 1) || ' days')
         ), updated_at = ?
         WHERE ended_on IS NULL`,
        startedOn,
        timestamp,
      );
      const result = await transaction.runAsync(
        `INSERT INTO bodyweight_phases
          (name, goal, weekly_target, duration_weeks, started_on, ended_on, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
        draft.name,
        draft.goal,
        draft.weeklyTarget,
        draft.durationWeeks,
        startedOn,
        timestamp,
        timestamp,
      );
      id = result.lastInsertRowId;
    });
    return id;
  },

  async updatePhase(id: number, draft: BodyweightPhaseDraft, timestamp: string) {
    await db.runAsync(
      `UPDATE bodyweight_phases
       SET name = ?, goal = ?, weekly_target = ?, duration_weeks = ?, updated_at = ?
       WHERE id = ?`,
      draft.name,
      draft.goal,
      draft.weeklyTarget,
      draft.durationWeeks,
      timestamp,
      id,
    );
  },

  async endPhase(id: number, endedOn: string, timestamp: string) {
    await db.runAsync(
      `UPDATE bodyweight_phases
       SET ended_on = MIN(
         ?,
         date(started_on, '+' || ((duration_weeks * 7) - 1) || ' days')
       ), updated_at = ?
       WHERE id = ? AND ended_on IS NULL`,
      endedOn,
      timestamp,
      id,
    );
  },

  async removePhase(id: number) {
    await db.runAsync('DELETE FROM bodyweight_phases WHERE id = ?', id);
  },
};
