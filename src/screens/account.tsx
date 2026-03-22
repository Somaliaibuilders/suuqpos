import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useColors, useThemeMode } from '@/context/theme-context';

const MODES = [
  { key: 'light' as const, icon: 'sun' as const, label: 'Iftiinka' },
  { key: 'dark' as const, icon: 'moon' as const, label: 'Madow' },
  { key: 'system' as const, icon: 'smartphone' as const, label: 'System' },
];

export default function AccountTab() {
  const { shopName, phone, lock } = useAuth();
  const c = useColors();
  const { mode, setMode } = useThemeMode();
  const ss = useMemo(() => makeStyles(c), [c]);

  return (
    <SafeAreaView style={ss.root} edges={['top']}>
      <View style={ss.hdr}><Text style={ss.title}>{L.settings}</Text></View>

      <View style={ss.content}>
        <View style={ss.profile}>
          <View style={ss.avatarWrap}>
            <Feather name="shopping-bag" size={28} color={c.blue} />
          </View>
          <Text style={ss.name}>{shopName}</Text>
          <Text style={ss.phone}>{phone}</Text>
        </View>

        <View style={ss.section}>
          <Row c={c} label={L.shopName} value={shopName} />
          <Row c={c} label={L.phone} value={phone} last />
        </View>

        {/* Theme toggle */}
        <View style={ss.section}>
          <View style={ss.themeRow}>
            <Text style={ss.themeLabel}>Muuqaalka</Text>
            <View style={ss.themeBtns}>
              {MODES.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => setMode(m.key)}
                  style={[ss.themeBtn, mode === m.key && ss.themeBtnActive]}>
                  <Feather name={m.icon} size={14} color={mode === m.key ? c.white : c.textSecondary} />
                  <Text style={[ss.themeBtnText, mode === m.key && ss.themeBtnTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={ss.section}>
          <Row c={c} label="App" value="SuuqPOS" />
          <Row c={c} label="Version" value={L.version} last />
        </View>

        <Pressable onPress={lock} style={ss.lockBtn}>
          <Feather name="lock" size={16} color={c.text} />
          <Text style={ss.lockT}>Qufl</Text>
        </Pressable>

        <Text style={ss.footer}>POS bilaash ah, offline ah{'\n'}Dukaamada Soomaaliyeed</Text>
      </View>
    </SafeAreaView>
  );
}

function Row({ c, label, value, last }: { c: Colors; label: string; value: string; last?: boolean }) {
  return (
    <View style={[rowStyles(c).row, !last && rowStyles(c).rowBorder]}>
      <Text style={rowStyles(c).rowL}>{label}</Text>
      <Text style={rowStyles(c).rowV}>{value}</Text>
    </View>
  );
}

function rowStyles(c: Colors) {
  return {
    row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: S.md, paddingVertical: 14 },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowL: { fontSize: 15, color: c.textSecondary },
    rowV: { fontSize: 15, fontWeight: '600' as const, color: c.text },
  };
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    hdr: { paddingHorizontal: S.md, paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    content: { padding: S.md, gap: S.md },
    profile: { backgroundColor: c.blueLight, borderRadius: R.lg, padding: S.lg, alignItems: 'center', gap: S.xs },
    avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 20, fontWeight: '700', color: c.text },
    phone: { fontSize: 15, color: c.textSecondary },
    section: { backgroundColor: c.bgSecondary, borderRadius: R.md, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    themeRow: { paddingHorizontal: S.md, paddingVertical: 14, gap: 10 },
    themeLabel: { fontSize: 15, color: c.textSecondary },
    themeBtns: { flexDirection: 'row', gap: 8 },
    themeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: R.sm,
      backgroundColor: c.bg, borderWidth: 1.5, borderColor: c.border,
    },
    themeBtnActive: { backgroundColor: c.blue, borderColor: c.blue },
    themeBtnText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    themeBtnTextActive: { color: c.white },
    lockBtn: { height: 48, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.bgSecondary, borderWidth: 1, borderColor: c.border },
    lockT: { fontSize: 15, fontWeight: '600', color: c.text },
    footer: { fontSize: 13, color: c.textTertiary, textAlign: 'center', marginTop: S.lg, lineHeight: 20 },
  });
}
