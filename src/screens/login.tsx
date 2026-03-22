import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Font, R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

export default function Login() {
  const { unlock, shopName } = useAuth();
  const c = useColors();
  const ss = useMemo(() => makeStyles(c), [c]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const tap = async (key: string) => {
    setError(false);
    if (key === 'del') { setPin((p) => p.slice(0, -1)); return; }
    if (key === '' || pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      setBusy(true);
      const ok = await unlock(next);
      if (!ok) { setError(true); setPin(''); }
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={ss.root}>
      <View style={ss.top}>
        <View style={ss.logoWrap}>
          <Feather name="shopping-bag" size={32} color={c.blue} />
        </View>
        <Text style={ss.name}>{shopName}</Text>
        <Text style={ss.hint}>{L.pinHint}</Text>
      </View>
      <View style={ss.dots}>
        {[0,1,2,3].map((i) => (
          <View key={i} style={[ss.dot, i < pin.length && ss.dotOn, error && ss.dotErr]} />
        ))}
      </View>
      {error && <Text style={ss.errText}>{L.wrongPin}</Text>}
      <View style={ss.pad}>
        {KEYS.map((k, i) => (
          <Pressable key={i} onPress={() => tap(k)} disabled={k === '' || busy}
            style={({ pressed }) => [ss.key, k === '' && ss.keyHide, pressed && k !== '' && ss.keyDown]}>
            {k === 'del'
              ? <Feather name="delete" size={22} color={c.text} />
              : <Text style={ss.keyText}>{k}</Text>
            }
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'space-between', paddingBottom: S.xl },
    top: { alignItems: 'center', paddingTop: S.xxl, gap: S.xs },
    logoWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 22, fontWeight: '700', color: c.text },
    hint: { fontSize: 14, color: c.textSecondary, marginTop: S.sm },
    dots: { flexDirection: 'row', gap: 16 },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: c.border },
    dotOn: { backgroundColor: c.blue, borderColor: c.blue },
    dotErr: { backgroundColor: c.red, borderColor: c.red },
    errText: { color: c.red, fontSize: 14, fontWeight: '600', marginTop: S.sm },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 280 },
    key: { width: 280 / 3, height: 64, alignItems: 'center', justifyContent: 'center' },
    keyHide: { opacity: 0 },
    keyDown: { backgroundColor: c.bgSecondary, borderRadius: R.full },
    keyText: { fontSize: 28, fontWeight: '500', color: c.text },
  });
}
