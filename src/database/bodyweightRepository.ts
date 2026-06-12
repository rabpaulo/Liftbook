import * as SQLite from 'expo-sqlite';

export const BodyweightRepository = {
  async create(date: string, weight: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const result = await db.runAsync('INSERT INTO bodyweight (date, weight) VALUES (?, ?)', date, weight);
    return result.lastInsertRowId;
  },
  async remove(id: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    await db.runAsync('DELETE FROM bodyweight WHERE id = ?', id);
  },

  async update(id: number, weight: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    await db.runAsync('UPDATE bodyweight SET weight = ? WHERE id = ?', weight, id);
  },
  async findAll() {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const allRows = await db.getAllAsync('SELECT * FROM bodyweight ORDER BY id DESC');
    return allRows;
  }
};