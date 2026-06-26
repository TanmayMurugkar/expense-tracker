import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VictoryPie, VictoryLabel } from 'victory-native';
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

  const chartData = data.map((d) => ({
    x: d.category,
    y: d.total,
    color: d.color,
  }));

  return (
    <View style={styles.container}>
      <VictoryPie
        data={chartData}
        colorScale={data.map((d) => d.color)}
        innerRadius={80}
        radius={120}
        width={280}
        height={280}
        padding={20}
        labels={() => null}
        animate={{ duration: 500 }}
      />
      <View style={styles.center}>
        <Text style={styles.totalLabel}>Total Spend</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalSpend)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  empty: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
