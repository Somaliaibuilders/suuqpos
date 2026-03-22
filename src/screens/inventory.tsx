import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Keyboard, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Font, R, S, type Colors } from '@/constants/theme';
import { L } from '@/constants/strings';
import { useAuth } from '@/context/auth-context';
import { useColors } from '@/context/theme-context';
import { getDb } from '@/db/database';
import { getCategories, addCategory, deleteCategory, categoryProductCount } from '@/db/categories';
import {
  getProducts, adjustStock, deleteProduct, countProducts,
  stockValue, insertProduct, updateProduct, getProduct,
  lowStockProducts,
} from '@/db/products';
import type { Category, Product } from '@/types';

type Props = { onSwitchToAdd?: () => void };

export default function InventoryTab(_props: Props) {
  const { shopName } = useAuth();
  const c = useColors();
  const st = useMemo(() => makeStyles(c), [c]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [catFilter, setCatFilter] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fCost, setFCost] = useState('');
  const [fStock, setFStock] = useState('');
  const [fCatId, setFCatId] = useState(1);

  const [adjProduct, setAdjProduct] = useState<Product | null>(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjMode, setAdjMode] = useState<'in' | 'out'>('in');

  const [showCatMgr, setShowCatMgr] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const load = useCallback(async () => {
    try {
      const db = await getDb();
      const [prods, categories, count, val, lowProds] = await Promise.all([
        getProducts(db, catFilter ?? undefined),
        getCategories(db),
        countProducts(db),
        stockValue(db),
        lowStockProducts(db),
      ]);
      setProducts(prods); setCats(categories); setTotalCount(count);
      setTotalValue(val); setLowCount(lowProds.length);
    } catch {
      Alert.alert('Khalad', 'Xogta lama soo shubi karin.');
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const openAdd = () => {
    setEditId(null);
    setFName(''); setFPrice(''); setFCost(''); setFStock(''); setFCatId(1);
    setShowForm(true);
  };

  const openEdit = async (id: number) => {
    try {
      const db = await getDb();
      const p = await getProduct(db, id);
      if (!p) return;
      setEditId(id); setFName(p.name); setFPrice(p.price.toString());
      setFCost(p.cost.toString()); setFStock(p.stock.toString()); setFCatId(p.category_id);
      setShowForm(true);
    } catch {
      Alert.alert('Khalad', 'Alaabta lama soo shubi karin.');
    }
  };

  const saveProduct = async () => {
    const trimmedName = fName.trim().slice(0, 50);
    if (!trimmedName || !fPrice) return;
    const price = parseFloat(fPrice) || 0;
    const cost = parseFloat(fCost) || 0;
    const stock = parseInt(fStock) || 0;
    if (price < 0 || cost < 0 || stock < 0) {
      Alert.alert('Khalad', 'Qiimaha iyo tirada waa inay ka weyn yihiin 0.');
      return;
    }
    try {
      const db = await getDb();
      if (editId) {
        await updateProduct(db, editId, { name: trimmedName, price, cost, category_id: fCatId });
      } else {
        await insertProduct(db, { name: trimmedName, price, cost, stock, category_id: fCatId });
      }
      setShowForm(false); load();
    } catch {
      Alert.alert('Khalad', 'Alaabta lama keydin karin.');
    }
  };

  const confirmDelete = () => {
    if (!editId) return;
    Alert.alert(L.delete, L.deleteConfirm, [
      { text: L.cancel, style: 'cancel' },
      { text: L.delete, style: 'destructive', onPress: async () => {
        try { await deleteProduct(await getDb(), editId); setShowForm(false); load(); }
        catch { Alert.alert('Khalad', 'Alaabta lama tirtiri karin.'); }
      }},
    ]);
  };

  const confirmStockAdjust = async () => {
    const n = parseInt(adjAmount);
    if (!adjProduct || !n || n <= 0) return;
    try {
      await adjustStock(await getDb(), adjProduct.id, adjMode === 'in' ? n : -n);
      setAdjProduct(null); setAdjAmount(''); load();
    } catch {
      Alert.alert('Khalad', 'Stock-ga lama beddeli karin.');
    }
  };

  const doAddCategory = async () => {
    const catName = newCatName.trim();
    if (!catName) return;
    try { await addCategory(await getDb(), catName); setNewCatName(''); load(); }
    catch { Alert.alert('', 'Qaybta waa jirtaa'); }
  };

  const doDeleteCategory = async (cat: Category) => {
    try {
      const db = await getDb();
      const count = await categoryProductCount(db, cat.id);
      const msg = count > 0
        ? `"${cat.name}" waxaa ku jira ${count} alaab. Alaabta waxaa loo wareejin "Cunto".`
        : `Ma hubtaa inaad tirtirto "${cat.name}"?`;
      Alert.alert(L.delete, msg, [
        { text: L.cancel, style: 'cancel' },
        { text: L.delete, style: 'destructive', onPress: async () => {
          try { await deleteCategory(db, cat.id); if (catFilter === cat.id) setCatFilter(null); load(); }
          catch { Alert.alert('Khalad', 'Qaybta lama tirtiri karin.'); }
        }},
      ]);
    } catch { Alert.alert('Khalad', 'Wax khalad ah ayaa dhacay.'); }
  };

  const handleFName = (t: string) => setFName(t.slice(0, 50));
  const formValid = fName.trim().length > 0 && fPrice.length > 0
    && (parseFloat(fPrice) || 0) >= 0 && (parseFloat(fCost) || 0) >= 0;
  const profitPerUnit = (parseFloat(fPrice) || 0) - (parseFloat(fCost) || 0);

  if (loading) {
    return (
      <SafeAreaView style={st.root} edges={['top']}>
        <View style={st.loadingWrap}><ActivityIndicator size="large" color={c.blue} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={['top']}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Text style={st.headerTitle}>{L.inventory}</Text>
          <Text style={st.headerSub}>{shopName}</Text>
        </View>
        <Pressable onPress={openAdd} style={st.headerBtn}>
          <Feather name="plus" size={20} color={c.white} />
        </Pressable>
      </View>

      <View style={st.statsRow}>
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: c.blueLight }]}>
            <Feather name="package" size={16} color={c.blue} />
          </View>
          <View>
            <Text style={st.statValue}>{totalCount}</Text>
            <Text style={st.statLabel}>Alaab</Text>
          </View>
        </View>
        <View style={st.statDivider} />
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: c.greenLight }]}>
            <Feather name="dollar-sign" size={16} color={c.green} />
          </View>
          <View>
            <Text style={st.statValue}>${totalValue.toFixed(0)}</Text>
            <Text style={st.statLabel}>Qiimo</Text>
          </View>
        </View>
        <View style={st.statDivider} />
        <View style={st.statCard}>
          <View style={[st.statIcon, { backgroundColor: lowCount > 0 ? c.orangeLight : c.bgSecondary }]}>
            <Feather name="alert-triangle" size={16} color={lowCount > 0 ? c.orange : c.textTertiary} />
          </View>
          <View>
            <Text style={[st.statValue, lowCount > 0 && { color: c.orange }]}>{lowCount}</Text>
            <Text style={st.statLabel}>Yar</Text>
          </View>
        </View>
      </View>

      <View style={st.searchContainer}>
        <View style={[st.searchBox, searchFocused && st.searchBoxFocused]}>
          <Feather name="search" size={18} color={c.textTertiary} />
          <TextInput style={st.searchInput} value={search} onChangeText={setSearch}
            placeholder={L.searchHint} placeholderTextColor={c.textTertiary}
            selectionColor={c.blue} onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)} returnKeyType="search" />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={12}>
              <Feather name="x" size={16} color={c.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.catRow} style={{ flexGrow: 0 }}>
        <CatPill c={c} label={L.all} active={catFilter === null} onPress={() => setCatFilter(null)} />
        {cats.map((ct) => (
          <CatPill key={ct.id} c={c} label={ct.name} active={catFilter === ct.id}
            onPress={() => setCatFilter(catFilter === ct.id ? null : ct.id)} />
        ))}
        <Pressable onPress={() => setShowCatMgr(true)} style={st.catManageBtn}>
          <Feather name="sliders" size={16} color={c.textSecondary} />
        </Pressable>
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={st.empty}>
          <View style={st.emptyIcon}><Feather name="inbox" size={40} color={c.textTertiary} /></View>
          <Text style={st.emptyTitle}>{L.noProducts}</Text>
          <Text style={st.emptySub}>{L.noProductsHint}</Text>
          <Pressable onPress={openAdd} style={st.emptyBtn}>
            <Feather name="plus" size={18} color={c.white} />
            <Text style={st.emptyBtnText}>{L.addProduct}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={(p) => p.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={st.separator} />}
          renderItem={({ item: p }) => (
            <ProductRow c={c} product={p} onPress={() => openEdit(p.id)}
              onStockPress={() => { setAdjProduct(p); setAdjMode('in'); setAdjAmount(''); }} />
          )} />
      )}

      {/* ADD/EDIT FORM MODAL */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.modalRoot}>
          <View style={st.modalHeader}>
            <Pressable onPress={() => setShowForm(false)} style={st.modalHeaderBtn}>
              <Feather name="x" size={22} color={c.textSecondary} />
            </Pressable>
            <Text style={st.modalTitle}>{editId ? L.editProduct : L.addProduct}</Text>
            <Pressable onPress={saveProduct} disabled={!formValid}
              style={[st.modalSaveBtn, !formValid && { opacity: 0.3 }]}>
              <Text style={st.modalSaveText}>{L.save}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={st.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={st.fieldGroup}>
              <Text style={st.fieldLabel}>{L.productName}</Text>
              <TextInput style={st.fieldInput} value={fName} onChangeText={handleFName}
                placeholder={L.productNameHint} placeholderTextColor={c.textTertiary}
                selectionColor={c.blue} maxLength={50} autoFocus />
            </View>
            <View style={st.priceRow}>
              <View style={st.priceCol}>
                <Text style={st.fieldLabel}>{L.sellPrice}</Text>
                <View style={st.numericField}>
                  <Text style={st.numericPrefix}>$</Text>
                  <TextInput style={st.numericInput} value={fPrice} onChangeText={setFPrice}
                    placeholder="0.00" placeholderTextColor={c.textTertiary}
                    keyboardType="decimal-pad" selectionColor={c.blue} />
                </View>
              </View>
              <View style={st.priceCol}>
                <Text style={st.fieldLabel}>{L.buyPrice}</Text>
                <View style={st.numericField}>
                  <Text style={st.numericPrefix}>$</Text>
                  <TextInput style={st.numericInput} value={fCost} onChangeText={setFCost}
                    placeholder="0.00" placeholderTextColor={c.textTertiary}
                    keyboardType="decimal-pad" selectionColor={c.blue} />
                </View>
              </View>
            </View>
            {fPrice && fCost && profitPerUnit !== 0 && (
              <View style={[st.profitIndicator, { backgroundColor: profitPerUnit > 0 ? c.greenLight : c.redLight }]}>
                <Feather name={profitPerUnit > 0 ? 'trending-up' : 'trending-down'} size={14}
                  color={profitPerUnit > 0 ? c.green : c.red} />
                <Text style={[st.profitText, { color: profitPerUnit > 0 ? c.green : c.red }]}>
                  {L.profit}: ${Math.abs(profitPerUnit).toFixed(2)} / {L.pcs}
                </Text>
              </View>
            )}
            {!editId && (
              <View style={st.fieldGroup}>
                <Text style={st.fieldLabel}>{L.quantity}</Text>
                <View style={st.numericField}>
                  <TextInput style={[st.numericInput, { paddingLeft: S.md }]} value={fStock}
                    onChangeText={setFStock} placeholder="0" placeholderTextColor={c.textTertiary}
                    keyboardType="number-pad" selectionColor={c.blue} />
                  <Text style={st.numericSuffix}>{L.pcs}</Text>
                </View>
              </View>
            )}
            <View style={st.fieldGroup}>
              <Text style={st.fieldLabel}>{L.category}</Text>
              <View style={st.catSelectRow}>
                {cats.map((ct) => (
                  <CatPill key={ct.id} c={c} label={ct.name} active={fCatId === ct.id}
                    onPress={() => setFCatId(ct.id)} />
                ))}
              </View>
            </View>
            {editId && (
              <Pressable onPress={confirmDelete} style={st.deleteRow}>
                <Feather name="trash-2" size={18} color={c.red} />
                <Text style={st.deleteText}>{L.delete}</Text>
              </Pressable>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* STOCK ADJUST MODAL */}
      <Modal visible={!!adjProduct} animationType="fade" transparent>
        <Pressable style={st.overlay} onPress={() => { setAdjProduct(null); setAdjAmount(''); }}>
          <Pressable style={st.adjSheet} onPress={() => {}}>
            <View style={st.adjHeader}>
              <Text style={st.adjName}>{adjProduct?.name}</Text>
              <View style={st.adjCurrentRow}>
                <Feather name="box" size={14} color={c.textSecondary} />
                <Text style={st.adjCurrent}>{adjProduct?.stock} {L.pcs}</Text>
              </View>
            </View>
            <View style={st.adjModeRow}>
              <Pressable onPress={() => setAdjMode('in')}
                style={[st.adjModeBtn, adjMode === 'in' && st.adjModeInActive]}>
                <Feather name="arrow-down-left" size={16} color={adjMode === 'in' ? c.blue : c.textTertiary} />
                <Text style={[st.adjModeText, adjMode === 'in' && { color: c.blue }]}>{L.stockIn}</Text>
              </Pressable>
              <Pressable onPress={() => setAdjMode('out')}
                style={[st.adjModeBtn, adjMode === 'out' && st.adjModeOutActive]}>
                <Feather name="arrow-up-right" size={16} color={adjMode === 'out' ? c.red : c.textTertiary} />
                <Text style={[st.adjModeText, adjMode === 'out' && { color: c.red }]}>{L.stockOut}</Text>
              </Pressable>
            </View>
            <TextInput style={st.adjInput} value={adjAmount} onChangeText={setAdjAmount}
              keyboardType="number-pad" placeholder="0" placeholderTextColor={c.textTertiary}
              autoFocus selectionColor={c.blue} />
            {adjAmount && parseInt(adjAmount) > 0 && adjProduct && (
              <View style={st.adjPreview}>
                <Text style={st.adjPreviewText}>
                  {adjProduct.stock}
                  <Text style={{ color: adjMode === 'in' ? c.blue : c.red }}>
                    {' '}{adjMode === 'in' ? '+' : '−'} {adjAmount}{' '}
                  </Text>
                  = {Math.max(0, adjProduct.stock + (adjMode === 'in' ? parseInt(adjAmount) : -parseInt(adjAmount)))} {L.pcs}
                </Text>
              </View>
            )}
            <View style={st.adjActions}>
              <Pressable onPress={() => { setAdjProduct(null); setAdjAmount(''); }} style={st.adjCancelBtn}>
                <Text style={st.adjCancelText}>{L.cancel}</Text>
              </Pressable>
              <Pressable onPress={confirmStockAdjust}
                disabled={!adjAmount || parseInt(adjAmount) <= 0}
                style={[st.adjConfirmBtn, { backgroundColor: adjMode === 'in' ? c.blue : c.red },
                  (!adjAmount || parseInt(adjAmount) <= 0) && { opacity: 0.3 }]}>
                <Feather name="check" size={18} color={c.white} />
                <Text style={st.adjConfirmText}>{L.confirm}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CATEGORY MANAGER MODAL */}
      <Modal visible={showCatMgr} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={st.modalRoot}>
          <View style={st.modalHeader}>
            <Pressable onPress={() => setShowCatMgr(false)} style={st.modalHeaderBtn}>
              <Feather name="x" size={22} color={c.textSecondary} />
            </Pressable>
            <Text style={st.modalTitle}>Qaybaha</Text>
            <View style={{ width: 70 }} />
          </View>
          <View style={st.formContent}>
            <View style={st.catAddRow}>
              <TextInput style={st.catAddInput} value={newCatName} onChangeText={setNewCatName}
                placeholder="Qaybta cusub..." placeholderTextColor={c.textTertiary}
                selectionColor={c.blue} returnKeyType="done" onSubmitEditing={doAddCategory} />
              <Pressable onPress={doAddCategory} disabled={!newCatName.trim()}
                style={[st.catAddBtn, !newCatName.trim() && { opacity: 0.3 }]}>
                <Feather name="plus" size={20} color={c.white} />
              </Pressable>
            </View>
            <ScrollView style={st.catList}>
              {cats.map((cat) => (
                <View key={cat.id} style={st.catListRow}>
                  <View style={st.catListIcon}><Feather name="tag" size={16} color={c.blue} /></View>
                  <Text style={st.catListName}>{cat.name}</Text>
                  <Pressable onPress={() => doDeleteCategory(cat)} hitSlop={12} style={st.catListDelete}>
                    <Feather name="trash-2" size={16} color={c.red} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const ProductRow = memo(function ProductRow({ c, product: p, onPress, onStockPress }: { c: Colors; product: Product; onPress: () => void; onStockPress: () => void }) {
  const low = p.stock > 0 && p.stock <= 5;
  const out = p.stock <= 0;
  const profit = p.price - p.cost;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 20, paddingVertical: 16 },
      pressed && { backgroundColor: c.bgSecondary },
    ]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }} numberOfLines={1}>{p.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, fontFamily: Font.mono }}>${p.price.toFixed(2)}</Text>
          {profit > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.greenLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Feather name="trending-up" size={10} color={c.green} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.green, fontFamily: Font.mono }}>+${profit.toFixed(2)}</Text>
            </View>
          )}
          {p.category_name && <Text style={{ fontSize: 13, color: c.textTertiary }}>{p.category_name}</Text>}
        </View>
      </View>
      <Pressable onPress={onStockPress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[
          { minWidth: 48, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.sm, alignItems: 'center' as const },
          out && { backgroundColor: c.redLight },
          low && !out && { backgroundColor: c.orangeLight },
          !low && !out && { backgroundColor: c.blueLight },
        ]}>
          <Text style={{ fontSize: 17, fontWeight: '800', fontFamily: Font.mono, color: out ? c.red : low ? c.orange : c.blue }}>{p.stock}</Text>
        </View>
        <Feather name="chevron-right" size={14} color={c.textTertiary} style={{ marginLeft: 4 }} />
      </Pressable>
    </Pressable>
  );
});

