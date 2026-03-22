import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDb } from '@/db/database';
import { isRegistered, verifyPin, setShopValue, setPin, getShopValue } from '@/db/shop';

type AuthState = 'loading' | 'register' | 'locked' | 'unlocked';

type Ctx = {
  state: AuthState;
  phone: string;
  shopName: string;
  register: (phone: string, name: string, pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
};

const AuthContext = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>('loading');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const registered = await isRegistered(db);
        if (registered) {
          setPhone((await getShopValue(db, 'phone')) ?? '');
          setShopName((await getShopValue(db, 'shop_name')) ?? '');
          setState('locked');
        } else {
          setState('register');
        }
      } catch {
        setState('register');
      }
    })();
  }, []);

  const register = async (ph: string, name: string, pin: string) => {
    const db = await getDb();
    await setShopValue(db, 'phone', ph);
    await setShopValue(db, 'shop_name', name);
    await setPin(db, pin);
    setPhone(ph);
    setShopName(name);
    setState('unlocked');
  };

  const unlock = async (pin: string) => {
    const db = await getDb();
    const ok = await verifyPin(db, pin);
    if (ok) setState('unlocked');
    return ok;
  };

  const lock = () => setState('locked');

  return (
    <AuthContext.Provider value={{ state, phone, shopName, register, unlock, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
