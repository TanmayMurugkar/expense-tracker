import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { CategoryBreakdown } from '../types';
import { formatCurrency } from '../utils/categoryColors';

interface DonutChartProps {
  data: CategoryBreakdown[];
  totalSpend: number;
}

export function DonutChart({ data, totalSpend }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const pieData = data.map((d) => ({
    value: d.total,
    color: d.color,
  }));

  return (
    <View style={styles.container}>
      <PieChart
        data={pieData}
        donut
        radius={120}
        innerRadius={80}
        innerCircleColor="#FFF"
        centerLabelComponent={() => (
          <View style={styles.center}>
            <Text style={styles.totalLabel}>Total Spend</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalSpend)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  totalLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  empty: { height: 240, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
});
