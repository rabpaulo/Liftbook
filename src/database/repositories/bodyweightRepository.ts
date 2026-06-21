import { db } from '@/database/database';

export const BodyweightRepository = {
  async create(date: string, weight: number) {
    const result = await db.runAsync('INSERT INTO bodyweight (date, weight) VALUES (?, ?)', date, weight);
    return result.lastInsertRowId;
  },

  async remove(id: number) {
    await db.runAsync('DELETE FROM bodyweight WHERE id = ?', id);
  },

  async update(id: number, weight: number) {
    await db.runAsync('UPDATE bodyweight SET weight = ? WHERE id = ?', weight, id);
  },

  async existsByDate(date: string) {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bodyweight WHERE date = ?', 
      [date]
    );
    return (result?.count || 0) > 0;
  },

  async findAll() {
    const allRows = await db.getAllAsync('SELECT * FROM bodyweight ORDER BY id DESC');
    return allRows;
  }
};