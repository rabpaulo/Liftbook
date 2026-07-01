import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('liftbook.db');

export async function initDB() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bodyweight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        weight REAL NOT NULL,
        image_uri TEXT
    );
    `);
}