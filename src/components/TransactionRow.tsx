import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction } from '../types';
import { CATEGORY_COLORS, formatCurrency } from '../utils/categoryColors';

interface Props {
  transaction: Transaction;
  onPress: (t: Transaction) => void;
}

export function TransactionRow({ transaction: t, onPress }: Props) {
  const isCredit = t.transaction_type === 'credit';
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(t)} activeOpacity={0.6}>
      <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[t.category] }]} />
      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1}>
          {t.clean_merchant ?? t.description}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t.transaction_date} · {t.category}
        </Text>
      </View>
      <Text style={[styles.amount, isCredit && styles.credit]}>
        {isCredit ? '+' : '-'}{formatCurrency(t.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  middle: { flex: 1, marginRight: 12 },
  merchant: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  meta: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  credit: { color: '#0E9F6E' },
});
