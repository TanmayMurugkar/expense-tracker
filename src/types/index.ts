export type Category =
  | 'Food & Dining'
  | 'Bills & Utilities'
  | 'Investments'
  | 'Shopping'
  | 'Transport'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: Category;
  source_file?: string;
}

export interface CategoryBreakdown {
  category: Category;
  total: number;
  percentage: number;
  color: string;
}

export interface Statement {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  parsed: boolean;
}

export interface UploadedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}
