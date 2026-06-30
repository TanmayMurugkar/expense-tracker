import { supabase } from './supabase';
import { Category, StatementType, Transaction } from '../types';

export interface TransactionFilter {
  statementType?: StatementType | 'all';
}

/**
 * Fetches the signed-in user's transactions, newest first. RLS scopes the
 * result to the owner automatically — we never pass a user_id ourselves.
 * Optionally filters by the parent statement's type (bank / credit_card).
 */
export async function fetchTransactions(
  filter: TransactionFilter = {},
): Promise<Transaction[]> {
  if (filter.statementType && filter.statementType !== 'all') {
    // Join through statements to filter by statement_type.
    const { data, error } = await supabase
      .from('transactions')
      .select('*, statements!inner(statement_type)')
      .eq('statements.statement_type', filter.statementType)
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    // Strip the joined relation before returning the clean Transaction shape.
    return (data ?? []).map(({ statements, ...tx }: any) => tx as Transaction);
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

/** Recategorizes a single transaction. RLS ensures only the owner can update. */
export async function updateTransactionCategory(
  id: string,
  category: Category,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category })
    .eq('id', id);

  if (error) throw error;
}
