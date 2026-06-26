import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DonutChart } from '../components/DonutChart';
import { CategoryLegend } from '../components/CategoryLegend';
import { useTransactions } from '../hooks/useTransactions';
import { formatCurrency } from '../utils/categoryColors';

export function DashboardScreen() {
  const { transactions, breakdown, loading, error, refetch } = useTransactions();

  const totalSpend = breakdown.reduce((sum, b) => sum + b.total, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        <Text style={styles.heading}>Spend Overview</Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <DonutChart data={breakdown} totalSpend={totalSpend} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatCurrency(totalSpend)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{transactions.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{breakdown.length}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <CategoryLegend data={breakdown} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, gap: 16 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#FF6B6B', fontSize: 13 },
});
