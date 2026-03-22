export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category_id: number;
  category_name?: string;
  created_at: string;
}

export interface Sale {
  id: number;
  total: number;
  profit: number;
  payment_method: 'cash' | 'evc' | 'zaad' | 'sahal' | 'edahab';
  items_count: number;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  stock: number;
}

export interface MonthlySummary {
  revenue: number;
  profit: number;
  total_sales: number;
  items_sold: number;
}
