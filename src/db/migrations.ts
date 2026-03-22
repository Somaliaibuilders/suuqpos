import type { SQLiteDatabase } from 'expo-sqlite';

async function hasColumn(db: SQLiteDatabase, table: string, column: string): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

export async function runMigrations(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const v = r?.user_version ?? 0;

  if (v < 3) {
    // Save shop data if it exists from old schema
    let shopData: Array<{ key: string; value: string }> = [];
    try {
      shopData = await db.getAllAsync<{ key: string; value: string }>(
        'SELECT key, value FROM shop'
      );
    } catch {}

    // Rebuild all tables
    await db.execAsync(`
      DROP TABLE IF EXISTS sale_items;
      DROP TABLE IF EXISTS sales;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS shop;

      CREATE TABLE shop (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total REAL NOT NULL,
        profit REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        items_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      );

      INSERT OR IGNORE INTO categories (name) VALUES ('Cunto');
      INSERT OR IGNORE INTO categories (name) VALUES ('Cabitaan');
      INSERT OR IGNORE INTO categories (name) VALUES ('Guriga');
      INSERT OR IGNORE INTO categories (name) VALUES ('Nadaafad');
      INSERT OR IGNORE INTO categories (name) VALUES ('Kale');

      PRAGMA user_version = 3;
    `);

    // Restore shop data (phone, pin, shop_name)
    for (const row of shopData) {
      await db.runAsync(
        'INSERT OR REPLACE INTO shop (key, value) VALUES (?, ?)',
        row.key, row.value
      );
    }
  }

  // v4: Add missing columns for older DBs + performance indices
  if (v < 4) {
    // Fix DBs that were marked as v3 but missing newer columns
    try {
      if (!(await hasColumn(db, 'sales', 'profit'))) {
        await db.execAsync('ALTER TABLE sales ADD COLUMN profit REAL NOT NULL DEFAULT 0');
      }
      if (!(await hasColumn(db, 'sales', 'items_count'))) {
        await db.execAsync('ALTER TABLE sales ADD COLUMN items_count INTEGER NOT NULL DEFAULT 0');
      }
      if (!(await hasColumn(db, 'sale_items', 'cost'))) {
        await db.execAsync('ALTER TABLE sale_items ADD COLUMN cost REAL NOT NULL DEFAULT 0');
      }
      if (!(await hasColumn(db, 'products', 'cost'))) {
        await db.execAsync('ALTER TABLE products ADD COLUMN cost REAL NOT NULL DEFAULT 0');
      }
    } catch {}

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

      PRAGMA user_version = 4;
    `);
  }
}
