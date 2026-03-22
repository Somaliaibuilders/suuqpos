import React, { createContext, useCallback, useContext, useReducer } from 'react';
import type { CartItem, Product } from '@/types';

type Action =
  | { type: 'ADD'; p: Product }
  | { type: 'REM'; pid: number }
  | { type: 'INC'; pid: number }
  | { type: 'DEC'; pid: number }
  | { type: 'CLEAR' };

function reduce(s: CartItem[], a: Action): CartItem[] {
  switch (a.type) {
    case 'ADD': {
      const e = s.find((i) => i.product_id === a.p.id);
      if (e) return s.map((i) => i.product_id === a.p.id ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i);
      return [...s, { product_id: a.p.id, name: a.p.name, price: a.p.price, cost: a.p.cost, quantity: 1, stock: a.p.stock }];
    }
    case 'REM': return s.filter((i) => i.product_id !== a.pid);
    case 'INC': return s.map((i) => i.product_id === a.pid ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) } : i);
    case 'DEC': return s.map((i) => i.product_id === a.pid ? { ...i, quantity: i.quantity - 1 } : i).filter((i) => i.quantity > 0);
    case 'CLEAR': return [];
  }
}

type Ctx = {
  items: CartItem[]; total: number; count: number;
  add: (p: Product) => void; rem: (pid: number) => void;
  inc: (pid: number) => void; dec: (pid: number) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx>({} as Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, d] = useReducer(reduce, []);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <CartCtx.Provider value={{
      items, total, count,
      add: useCallback((p: Product) => d({ type: 'ADD', p }), []),
      rem: useCallback((pid: number) => d({ type: 'REM', pid }), []),
      inc: useCallback((pid: number) => d({ type: 'INC', pid }), []),
      dec: useCallback((pid: number) => d({ type: 'DEC', pid }), []),
      clear: useCallback(() => d({ type: 'CLEAR' }), []),
    }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
