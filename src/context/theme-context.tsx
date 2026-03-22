import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Light, Dark, type Colors } from '@/constants/theme';
import { getDb } from '@/db/database';
import { getShopValue, setShopValue } from '@/db/shop';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeCtx = {
  mode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  mode: 'system',
  isDark: false,
  colors: Light,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load saved preference
  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        const saved = await getShopValue(db, 'theme_mode');
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {}
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    try {
      const db = await getDb();
      await setShopValue(db, 'theme_mode', m);
    } catch {}
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? Dark : Light;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;
