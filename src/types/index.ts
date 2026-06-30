// ─── Canonical category union — the single source of truth ───────────────────
// Keep this in sync with CATEGORY_COLORS (utils/categoryColors.ts) and the
// edge function's CATEGORY_KEYWORDS map.
export type Category =
  | 'Food & Dining'
  | 'Bills & Utilities'
  | 'Investments'
  | 'Shopping'
  | 'Transport'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export const CATEGORIES: Category[] = [
  'Food & Dining',
  'Bills & Utilities',
  'Investments',
  'Shopping',
  'Transport',
  'Entertainment',
  'Health',
  'Other',
];

export type StatementType = 'bank' | 'credit_card';
export type TransactionType = 'debit' | 'credit';
export type StatementStatus = 'processing' | 'completed' | 'failed';

export interface Profile {
  id: string;
  full_name: string | null;
  currency: string;
  data_processing_consent: boolean;
  consent_accepted_at: string | null;
  ingest_token: string | null;
  updated_at: string;
}

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface Transaction {
  id: string;
  user_id: string;
  statement_id: string | null;
  transaction_date: string;
  description: string;
  clean_merchant: string | null;
  amount: number;
  transaction_type: TransactionType;
  category: Category;
  created_at: string;
}

export interface Statement {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  statement_type: StatementType;
  status: StatementStatus;
  error_message: string | null;
  uploaded_at: string;
}

export interface CategoryBreakdown {
  category: Category;
  total: number;
  percentage: number;
  color: string;
}

export interface UploadedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
