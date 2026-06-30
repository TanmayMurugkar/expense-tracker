import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Category, CategoryBreakdown } from '../types';
import { formatCurrency } from '../utils/categoryColors';

interface CategoryLegendProps {
  data: CategoryBreakdown[];
  selected?: Category | null;
  onSelect?: (category: Category | null) => void;
}

export function CategoryLegend({ data, selected, onSelect }: CategoryLegendProps) {
  return (
    <View>
      {data.map((item) => {
        const isSelected = selected === item.category;
        const dimmed = selected != null && !isSelected;
        return (
          <TouchableOpacity
            key={item.category}
            style={[styles.row, isSelected && styles.rowSelected]}
            activeOpacity={onSelect ? 0.6 : 1}
            onPress={() => onSelect?.(isSelected ? null : item.category)}
          >
            <View style={[styles.dot, { backgroundColor: item.color }, dimmed && styles.dimmed]} />
            <Text style={[styles.label, dimmed && styles.dimmed]}>{item.category}</Text>
            <View style={styles.right}>
              <Text style={[styles.amount, dimmed && styles.dimmed]}>
                {formatCurrency(item.total)}
              </Text>
              <Text style={styles.percent}>{item.percentage}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowSelected: { backgroundColor: '#F0FFFE' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  label: { flex: 1, fontSize: 14, color: '#333' },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  percent: { fontSize: 11, color: '#888' },
  dimmed: { opacity: 0.4 },
});
