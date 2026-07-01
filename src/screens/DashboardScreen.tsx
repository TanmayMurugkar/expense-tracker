import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { DonutChart } from '../components/DonutChart';
import { CategoryLegend } from '../components/CategoryLegend';
import { SpendBarChart, WeekRange } from '../components/SpendBarChart';
import { EmailIngestSetupModal } from '../components/EmailIngestSetupModal';
import { useTransactions } from '../hooks/useTransactions';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthProvider';
import { formatCurrency } from '../utils/categoryColors';
import { Category, StatementType } from '../types';

const EMAIL_PROMPT_KEY = 'email_ingest_prompted';

type TypeFilter = StatementType | 'all';
const FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bank', label: 'Bank' },
  { key: 'credit_card', label: 'Credit' },
];

export function DashboardScreen() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [showEmailSetup, setShowEmailSetup] = useState(false);

  const { transactions, breakdown, loading, error, refetch } = useTransactions(typeFilter);
  const totalSpend = breakdown.reduce((sum, b) => sum + b.total, 0);

  // First-run: offer email-ingestion setup once (after the profile loads).
  useEffect(() => {
    if (!profile?.ingest_token) return;
    AsyncStorage.getItem(EMAIL_PROMPT_KEY).then((seen) => {
      if (!seen) {
        setShowEmailSetup(true);
        AsyncStorage.setItem(EMAIL_PROMPT_KEY, 'true');
      }
    });
  }, [profile?.ingest_token]);

  // Debit transactions for the selected category (the interactive feed).
  const feed = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter((t) => t.transaction_type === 'debit' && t.category === selectedCategory)
      .slice(0, 10);
  }, [transactions, selectedCategory]);

  // Debit transactions falling within the selected week bar.
  const weekFeed = useMemo(() => {
    if (!selectedWeek) return [];
    return transactions.filter((t) => {
      if (t.transaction_type !== 'debit') return false;
      const d = new Date(t.transaction_date);
      return d >= selectedWeek.start && d <= selectedWeek.end;
    });
  }, [transactions, selectedWeek]);

  const weekTotal = weekFeed.reduce((s, t) => s + t.amount, 0);

  if (loading && transactions.length === 0) {
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Spend Overview</Text>
          <TouchableOpacity onPress={signOut} hitSlop={10}>
            <Ionicons name="log-out-outline" size={22} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Bank / Credit / All toggle */}
        <View style={styles.segment}>
          {FILTERS.map((f) => {
            const active = typeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => { setTypeFilter(f.key); setSelectedCategory(null); }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {breakdown.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-upload-outline" size={40} color="#CCC" />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyText}>
              Upload a statement from the Upload tab to see your spending here.
            </Text>
          </View>
        ) : (
          <>
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
              <Text style={styles.sectionTitle}>Weekly Spend</Text>
              <SpendBarChart
                transactions={transactions}
                selectedIndex={selectedWeek?.index ?? null}
                onSelectWeek={setSelectedWeek}
              />

              {selectedWeek && (
                <View style={styles.feed}>
                  <View style={styles.weekHeader}>
                    <Text style={styles.weekTitle}>
                      Week of {selectedWeek.start.getDate()}/{selectedWeek.start.getMonth() + 1}
                    </Text>
                    <Text style={styles.weekTotal}>{formatCurrency(weekTotal)}</Text>
                  </View>
                  {weekFeed.length === 0 ? (
                    <Text style={styles.feedEmpty}>No spend in this week.</Text>
                  ) : (
                    weekFeed.slice(0, 12).map((t) => (
                      <View key={t.id} style={styles.feedRow}>
                        <View style={styles.feedLeft}>
                          <Text style={styles.feedMerchant} numberOfLines={1}>
                            {t.clean_merchant ?? t.description}
                          </Text>
                          <Text style={styles.feedDate}>{t.transaction_date} · {t.category}</Text>
                        </View>
                        <Text style={styles.feedAmount}>{formatCurrency(t.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>By Category</Text>
              <Text style={styles.sectionHint}>Tap a category to see its transactions.</Text>
              <CategoryLegend
                data={breakdown}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />

              {selectedCategory && (
                <View style={styles.feed}>
                  {feed.length === 0 ? (
                    <Text style={styles.feedEmpty}>No transactions in this category.</Text>
                  ) : (
                    feed.map((t) => (
                      <View key={t.id} style={styles.feedRow}>
                        <View style={styles.feedLeft}>
                          <Text style={styles.feedMerchant} numberOfLines={1}>
                            {t.clean_merchant ?? t.description}
                          </Text>
                          <Text style={styles.feedDate}>{t.transaction_date}</Text>
                        </View>
                        <Text style={styles.feedAmount}>{formatCurrency(t.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <EmailIngestSetupModal
        visible={showEmailSetup}
        ingestToken={profile?.ingest_token}
        onClose={() => setShowEmailSetup(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  scroll: { padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#ECECEC',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segmentText: { fontSize: 13, fontWeight: '600', color: '#888' },
  segmentTextActive: { color: '#1A1A2E' },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#AAA', marginBottom: 8 },
  errorBanner: { backgroundColor: '#FFF0F0', borderRadius: 8, padding: 12 },
  errorText: { color: '#FF6B6B', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#555' },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18 },
  feed: { marginTop: 12, gap: 2 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  weekTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  weekTotal: { fontSize: 14, fontWeight: '700', color: '#2BA89F' },
  feedEmpty: { fontSize: 13, color: '#AAA', paddingVertical: 8 },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  feedLeft: { flex: 1, marginRight: 12 },
  feedMerchant: { fontSize: 14, color: '#333', fontWeight: '500' },
  feedDate: { fontSize: 11, color: '#AAA', marginTop: 1 },
  feedAmount: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
});
