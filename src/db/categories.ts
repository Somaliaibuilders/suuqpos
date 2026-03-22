import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category } from '@/types';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  try {
    return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY id');
  } catch {
    return [];
  }
}

export async function addCategory(db: SQLiteDatabase, name: string): Promise<number> {
  const r = await db.runAsync('INSERT INTO categories (name) VALUES (?)', name.trim());
  return r.lastInsertRowId;
}

export async function deleteCategory(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE products SET category_id=1 WHERE category_id=?', id);
  await db.runAsync('DELETE FROM categories WHERE id=?', id);
}

export async function categoryProductCount(db: SQLiteDatabase, id: number): Promise<number> {
  try {
    const r = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM products WHERE category_id=?', id
    );
    return r?.c ?? 0;
  } catch {
    return 0;
  }
}
