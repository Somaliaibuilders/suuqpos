import type { SQLiteDatabase } from 'expo-sqlite';
import type { CartItem, MonthlySummary, Sale, SaleItem } from '@/types';

export async function createSale(
  db: SQLiteDatabase,
  items: CartItem[],
  method: string,
  amountPaid: number,
) {
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const profit = items.reduce((s, i) => s + (i.price - i.cost) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  let saleId = 0;
  await db.withTransactionAsync(async () => {
    const r = await db.runAsync(
      'INSERT INTO sales (total,profit,payment_method,items_count) VALUES (?,?,?,?)',
      total, profit, method, count
    );
    saleId = r.lastInsertRowId;

    for (const i of items) {
      await db.runAsync(
        `INSERT INTO sale_items (sale_id,product_id,product_name,quantity,price,cost,subtotal)
         VALUES (?,?,?,?,?,?,?)`,
        saleId, i.product_id, i.name, i.quantity, i.price, i.cost, i.price * i.quantity
      );
      await db.runAsync('UPDATE products SET stock=MAX(0,stock-?) WHERE id=?', i.quantity, i.product_id);
    }
  });
  return { saleId, total, profit, change: amountPaid - total };
}

export async function getSales(db: SQLiteDatabase, period: 'today' | 'week' | 'month') {
  const w = {
    today: "date(created_at)=date('now')",
    week: "created_at>=datetime('now','-7 days')",
    month: "created_at>=datetime('now','-30 days')",
  }[period];
  try {
    return await db.getAllAsync<Sale>(`SELECT * FROM sales WHERE ${w} ORDER BY created_at DESC`);
  } catch {
    return [];
  }
}

export async function getSaleDetail(db: SQLiteDatabase, id: number) {
  try {
    const sale = await db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id=?', id);
    if (!sale) return null;
    const items = await db.getAllAsync<SaleItem>('SELECT * FROM sale_items WHERE sale_id=?', id);
    return { sale, items };
  } catch {
    return null;
  }
}

export async function getSummary(db: SQLiteDatabase, period: 'today' | 'week' | 'month'): Promise<MonthlySummary> {
  const w = {
    today: "date(created_at)=date('now')",
    week: "created_at>=datetime('now','-7 days')",
    month: "created_at>=datetime('now','-30 days')",
  }[period];
  try {
    const r = await db.getFirstAsync<{
      revenue: number | null; profit: number | null;
      total_sales: number; items_sold: number | null;
    }>(
      `SELECT COALESCE(SUM(total),0) as revenue, COALESCE(SUM(profit),0) as profit,
       COUNT(*) as total_sales, COALESCE(SUM(items_count),0) as items_sold
       FROM sales WHERE ${w}`
    );
    return {
      revenue: r?.revenue ?? 0, profit: r?.profit ?? 0,
      total_sales: r?.total_sales ?? 0, items_sold: r?.items_sold ?? 0,
    };
  } catch {
    return { revenue: 0, profit: 0, total_sales: 0, items_sold: 0 };
  }
}

export async function todayRevenue(db: SQLiteDatabase) {
  try {
    const r = await db.getFirstAsync<{ v: number | null }>(
      "SELECT COALESCE(SUM(total),0) as v FROM sales WHERE date(created_at)=date('now')"
    );
    return r?.v ?? 0;
  } catch {
    return 0;
  }
}

export async function todaySalesCount(db: SQLiteDatabase) {
  try {
    const r = await db.getFirstAsync<{ c: number }>(
      "SELECT COUNT(*) as c FROM sales WHERE date(created_at)=date('now')"
    );
    return r?.c ?? 0;
  } catch {
    return 0;
  }
}
