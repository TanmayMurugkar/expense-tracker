import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/categoryColors';

export interface WeekRange {
  label: string;
  start: Date; // inclusive
  end: Date;   // exclusive
  index: number;
}

interface Props {
  transactions: Transaction[];
  selectedIndex?: number | null;
  onSelectWeek?: (week: WeekRange | null) => void;
}

/** Buckets debit spend into the last 6 weeks; bars are tappable to drill in. */
export function SpendBarChart({ transactions, selectedIndex, onSelectWeek }: Props) {
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

  const chartData = buckets.map((b) => ({
    value: b.value,
    label: b.label,
    frontColor: selectedIndex === b.index ? '#2BA89F' : '#4ECDC4',
  }));

  function handlePress(_item: unknown, index: number) {
    if (!onSelectWeek) return;
    if (selectedIndex === index) {
      onSelectWeek(null); // tap again to clear
    } else {
      const b = buckets[index];
      onSelectWeek({ label: b.label, start: b.start, end: b.end, index });
    }
  }

  return (
    <View>
      <BarChart
        data={chartData}
        barWidth={22}
        barBorderRadius={4}
        spacing={18}
        noOfSections={3}
        maxValue={Math.ceil(maxValue * 1.15)}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        formatYLabel={(v: string) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v)}
        onPress={handlePress}
        isAnimated
      />
      <Text style={styles.caption}>
        {onSelectWeek ? 'Tap a bar to see that week · ' : ''}Total last 6 weeks: {formatCurrency(total)}
      </Text>
    </View>
  );
}

interface Bucket {
  label: string;
  value: number;
  start: Date;
  end: Date;
  index: number;
}

function buildWeeklySpend(transactions: Transaction[]): Bucket[] {
  const WEEKS = 6;
  const now = new Date();
  const buckets: Bucket[] = [];

  for (let idx = 0; idx < WEEKS; idx++) {
    const weeksAgo = WEEKS - 1 - idx;
    const end = new Date(now);
    end.setDate(now.getDate() - weeksAgo * 7);
    const start = new Date(now);
    start.setDate(now.getDate() - (weeksAgo + 1) * 7);
    buckets.push({ label: `${end.getDate()}/${end.getMonth() + 1}`, value: 0, start, end, index: idx });
  }

  const earliest = buckets[0].start;
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
