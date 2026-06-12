import * as SQLite from 'expo-sqlite';

export const BodyweightRepository = {
  async create(date: string, weight: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const result = await db.runAsync('INSERT INTO bodyweight (date, weight) VALUES (?, ?)', date, weight);
    return result.lastInsertRowId;
  },

  async findAll() {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const allRows = await db.getAllAsync('SELECT * FROM bodyweight ORDER BY id DESC');
    return allRows;
  }
};