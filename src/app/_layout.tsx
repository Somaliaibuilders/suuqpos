import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { AuthProvider } from '@/context/auth-context';
import { CartProvider } from '@/context/cart-context';
import { ThemeProvider, useThemeMode } from '@/context/theme-context';

function Inner() {
  const { isDark } = useThemeMode();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider>
          <Inner />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
