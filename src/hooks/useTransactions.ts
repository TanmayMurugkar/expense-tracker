import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Transaction, CategoryBreakdown } from '../types';
import { buildCategoryBreakdown } from '../utils/categoryColors';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error: sbError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (sbError) throw sbError;

      const txns = (data ?? []) as Transaction[];
      setTransactions(txns);
      setBreakdown(buildCategoryBreakdown(txns));
    } catch (err: any) {
      setError(err.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  return { transactions, breakdown, loading, error, refetch: fetchTransactions };
}
