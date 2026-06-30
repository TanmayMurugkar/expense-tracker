import { Share } from 'react-native';
import { fetchTransactions } from './transactions';
import { Transaction } from '../types';

// Guarded requires so the app still runs on builds without these native modules.
let Sharing: typeof import('expo-sharing') | null = null;
let FS: typeof import('expo-file-system') | null = null;
try { Sharing = require('expo-sharing'); } catch { Sharing = null; }
try { FS = require('expo-file-system'); } catch { FS = null; }

function toCSV(rows: Transaction[]): string {
  const headers = [
    'transaction_date', 'description', 'clean_merchant',
    'amount', 'transaction_type', 'category',
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','));
  return [headers.join(','), ...lines].join('\n');
}

/**
 * Exports the signed-in user's transactions. Prefers a real file attachment via
 * expo-sharing; falls back to sharing the data as text if the native modules
 * aren't present (e.g. before the Stage B rebuild).
 */
export async function exportTransactions(format: 'csv' | 'json'): Promise<number> {
  const rows = await fetchTransactions();
  if (rows.length === 0) return 0;

  const payload =
    format === 'csv'
      ? toCSV(rows)
      : JSON.stringify(rows.map(({ user_id, ...rest }) => rest), null, 2);

  const fileName = `expense-tracker-export.${format}`;

  // Preferred path: write a file and present the OS share sheet with it attached.
  if (Sharing && FS && (await Sharing.isAvailableAsync())) {
    try {
      const file = new (FS as any).File((FS as any).Paths.cache, fileName);
      try { file.delete(); } catch {}
      file.create();
      file.write(payload);
      await Sharing.shareAsync(file.uri, {
        mimeType: format === 'csv' ? 'text/csv' : 'application/json',
        dialogTitle: 'Export transactions',
      });
      return rows.length;
    } catch {
      // fall through to text share
    }
  }

  // Fallback: share as text.
  await Share.share({ title: fileName, message: payload });
  return rows.length;
}
