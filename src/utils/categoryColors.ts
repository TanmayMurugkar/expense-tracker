import { Category, CategoryBreakdown, Transaction } from '../types';

export const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining':    '#FF6B6B',
  'Bills & Utilities':'#4ECDC4',
  'Investments':      '#45B7D1',
  'Shopping':         '#96CEB4',
  'Transport':        '#FFEAA7',
  'Entertainment':    '#DDA0DD',
  'Health':           '#98D8C8',
  'Other':            '#B0B0B0',
};

/**
 * Builds the per-category spend breakdown. Only *debit* transactions count as
 * spend — credits (refunds, salary, reimbursements) are excluded.
 */
export function buildCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
  const totals: Partial<Record<Category, number>> = {};

  for (const tx of transactions) {
    if (tx.transaction_type !== 'debit') continue;
    totals[tx.category] = (totals[tx.category] ?? 0) + tx.amount;
  }

  const grandTotal = Object.values(totals).reduce((sum, v) => sum + (v ?? 0), 0);

  return (Object.entries(totals) as [Category, number][])
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
      color: CATEGORY_COLORS[category],
    }))
    .sort((a, b) => b.total - a.total);
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
