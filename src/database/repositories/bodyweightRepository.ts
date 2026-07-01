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

export const MockBodyweightRepository = {
  findAll: async () => [
    { id: 29, date: "30/06/26", weight: 74.9 },
    { id: 28, date: "29/06/26", weight: 74 },
    { id: 27, date: "28/06/26", weight: 74.3 },
    { id: 26, date: "27/06/26", weight: 74.4 },
    { id: 25, date: "26/06/26", weight: 74.5 },
    { id: 24, date: "25/06/26", weight: 74.6 },
    { id: 23, date: "24/06/26", weight: 74.7 },
    { id: 22, date: "23/06/26", weight: 74.8 },
    { id: 21, date: "22/06/26", weight: 74.9 },
    { id: 20, date: "21/06/26", weight: 75 },
    { id: 19, date: "20/06/26", weight: 75.1 },
    { id: 18, date: "19/06/26", weight: 75.2 },
    { id: 17, date: "18/06/26", weight: 75.3 },
    { id: 16, date: "17/06/26", weight: 75.4 },
    { id: 15, date: "16/06/26", weight: 75.5 },
    { id: 14, date: "15/06/26", weight: 75.6 },
    { id: 13, date: "14/06/26", weight: 75.7 },
    { id: 12, date: "13/06/26", weight: 75.8 },
    { id: 11, date: "12/06/26", weight: 75.9 },
    { id: 10, date: "11/06/26", weight: 76 },
    { id: 9,  date: "10/06/26", weight: 76.1 },
    { id: 8,  date: "09/06/26", weight: 76.2 },
    { id: 7,  date: "08/06/26", weight: 76.3 },
    { id: 6,  date: "07/06/26", weight: 76.4 },
    { id: 5,  date: "06/06/26", weight: 76.5 },
    { id: 4,  date: "05/06/26", weight: 76.6 },
    { id: 3,  date: "04/06/26", weight: 76.7 },
    { id: 2,  date: "03/06/26", weight: 76.8 },
    { id: 1,  date: "02/06/26", weight: 76.9 },
    { id: 0,  date: "01/06/26", weight: 77 },  
    { id: 0,  date: "31/05/26", weight: 77 },  
    { id: 0,  date: "22/05/26", weight: 77 },  
    { id: 0,  date: "17/05/26", weight: 77 },  
    { id: 0,  date: "9/05/26", weight: 77 },  

  ],
};