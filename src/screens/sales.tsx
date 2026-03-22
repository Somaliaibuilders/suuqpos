import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, Share,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Font, R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { getDb } from '@/db/database';
import { getSales, getSummary, getSaleDetail } from '@/db/sales';
import type { MonthlySummary, Sale, SaleItem } from '@/types';

const PAY_META: Record<string, { icon: string; label: string; color: string }> = {
  cash: { icon: 'dollar-sign', label: 'Lacag', color: '#16A34A' },
  evc: { icon: 'smartphone', label: 'EVC Plus', color: '#EA580C' },
  zaad: { icon: 'credit-card', label: 'Zaad', color: '#7C3AED' },
  sahal: { icon: 'zap', label: 'Sahal', color: '#0891B2' },
  edahab: { icon: 'send', label: 'eDahab', color: '#059669' },
};

type Period = 'today' | 'week' | 'month';
type Props = { isVisible?: boolean };

export default function SalesTab({ isVisible = true }: Props) {
  const { shopName } = useAuth();
  const c = useColors();
  const st = useMemo(() => makeStyles(c), [c]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [sales, setSales] = useState<Sale[]>([]);
  const [sum, setSum] = useState<MonthlySummary>({ revenue: 0, profit: 0, total_sales: 0, items_sold: 0 });
  const [rSale, setRSale] = useState<Sale | null>(null);
  const [rItems, setRItems] = useState<SaleItem[]>([]);

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const [s, sm] = await Promise.all([getSales(db, period), getSummary(db, period)]);
      setSales(s); setSum(sm);
    } catch {} finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isVisible) load(); }, [isVisible, load]);
  useEffect(() => { if (!isVisible) return; const i = setInterval(load, 5000); return () => clearInterval(i); }, [isVisible, load]);

  const openReceipt = async (sale: Sale) => {
    try {
      const db = await getDb();
      const d = await getSaleDetail(db, sale.id);
      if (d) { setRSale(d.sale); setRItems(d.items); }
    } catch { Alert.alert('Khalad', 'Rasiidka lama soo shubi karin.'); }
  };

  const shareReceipt = async () => {
    if (!rSale) return;
    const pm = PAY_META[rSale.payment_method] ?? { label: rSale.payment_method };
    const lines = [`--- ${shopName} ---`, `Rasiidh #${rSale.id}`, new Date(rSale.created_at + 'Z').toLocaleString(), '',
      ...rItems.map((i) => `${i.product_name}  x${i.quantity}  $${i.subtotal.toFixed(2)}`), '',
      `WADARTA: $${rSale.total.toFixed(2)}`, `Habka: ${pm.label}`, '', 'Waad ku mahadsan tahay!'].join('\n');
    await Share.share({ message: lines });
  };

  const pLabels: Record<Period, string> = { today: L.today, week: L.thisWeek, month: L.thisMonth };

  if (loading) {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <View style={st.header}><Text style={st.headerTitle}>{L.sales}</Text></View>
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={c.blue} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <View style={st.header}><Text style={st.headerTitle}>{L.sales}</Text></View>

      <View style={st.periodRow}>
        {(['today', 'week', 'month'] as Period[]).map((p) => (
          <Pressable key={p} onPress={() => setPeriod(p)} style={[st.periodBtn, period === p && st.periodBtnOn]}>
            <Text style={[st.periodText, period === p && st.periodTextOn]}>{pLabels[p]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={st.sumRow}>
        <View style={[st.sumCard, { backgroundColor: c.blueLight }]}>
          <View style={[st.sumIcon, { backgroundColor: c.blue + '20' }]}><Feather name="dollar-sign" size={14} color={c.blue} /></View>
          <Text style={[st.sumValue, { color: c.blue }]}>${sum.revenue.toFixed(2)}</Text>
          <Text style={[st.sumLabel, { color: c.blue }]}>{L.revenue}</Text>
        </View>
        <View style={[st.sumCard, { backgroundColor: c.greenLight }]}>
          <View style={[st.sumIcon, { backgroundColor: c.green + '20' }]}><Feather name="trending-up" size={14} color={c.green} /></View>
          <Text style={[st.sumValue, { color: c.green }]}>${sum.profit.toFixed(2)}</Text>
          <Text style={[st.sumLabel, { color: c.green }]}>{L.profit}</Text>
        </View>
        <View style={st.sumCard}>
          <View style={[st.sumIcon, { backgroundColor: c.bgSecondary }]}><Feather name="shopping-bag" size={14} color={c.textSecondary} /></View>
          <Text style={st.sumValue}>{sum.total_sales}</Text>
          <Text style={st.sumLabel}>{L.totalSales}</Text>
        </View>
      </View>

      {sales.length === 0 ? (
        <View style={st.empty}>
          <View style={st.emptyIcon}><Feather name="file-text" size={36} color={c.textTertiary} /></View>
          <Text style={st.emptyTitle}>{L.noSales}</Text>
        </View>
      ) : (
        <FlatList data={sales} keyExtractor={(s) => s.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={st.separator} />}
          renderItem={({ item: sale }) => {
            const pm = PAY_META[sale.payment_method] ?? { icon: 'credit-card', label: sale.payment_method, color: c.textSecondary };
            const time = new Date(sale.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <Pressable onPress={() => openReceipt(sale)} style={({ pressed }) => [st.saleRow, pressed && { backgroundColor: c.bgSecondary }]}>
                <View style={[st.saleIcon, { backgroundColor: pm.color + '15' }]}><Feather name={pm.icon as any} size={16} color={pm.color} /></View>
                <View style={st.saleInfo}>
                  <Text style={st.saleTitle}>#{sale.id}</Text>
                  <Text style={st.saleSub}>{time} · {sale.items_count} {L.pcs}</Text>
                </View>
                <View style={st.saleRight}>
                  <Text style={st.saleAmount}>${sale.total.toFixed(2)}</Text>
                  {sale.profit > 0 && <Text style={st.saleProfit}>+${sale.profit.toFixed(2)}</Text>}
                </View>
                <Feather name="chevron-right" size={16} color={c.textTertiary} />
              </Pressable>
            );
          }}
        />
      )}

      {/* RECEIPT MODAL */}
      <Modal visible={!!rSale} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.receiptRoot}>
          <View style={st.receiptHeader}>
            <Pressable onPress={() => setRSale(null)} style={{ padding: 4 }}><Feather name="x" size={22} color={c.textSecondary} /></Pressable>
            <Text style={st.receiptTitle}>{L.receipt} #{rSale?.id}</Text>
            <Pressable onPress={shareReceipt} style={{ padding: 4 }}><Feather name="share-2" size={18} color={c.blue} /></Pressable>
          </View>
          {rSale && (
            <ScrollView contentContainerStyle={st.receiptBody}>
              <View style={st.receiptCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={st.receiptShopIcon}><Feather name="shopping-bag" size={18} color={c.blue} /></View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{shopName}</Text>
                </View>
                <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center', marginTop: 4 }}>{new Date(rSale.created_at + 'Z').toLocaleString()}</Text>
                <View style={st.divider} />
                {rItems.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{item.product_name}</Text>
                      <Text style={{ fontSize: 12, color: c.textSecondary }}>{item.quantity} x ${item.price.toFixed(2)}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: Font.mono, color: c.text }}>${item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
                <View style={st.divider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase' }}>{L.total}</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', fontFamily: Font.mono, color: c.blue, letterSpacing: -1 }}>${rSale.total.toFixed(2)}</Text>
                </View>
                {rSale.profit > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: c.textSecondary }}>{L.profit}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', fontFamily: Font.mono, color: c.green }}>+${rSale.profit.toFixed(2)}</Text>
                  </View>
                )}
                <View style={{ alignItems: 'center', marginTop: 14 }}>
                  {(() => {
                    const pm = PAY_META[rSale.payment_method] ?? { icon: 'credit-card', label: rSale.payment_method, color: c.textSecondary };
                    return (
                      <View style={[st.receiptPayBadge, { backgroundColor: pm.color + '12' }]}>
                        <Feather name={pm.icon as any} size={14} color={pm.color} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: pm.color }}>{pm.label}</Text>
                      </View>
                    );
                  })()}
                </View>
              </View>
              <Pressable onPress={() => setRSale(null)} style={st.xirBtn}><Text style={st.xirText}>Xir</Text></Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    headerTitle: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    periodRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    periodBtn: { flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: c.bgSecondary },
    periodBtnOn: { backgroundColor: c.blue },
    periodText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    periodTextOn: { color: c.white },
    sumRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    sumCard: { flex: 1, borderRadius: R.md, padding: 12, alignItems: 'center', gap: 4, backgroundColor: c.bgSecondary },
    sumIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    sumValue: { fontSize: 16, fontWeight: '800', fontFamily: Font.mono, color: c.text },
    sumLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', color: c.textSecondary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.textSecondary },
    separator: { height: 1, backgroundColor: c.borderLight, marginLeft: 72 },
    saleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
    saleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    saleInfo: { flex: 1, gap: 2 },
    saleTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    saleSub: { fontSize: 12, color: c.textSecondary },
    saleRight: { alignItems: 'flex-end', gap: 2, marginRight: 4 },
    saleAmount: { fontSize: 16, fontWeight: '800', fontFamily: Font.mono, color: c.text },
    saleProfit: { fontSize: 11, color: c.green, fontWeight: '600', fontFamily: Font.mono },
    receiptRoot: { flex: 1, backgroundColor: c.bg },
    receiptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    receiptTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    receiptBody: { padding: 20, gap: 16, paddingBottom: 40 },
    receiptCard: { backgroundColor: c.bgSecondary, borderRadius: R.lg, padding: 20, borderWidth: 1, borderColor: c.border },
    receiptShopIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    receiptPayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full },
    xirBtn: { height: 52, borderRadius: R.md, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
    xirText: { color: c.white, fontSize: 16, fontWeight: '700' },
  });
}
