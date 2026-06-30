import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionRow } from '../components/TransactionRow';
import { fetchTransactions, updateTransactionCategory } from '../services/transactions';
import { CATEGORY_COLORS } from '../utils/categoryColors';
import { CATEGORIES, Category, Transaction, TransactionType } from '../types';

type TypeFilter = TransactionType | 'all';

export function LedgerScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);

  const load = useCallback(async () => {
    try {
      const txns = await fetchTransactions();
      setTransactions(txns);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (!q) return true;
      return (
        (t.clean_merchant ?? '').toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [transactions, query, typeFilter]);

  async function handleRecategorize(category: Category) {
    if (!editing) return;
    const target = editing;
    setEditing(null);
    // Optimistic update, then persist (RLS scopes the write to the owner).
    setTransactions((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, category } : t)),
    );
    try {
      await updateTransactionCategory(target.id, category);
    } catch {
      load(); // revert to server state on failure
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>Transactions</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#AAA" />
        <TextInput
          style={styles.search}
          placeholder="Search merchant or category"
          placeholderTextColor="#AAA"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color="#CCC" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'debit', 'credit'] as TypeFilter[]).map((f) => {
          const active = typeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setTypeFilter(f)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'debit' ? 'Spends' : 'Credits'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#4ECDC4" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TransactionRow transaction={item} onPress={setEditing} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {transactions.length === 0
                ? 'No transactions yet — upload a statement to get started.'
                : 'No matches for your search.'}
            </Text>
          }
        />
      )}

      {/* Recategorize modal */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Change category</Text>
            <Text style={styles.sheetSub} numberOfLines={1}>
              {editing?.clean_merchant ?? editing?.description}
            </Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => {
                const active = editing?.category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => handleRecategorize(c)}
                  >
                    <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[c] }]} />
                    <Text style={styles.catText}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  search: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1A1A2E' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ECECEC',
  },
  filterChipActive: { backgroundColor: '#4ECDC4' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888' },
  filterTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14, paddingHorizontal: 30, lineHeight: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  sheetSub: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  catChipActive: { borderColor: '#4ECDC4', backgroundColor: '#F0FFFE' },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catText: { fontSize: 13, color: '#333', fontWeight: '500' },
});
