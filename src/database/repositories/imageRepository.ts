import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

export const ImageRepository = {
  async create(uri: string, filename?: string, width?: number | null, height?: number | null) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const created_at = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO images (uri, filename, created_at, width, height) VALUES (?, ?, ?, ?, ?)',
      uri,
      filename ?? null,
      created_at,
      width ?? null,
      height ?? null,
    );

    return result.lastInsertRowId;
  },

  async remove(id: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');

    // fetch uri to delete the file from disk
    const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM images WHERE id = ?', [id]);
    if (row?.uri) {
      try {
        await FileSystem.deleteAsync(row.uri, { idempotent: true });
      } catch (e) {
        // ignore file deletion errors
      }
    }

    await db.runAsync('DELETE FROM images WHERE id = ?', id);
  },

  async findAll() {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const allRows = await db.getAllAsync('SELECT * FROM images ORDER BY created_at DESC');
    return allRows;
  },

  async findById(id: number) {
    const db = await SQLite.openDatabaseAsync('liftbook.db');
    const row = await db.getFirstAsync('SELECT * FROM images WHERE id = ?', [id]);
    return row;
  },
};

export default ImageRepository;
