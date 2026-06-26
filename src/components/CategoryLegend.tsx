import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { CategoryBreakdown } from '../types';
import { formatCurrency } from '../utils/categoryColors';

interface CategoryLegendProps {
  data: CategoryBreakdown[];
}

export function CategoryLegend({ data }: CategoryLegendProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.category}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>{item.category}</Text>
          <View style={styles.right}>
            <Text style={styles.amount}>{formatCurrency(item.total)}</Text>
            <Text style={styles.percent}>{item.percentage}%</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  percent: {
    fontSize: 11,
    color: '#888',
  },
});
