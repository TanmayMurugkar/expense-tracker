import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/categoryColors';

interface Props {
  transactions: Transaction[];
}

/** Buckets debit spend into the last 6 weeks and renders a bar per week. */
export function SpendBarChart({ transactions }: Props) {
  const buckets = buildWeeklySpend(transactions);

  if (buckets.every((d) => d.value === 0)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spend to chart yet</Text>
      </View>
    );
  }

  const maxValue = Math.max(...buckets.map((b) => b.value), 1);
  const total = buckets.reduce((s, d) => s + d.value, 0);

  return (
    <View>
      <BarChart
        data={buckets}
        barWidth={22}
        barBorderRadius={4}
        frontColor="#4ECDC4"
        spacing={18}
        noOfSections={3}
        maxValue={Math.ceil(maxValue * 1.15)}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        formatYLabel={(v: string) =>
          Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v
        }
        isAnimated
      />
      <Text style={styles.caption}>Total last 6 weeks: {formatCurrency(total)}</Text>
    </View>
  );
}

interface Bar {
  label: string;
  value: number;
}

function buildWeeklySpend(transactions: Transaction[]): Bar[] {
  const WEEKS = 6;
  const now = new Date();
  const buckets: Bar[] = [];

  for (let i = WEEKS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 });
  }

  const earliest = new Date(now);
  earliest.setDate(now.getDate() - WEEKS * 7);

  for (const tx of transactions) {
    if (tx.transaction_type !== 'debit') continue;
    const txDate = new Date(tx.transaction_date);
    if (isNaN(txDate.getTime()) || txDate < earliest || txDate > now) continue;

    const weeksAgo = Math.floor((now.getTime() - txDate.getTime()) / (7 * 86_400_000));
    const idx = WEEKS - 1 - weeksAgo;
    if (idx >= 0 && idx < WEEKS) buckets[idx].value += tx.amount;
  }

  return buckets.map((b) => ({ ...b, value: Math.round(b.value) }));
}

const styles = StyleSheet.create({
  empty: { height: 160, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  axisText: { fontSize: 10, color: '#888' },
  caption: { fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 },
});
