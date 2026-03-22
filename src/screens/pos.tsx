import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Keyboard, Modal, Pressable, ScrollView, Share,
  StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { BP, Font, R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { useColors } from '@/context/theme-context';
import { getDb } from '@/db/database';
import { getProducts } from '@/db/products';
import { getCategories } from '@/db/categories';
import { createSale, todayRevenue, todaySalesCount } from '@/db/sales';
import type { CartItem, Category, Product } from '@/types';

const PAYMENTS = [
  { key: 'cash', label: 'Lacag (Cash)', icon: 'dollar-sign' as const, color: '#16A34A' },
  { key: 'evc', label: 'EVC Plus', icon: 'smartphone' as const, color: '#EA580C' },
  { key: 'zaad', label: 'Zaad', icon: 'credit-card' as const, color: '#7C3AED' },
  { key: 'sahal', label: 'Sahal', icon: 'zap' as const, color: '#0891B2' },
  { key: 'edahab', label: 'eDahab', icon: 'send' as const, color: '#059669' },
] as const;

type ReceiptData = {
  saleId: number; items: CartItem[]; total: number; profit: number;
  change: number; method: string; amountPaid: number; date: string;
};

export default function POSTab() {
  const { shopName } = useAuth();
  const cart = useCart();
  const c = useColors();
  const st = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [catF, setCatF] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [todayRev, setTodayRev] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const numColumns = width < BP.phone ? 2 : width < BP.tablet ? 3 : width < BP.tabletLg ? 4 : 5;

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const [p, cs, rev, cnt] = await Promise.all([
        getProducts(db, catF ?? undefined), getCategories(db),
        todayRevenue(db), todaySalesCount(db),
      ]);
      setProducts(p); setCats(cs); setTodayRev(rev); setTodayCount(cnt);
    } catch {} finally { setLoading(false); }
  }, [catF]);

  useEffect(() => { load(); }, [load]);

  const filtered = query
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : products;

  const openCheckout = () => {
    if (!cart.items.length) return;
    setSelectedMethod(null); setCashReceived(''); setShowCheckout(true);
  };

  const confirmSale = async () => {
    if (!selectedMethod || !cart.items.length) return;
    const paid = selectedMethod === 'cash' ? parseFloat(cashReceived) || cart.total : cart.total;
    if (selectedMethod === 'cash' && paid < cart.total) return;
    try {
      const db = await getDb();
      const currentProducts = await getProducts(db);
      const stockIssues: string[] = [];
      for (const item of cart.items) {
        const cur = currentProducts.find((p) => p.id === item.product_id);
        if (!cur || cur.stock < item.quantity) {
          stockIssues.push(`${item.name}: ${cur?.stock ?? 0} hartida (${item.quantity} la doonayo)`);
        }
      }
      if (stockIssues.length > 0) { Alert.alert('Stock-ga kuma filna', stockIssues.join('\n')); return; }
      const result = await createSale(db, cart.items, selectedMethod, paid);
      setReceipt({ saleId: result.saleId, items: [...cart.items], total: result.total, profit: result.profit,
        change: result.change, method: selectedMethod, amountPaid: paid, date: new Date().toLocaleString() });
      cart.clear(); setShowCheckout(false); load();
    } catch { Alert.alert('Khalad', 'Iibka lama diiwaangelin karin.'); }
  };

  const shareReceipt = async () => {
    if (!receipt) return;
    const lines = [`--- ${shopName} ---`, `Rasiidh #${receipt.saleId}`, receipt.date, '',
      ...receipt.items.map((i) => `${i.name}  x${i.quantity}  $${(i.price * i.quantity).toFixed(2)}`),
      '', `WADARTA: $${receipt.total.toFixed(2)}`, `Lacag la bixiyay: $${receipt.amountPaid.toFixed(2)}`,
      receipt.change > 0 ? `Celinta: $${receipt.change.toFixed(2)}` : '',
      `Habka: ${PAYMENTS.find((p) => p.key === receipt.method)?.label ?? receipt.method}`, '', 'Waad ku mahadsan tahay!',
    ].filter(Boolean).join('\n');
    await Share.share({ message: lines });
  };

  const cashChange = selectedMethod === 'cash' && cashReceived ? (parseFloat(cashReceived) || 0) - cart.total : 0;

  if (loading) {
    return <SafeAreaView style={st.root} edges={['top']}><View style={st.loadingWrap}><ActivityIndicator size="large" color={c.blue} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Text style={st.headerTitle}>Iib</Text>
          <View style={st.todayStats}>
            <Feather name="trending-up" size={12} color={c.green} />
            <Text style={st.todayText}>${todayRev.toFixed(2)} maanta</Text>
            <View style={st.todayDot} />
            <Text style={st.todayText}>{todayCount} iib</Text>
          </View>
        </View>
        {cart.count > 0 && (
          <Pressable onPress={openCheckout} style={st.checkoutBtn}>
            <Feather name="shopping-bag" size={18} color={c.white} />
            <Text style={st.checkoutBtnText}>{cart.count}</Text>
          </Pressable>
        )}
      </View>

      <View style={st.searchWrap}>
        <View style={st.searchBox}>
          <Feather name="search" size={18} color={c.textTertiary} />
          <TextInput style={st.searchInput} value={query} onChangeText={setQuery}
            placeholder={L.searchHint} placeholderTextColor={c.textTertiary} selectionColor={c.blue} returnKeyType="search" />
          {query.length > 0 && <Pressable onPress={() => setQuery('')} hitSlop={12}><Feather name="x" size={16} color={c.textTertiary} /></Pressable>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow} style={{ flexGrow: 0 }}>
        <CatPill c={c} label={L.all} active={!catF} onPress={() => setCatF(null)} />
        {cats.map((ct) => <CatPill key={ct.id} c={c} label={ct.name} active={catF === ct.id} onPress={() => setCatF(catF === ct.id ? null : ct.id)} />)}
      </ScrollView>

      <FlatList key={numColumns} data={filtered} keyExtractor={(p) => p.id.toString()}
        numColumns={numColumns} contentContainerStyle={st.grid} columnWrapperStyle={st.gridRow}
        renderItem={({ item: p }) => {
          const out = p.stock <= 0;
          const inCart = cart.items.find((i) => i.product_id === p.id);
          return (
            <Pressable onPress={() => cart.add(p)} disabled={out}
              style={({ pressed }) => [st.prodCard, { opacity: out ? 0.3 : 1 }, pressed && !out && st.prodCardPressed, inCart && st.prodCardInCart]}>
              <Text style={st.prodName} numberOfLines={2}>{p.name}</Text>
              <Text style={st.prodPrice}>${p.price.toFixed(2)}</Text>
              <View style={st.prodBottom}>
                <Text style={[st.prodStock, out && { color: c.red }]}>{out ? 'Dhamaaday' : `${p.stock}`}</Text>
                {inCart && <View style={st.inCartBadge}><Text style={st.inCartText}>{inCart.quantity}</Text></View>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<View style={st.empty}><View style={st.emptyIcon}><Feather name="inbox" size={36} color={c.textTertiary} /></View><Text style={st.emptyText}>{L.noProducts}</Text></View>}
      />

      {cart.items.length > 0 && (
        <View style={st.cartBar}>
          <ScrollView style={st.cartScroll} nestedScrollEnabled>
            {cart.items.map((item) => (
              <View key={item.product_id} style={st.cartRow}>
                <View style={st.cartInfo}>
                  <Text style={st.cartName} numberOfLines={1}>{item.name}</Text>
                  <Text style={st.cartPrice}>${item.price.toFixed(2)}</Text>
                </View>
                <View style={st.qtyControls}>
                  <Pressable onPress={() => cart.dec(item.product_id)} style={st.qtyBtn}><Feather name="minus" size={16} color={c.text} /></Pressable>
                  <Text style={st.qtyText}>{item.quantity}</Text>
                  <Pressable onPress={() => cart.inc(item.product_id)}
                    style={[st.qtyBtnPlus, item.quantity >= item.stock && { opacity: 0.3 }]}><Feather name="plus" size={16} color={c.blue} /></Pressable>
                </View>
                <Text style={st.cartSubtotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                <Pressable onPress={() => cart.rem(item.product_id)} hitSlop={8} style={{ padding: 4, marginLeft: 4 }}><Feather name="x" size={14} color={c.textTertiary} /></Pressable>
              </View>
            ))}
          </ScrollView>
          <View style={st.cartFooter}>
            <View>
              <Text style={st.totalLabel}>{L.total}</Text>
              <Text style={st.totalValue}>${cart.total.toFixed(2)}</Text>
            </View>
            <Pressable onPress={openCheckout} style={st.payNowBtn}>
              <Feather name="arrow-right" size={18} color={c.white} />
              <Text style={st.payNowText}>Iib</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* CHECKOUT MODAL */}
      <Modal visible={showCheckout} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.checkoutRoot}>
          <View style={st.checkoutHeader}>
            <Pressable onPress={() => setShowCheckout(false)} style={{ padding: 4 }}><Feather name="x" size={22} color={c.textSecondary} /></Pressable>
            <Text style={st.checkoutTitle}>Bixinta</Text>
            <View style={{ width: 30 }} />
          </View>
          <ScrollView contentContainerStyle={st.checkoutBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={st.summaryCard}>
              <Text style={st.summaryTitle}>Liiska</Text>
              {cart.items.map((item) => (
                <View key={item.product_id} style={st.summaryRow}>
                  <Text style={st.summaryItemName}>{item.name} x{item.quantity}</Text>
                  <Text style={st.summaryItemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={st.summaryDivider} />
              <View style={st.summaryRow}>
                <Text style={st.summaryTotalLabel}>{L.total}</Text>
                <Text style={st.summaryTotalValue}>${cart.total.toFixed(2)}</Text>
              </View>
            </View>
            <Text style={st.sectionLabel}>Habka lacag bixinta</Text>
            <View style={{ gap: 10 }}>
              {PAYMENTS.map((pm) => (
                <Pressable key={pm.key} onPress={() => { setSelectedMethod(pm.key); setCashReceived(''); }}
                  style={[st.paymentOption, selectedMethod === pm.key && { borderColor: pm.color, backgroundColor: pm.color + '0A' }]}>
                  <View style={[st.paymentIcon, { backgroundColor: pm.color + '15' }]}><Feather name={pm.icon} size={20} color={pm.color} /></View>
                  <Text style={[st.paymentLabel, selectedMethod === pm.key && { color: pm.color, fontWeight: '700' }]}>{pm.label}</Text>
                  {selectedMethod === pm.key && <View style={[st.paymentCheck, { backgroundColor: pm.color }]}><Feather name="check" size={12} color={c.white} /></View>}
                </Pressable>
              ))}
            </View>
            {selectedMethod === 'cash' && (
              <View style={{ gap: 12 }}>
                <Text style={st.sectionLabel}>Lacagta la bixiyay</Text>
                <View style={st.cashInputWrap}>
                  <Text style={st.cashPrefix}>$</Text>
                  <TextInput style={st.cashInput} value={cashReceived} onChangeText={setCashReceived}
                    placeholder={cart.total.toFixed(2)} placeholderTextColor={c.textTertiary}
                    keyboardType="decimal-pad" selectionColor={c.blue} autoFocus />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[cart.total, Math.ceil(cart.total), Math.ceil(cart.total / 5) * 5, Math.ceil(cart.total / 10) * 10]
                    .filter((v, i, a) => a.indexOf(v) === i && v >= cart.total).slice(0, 4)
                    .map((amt) => (
                      <Pressable key={amt} onPress={() => setCashReceived(amt.toString())} style={st.quickBtn}>
                        <Text style={st.quickBtnText}>${amt.toFixed(2)}</Text>
                      </Pressable>
                    ))}
                </View>
                {cashChange > 0 && (
                  <View style={st.changeCard}>
                    <Feather name="repeat" size={16} color={c.blue} />
                    <View><Text style={{ fontSize: 12, color: c.textSecondary }}>Celinta (change)</Text>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: c.blue, fontFamily: Font.mono }}>${cashChange.toFixed(2)}</Text></View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
          <View style={st.confirmWrap}>
            <Pressable onPress={confirmSale}
              disabled={!selectedMethod || (selectedMethod === 'cash' && cashReceived !== '' && (parseFloat(cashReceived) || 0) < cart.total)}
              style={[st.confirmBtn,
                { backgroundColor: selectedMethod ? (PAYMENTS.find((p) => p.key === selectedMethod)?.color ?? c.blue) : c.textTertiary },
                (!selectedMethod || (selectedMethod === 'cash' && cashReceived !== '' && (parseFloat(cashReceived) || 0) < cart.total)) && { opacity: 0.35 }]}>
              <Feather name="check-circle" size={20} color={c.white} />
              <Text style={st.confirmText}>Xaqiiji iibka  ·  ${cart.total.toFixed(2)}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* RECEIPT MODAL */}
      <Modal visible={!!receipt} animationType="fade" transparent>
        <View style={st.receiptOverlay}>
          <View style={st.receiptSheet}>
            {receipt && (<>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={st.receiptCheckCircle}><Feather name="check" size={28} color={c.white} /></View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>Waa la iibiyay!</Text>
              </View>
              <View style={st.receiptCard}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center' }}>{shopName}</Text>
                <Text style={{ fontSize: 12, color: c.textSecondary, textAlign: 'center' }}>{receipt.date}</Text>
                <Text style={{ fontSize: 12, color: c.textTertiary, textAlign: 'center' }}>#{receipt.saleId}</Text>
                <View style={st.receiptDivider} />
                {receipt.items.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
                    <Text style={{ flex: 1, fontSize: 14, color: c.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, color: c.textSecondary, marginRight: 12 }}>x{item.quantity}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, fontFamily: Font.mono }}>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={st.receiptDivider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>WADARTA</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: c.blue, fontFamily: Font.mono }}>${receipt.total.toFixed(2)}</Text>
                </View>
                {receipt.method === 'cash' && (<>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: c.textSecondary }}>La bixiyay</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, fontFamily: Font.mono }}>${receipt.amountPaid.toFixed(2)}</Text>
                  </View>
                  {receipt.change > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: c.textSecondary }}>Celinta</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: c.blue, fontFamily: Font.mono }}>${receipt.change.toFixed(2)}</Text>
                    </View>
                  )}
                </>)}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                  <Feather name={(PAYMENTS.find((p) => p.key === receipt.method)?.icon ?? 'credit-card') as any} size={14} color={c.textSecondary} />
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>{PAYMENTS.find((p) => p.key === receipt.method)?.label ?? receipt.method}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={shareReceipt} style={st.shareBtn}><Feather name="share-2" size={16} color={c.blue} /><Text style={{ fontSize: 15, fontWeight: '600', color: c.blue }}>Share</Text></Pressable>
                <Pressable onPress={() => setReceipt(null)} style={st.doneBtn}><Text style={{ color: c.white, fontSize: 15, fontWeight: '700' }}>Xir</Text></Pressable>
              </View>
            </>)}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CatPill = memo(function CatPill({ c, label, active, onPress }: { c: Colors; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full, backgroundColor: c.bgSecondary }, active && { backgroundColor: c.blue }]}>
      <Text style={[{ fontSize: 13, fontWeight: '600', color: c.textSecondary }, active && { color: c.white }]}>{label}</Text>
    </Pressable>
  );
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    headerLeft: { gap: 4 },
    headerTitle: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    todayStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    todayText: { fontSize: 13, color: c.textSecondary },
    todayDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.textTertiary },
    checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.md },
    checkoutBtnText: { color: c.white, fontSize: 15, fontWeight: '700' },
    searchWrap: { paddingHorizontal: 20, marginBottom: 8 },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    catRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
    grid: { padding: 8, gap: 8, paddingBottom: 300 },
    gridRow: { gap: 8 },
    prodCard: { flex: 1, borderRadius: R.md, padding: 10, gap: 4, minHeight: 96, justifyContent: 'space-between', backgroundColor: c.bgSecondary, borderWidth: 1.5, borderColor: 'transparent' },
    prodCardPressed: { backgroundColor: c.blueLight },
    prodCardInCart: { borderColor: c.blue },
    prodName: { fontSize: 13, fontWeight: '600', color: c.text, lineHeight: 17 },
    prodPrice: { fontSize: 16, fontWeight: '800', color: c.blue, fontFamily: Font.mono },
    prodBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    prodStock: { fontSize: 11, color: c.textSecondary },
    inCartBadge: { backgroundColor: c.blue, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    inCartText: { color: c.white, fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 15, color: c.textSecondary },
    cartBar: { borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg, maxHeight: 340 },
    cartScroll: { maxHeight: 180 },
    cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: c.borderLight, gap: 8 },
    cartInfo: { flex: 1, gap: 1 },
    cartName: { fontSize: 14, fontWeight: '600', color: c.text },
    cartPrice: { fontSize: 12, color: c.textSecondary, fontFamily: Font.mono },
    qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    qtyBtnPlus: { width: 30, height: 30, borderRadius: 8, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.blue + '30' },
    qtyText: { fontSize: 15, fontWeight: '700', color: c.text, minWidth: 20, textAlign: 'center', fontFamily: Font.mono },
    cartSubtotal: { fontSize: 14, fontWeight: '700', color: c.text, fontFamily: Font.mono, minWidth: 50, textAlign: 'right' },
    cartFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: 88 },
    totalLabel: { fontSize: 11, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase' },
    totalValue: { fontSize: 26, fontWeight: '800', color: c.blue, fontFamily: Font.mono, letterSpacing: -1 },
    payNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.blue, paddingHorizontal: 24, paddingVertical: 14, borderRadius: R.md },
    payNowText: { color: c.white, fontSize: 16, fontWeight: '700' },
    checkoutRoot: { flex: 1, backgroundColor: c.bg },
    checkoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    checkoutTitle: { fontSize: 18, fontWeight: '700', color: c.text },
    checkoutBody: { padding: 20, gap: 24, paddingBottom: 120 },
    summaryCard: { backgroundColor: c.bgSecondary, borderRadius: R.md, padding: 16, gap: 10 },
    summaryTitle: { fontSize: 12, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryItemName: { fontSize: 14, color: c.text },
    summaryItemTotal: { fontSize: 14, fontWeight: '600', color: c.text, fontFamily: Font.mono },
    summaryDivider: { height: 1, backgroundColor: c.border },
    summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    summaryTotalValue: { fontSize: 20, fontWeight: '800', color: c.blue, fontFamily: Font.mono },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: R.md, backgroundColor: c.bgSecondary, borderWidth: 1.5, borderColor: c.border },
    paymentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    paymentLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: c.text },
    paymentCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    cashInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgSecondary, borderRadius: R.md, borderWidth: 1.5, borderColor: c.border },
    cashPrefix: { fontSize: 22, fontWeight: '700', color: c.textSecondary, paddingLeft: 16, fontFamily: Font.mono },
    cashInput: { flex: 1, height: 60, fontSize: 28, fontWeight: '800', color: c.text, paddingHorizontal: 8, fontFamily: Font.mono },
    quickBtn: { flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: c.bgSecondary, borderWidth: 1, borderColor: c.border },
    quickBtnText: { fontSize: 14, fontWeight: '600', color: c.text, fontFamily: Font.mono },
    changeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.blueLight, padding: 14, borderRadius: R.md },
    confirmWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.border },
    confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: R.md },
    confirmText: { color: c.white, fontSize: 17, fontWeight: '700' },
    receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    receiptSheet: { backgroundColor: c.bg, borderRadius: R.lg, padding: 24, gap: 20, elevation: 8 },
    receiptCheckCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' },
    receiptCard: { backgroundColor: c.bgSecondary, borderRadius: R.md, padding: 16, gap: 6 },
    receiptDivider: { height: 1, backgroundColor: c.border, marginVertical: 8 },
    shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: R.md, borderWidth: 1.5, borderColor: c.blue },
    doneBtn: { flex: 1, height: 48, borderRadius: R.md, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
  });
}
