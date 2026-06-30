import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchTransactions } from '../services/transactions';
import { buildCategoryBreakdown } from '../utils/categoryColors';
import { CategoryBreakdown, StatementType, Transaction } from '../types';

type TypeFilter = StatementType | 'all';

export function useTransactions(statementType: TypeFilter = 'all') {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const txns = await fetchTransactions({ statementType });
      setTransactions(txns);
      setBreakdown(buildCategoryBreakdown(txns));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [statementType]);

  // Refetch every time the screen regains focus (e.g. after an upload).
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  return { transactions, breakdown, loading, error, refetch: load };
}
