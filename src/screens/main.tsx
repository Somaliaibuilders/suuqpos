import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useColors } from '@/context/theme-context';
import InventoryTab from '@/screens/inventory';
import POSTab from '@/screens/pos';
import SalesTab from '@/screens/sales';
import AccountTab from '@/screens/account';

const TABS = [
  { key: 'inv', label: L.tabInventory, icon: 'package' },
  { key: 'pos', label: L.tabSell, icon: 'shopping-cart' },
  { key: 'sales', label: L.tabSales, icon: 'file-text' },
  { key: 'acct', label: L.tabAccount, icon: 'user' },
] as const;

type Tab = typeof TABS[number]['key'];

export default function Main() {
  const c = useColors();
  const ss = useMemo(() => makeStyles(c), [c]);
  const [tab, setTab] = useState<Tab>('inv');

  useEffect(() => {
    const handler = () => {
      if (tab !== 'inv') { setTab('inv'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [tab]);

  return (
    <View style={ss.root}>
      <View style={ss.body}>
        {tab === 'inv' && <InventoryTab onSwitchToAdd={() => {}} />}
        {tab === 'pos' && <POSTab />}
        {tab === 'sales' && <SalesTab isVisible={tab === 'sales'} />}
        {tab === 'acct' && <AccountTab />}
      </View>
      <View style={ss.bar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={ss.tab}>
              <Feather name={t.icon as any} size={22} color={active ? c.blue : c.textTertiary} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1 },
    bar: {
      flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border,
      backgroundColor: c.bg, paddingBottom: 28, paddingTop: 10,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  });
}
