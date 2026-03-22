import type { SQLiteDatabase } from 'expo-sqlite';
import type { Product } from '@/types';

export async function getProducts(db: SQLiteDatabase, catId?: number): Promise<Product[]> {
  try {
    if (catId) {
      return await db.getAllAsync<Product>(
        `SELECT p.*, c.name as category_name FROM products p
         LEFT JOIN categories c ON p.category_id=c.id
         WHERE p.category_id=? ORDER BY p.name`, catId
      );
    }
    return await db.getAllAsync<Product>(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.name`
    );
  } catch {
    return [];
  }
}

export async function getProduct(db: SQLiteDatabase, id: number): Promise<Product | null> {
  try {
    return await db.getFirstAsync<Product>(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=?`, id
    );
  } catch {
    return null;
  }
}

export async function insertProduct(db: SQLiteDatabase, p: {
  name: string; price: number; cost: number; stock: number; category_id: number;
}) {
  const r = await db.runAsync(
    'INSERT INTO products (name,price,cost,stock,category_id) VALUES (?,?,?,?,?)',
    p.name, p.price, p.cost, p.stock, p.category_id
  );
  return r.lastInsertRowId;
}

export async function updateProduct(db: SQLiteDatabase, id: number, p: {
  name: string; price: number; cost: number; category_id: number;
}) {
  await db.runAsync(
    'UPDATE products SET name=?,price=?,cost=?,category_id=? WHERE id=?',
    p.name, p.price, p.cost, p.category_id, id
  );
}

export async function adjustStock(db: SQLiteDatabase, id: number, delta: number) {
  await db.runAsync('UPDATE products SET stock=MAX(0,stock+?) WHERE id=?', delta, id);
}

export async function deleteProduct(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM products WHERE id=?', id);
}

export async function countProducts(db: SQLiteDatabase) {
  try {
    const r = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM products');
    return r?.c ?? 0;
  } catch {
    return 0;
  }
}

export async function stockValue(db: SQLiteDatabase) {
  try {
    const r = await db.getFirstAsync<{ v: number | null }>(
      'SELECT SUM(price*stock) as v FROM products'
    );
    return r?.v ?? 0;
  } catch {
    return 0;
  }
}

export async function lowStockProducts(db: SQLiteDatabase) {
  try {
    return await db.getAllAsync<Product>(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id=c.id
       WHERE p.stock<=5 ORDER BY p.stock ASC`
    );
  } catch {
    return [];
  }
}