const CatPill = memo(function CatPill({ c, label, active, onPress }: { c: Colors; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[
      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full, backgroundColor: c.bgSecondary },
      active && { backgroundColor: c.blue },
    ]}>
      <Text style={[{ fontSize: 13, fontWeight: '600', color: c.textSecondary }, active && { color: c.white }]}>{label}</Text>
    </Pressable>
  );
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    headerLeft: { gap: 2 },
    headerTitle: { fontSize: 26, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    headerSub: { fontSize: 14, color: c.textSecondary },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
    statsRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingVertical: 14, paddingHorizontal: 4, marginBottom: 12 },
    statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 18, fontWeight: '700', color: c.text, fontFamily: Font.mono },
    statLabel: { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
    statDivider: { width: 1, backgroundColor: c.border, marginVertical: 4 },
    searchContainer: { paddingHorizontal: 20, marginBottom: 8 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: 14, height: 44, gap: 10, borderWidth: 1.5, borderColor: 'transparent' },
    searchBoxFocused: { borderColor: c.blue },
    searchInput: { flex: 1, fontSize: 15, color: c.text, height: '100%' },
    catRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
    catManageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: c.text },
    emptySub: { fontSize: 14, color: c.textSecondary },
    emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.blue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: R.md, marginTop: 8 },
    emptyBtnText: { color: c.white, fontSize: 15, fontWeight: '600' },
    separator: { height: 1, backgroundColor: c.borderLight, marginLeft: 20 },
    modalRoot: { flex: 1, backgroundColor: c.bg },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    modalHeaderBtn: { padding: 4 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    modalSaveBtn: { backgroundColor: c.blue, paddingHorizontal: 18, paddingVertical: 8, borderRadius: R.sm },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: c.white },
    formContent: { padding: 20, gap: 20, paddingBottom: 60 },
    fieldGroup: { gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: { height: 52, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: 16, fontSize: 17, color: c.text, borderWidth: 1, borderColor: c.border },
    priceRow: { flexDirection: 'row', gap: 12 },
    priceCol: { flex: 1, gap: 6 },
    numericField: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgSecondary, borderRadius: R.md, borderWidth: 1, borderColor: c.border },
    numericPrefix: { fontSize: 17, fontWeight: '600', color: c.textSecondary, paddingLeft: 16, fontFamily: Font.mono },
    numericSuffix: { fontSize: 14, fontWeight: '500', color: c.textSecondary, paddingRight: 16 },
    numericInput: { flex: 1, height: 52, fontSize: 17, fontWeight: '600', color: c.text, paddingHorizontal: 8, fontFamily: Font.mono },
    profitIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.sm },
    profitText: { fontSize: 14, fontWeight: '600' },
    catSelectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: R.md, backgroundColor: c.redLight, marginTop: 8 },
    deleteText: { fontSize: 15, fontWeight: '600', color: c.red },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    adjSheet: { backgroundColor: c.bg, borderRadius: R.lg, padding: 24, gap: 16, elevation: 8 },
    adjHeader: { alignItems: 'center', gap: 6 },
    adjName: { fontSize: 18, fontWeight: '700', color: c.text },
    adjCurrentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    adjCurrent: { fontSize: 14, color: c.textSecondary },
    adjModeRow: { flexDirection: 'row', gap: 8 },
    adjModeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: R.sm, backgroundColor: c.bgSecondary, borderWidth: 1.5, borderColor: 'transparent' },
    adjModeInActive: { borderColor: c.blue, backgroundColor: c.blueLight },
    adjModeOutActive: { borderColor: c.red, backgroundColor: c.redLight },
    adjModeText: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
    adjInput: { height: 64, backgroundColor: c.bgSecondary, borderRadius: R.md, fontSize: 32, fontWeight: '800', textAlign: 'center', color: c.text, fontFamily: Font.mono, borderWidth: 1.5, borderColor: c.border },
    adjPreview: { backgroundColor: c.bgSecondary, borderRadius: R.sm, paddingVertical: 10, paddingHorizontal: 14 },
    adjPreviewText: { fontSize: 14, color: c.textSecondary, textAlign: 'center', fontFamily: Font.mono },
    adjActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    adjCancelBtn: { flex: 1, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.border },
    adjCancelText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
    adjConfirmBtn: { flex: 1, height: 48, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    adjConfirmText: { fontSize: 15, fontWeight: '700', color: c.white },
    catAddRow: { flexDirection: 'row', gap: 10 },
    catAddInput: { flex: 1, height: 48, backgroundColor: c.bgSecondary, borderRadius: R.md, paddingHorizontal: 16, fontSize: 16, color: c.text, borderWidth: 1, borderColor: c.border },
    catAddBtn: { width: 48, height: 48, borderRadius: R.md, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' },
    catList: { marginTop: 8 },
    catListRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderLight },
    catListIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center' },
    catListName: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text },
    catListDelete: { padding: 8 },
  });
}
