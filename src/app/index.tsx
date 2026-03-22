import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import Register from '@/screens/register';
import Login from '@/screens/login';
import Main from '@/screens/main';

export default function Entry() {
  const { state } = useAuth();
  const c = useColors();

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }
  if (state === 'register') return <Register />;
  if (state === 'locked') return <Login />;
  return <Main />;
}
