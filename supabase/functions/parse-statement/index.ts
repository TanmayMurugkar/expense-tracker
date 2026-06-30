import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { extractText, getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1';

// ─── Config ───────────────────────────────────────────────────────────────────
// CORS: this function is called from a React Native app (no browser origin), so
// '*' is acceptable here. Override with ALLOWED_ORIGIN if a web client is added.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
// Gate PII-bearing debug logs behind an env flag; off by default in production.
const DEBUG = Deno.env.get('PARSE_DEBUG') === 'true';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB upload cap (DoS guard)

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function dbg(...args: unknown[]) {
  if (DEBUG) console.log(...args);
}

// ─── Category detection ───────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining':     ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'pizza', 'burger', 'hotel', 'dining', 'blinkit', 'dunzo', 'bakers', 'eatfit'],
  'Bills & Utilities': ['electricity', 'water', 'gas', 'broadband', 'internet', 'mobile', 'recharge', 'bill', 'airtel', 'jio', 'bsnl', 'bescom', 'tata power'],
  'Investments':       ['mutual fund', 'sip', 'zerodha', 'groww', 'nse', 'bse', 'stock', 'demat', 'fd', 'ppf', 'nps', 'investment', 'kuvera', 'coin'],
  'Shopping':          ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'retail', 'store', 'shop', 'meesho', 'nykaa', 'zepto', 'staple', 'bigbasket', 'grofers', 'instamart'],
  'Transport':         ['uber', 'ola', 'rapido', 'metro', 'bus', 'fuel', 'petrol', 'diesel', 'irctc', 'railway', 'flight', 'indigo', 'makemytrip', 'redbus', 'cityflo', 'chalo'],
  'Entertainment':     ['netflix', 'hotstar', 'prime video', 'spotify', 'youtube', 'bookmyshow', 'movie', 'pvr', 'inox', 'zee5'],
  'Health':            ['pharmacy', 'hospital', 'clinic', 'doctor', 'medicine', 'apollo', 'medplus', 'health', 'gym', 'diagnostic', 'practo', '1mg'],
  'Other':             [],
};

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

// ─── Merchant cleanup ─────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Pulls a human-readable merchant out of noisy bank narration strings. */
function cleanMerchant(description: string): string {
  const desc = description.trim();
  const parts = desc.split('/').map((p) => p.trim()).filter(Boolean);

  // UPI/DR/<ref>/<NAME>/<BANK>/<vpa>/<note>  → segment 3 is the payee name
  if (/^upi$/i.test(parts[0] ?? '') && parts.length >= 4) {
    return titleCase(parts[3]).slice(0, 40);
  }
  // NACH/<originator>/...  → segment 1
  if (/^nach$/i.test(parts[0] ?? '') && parts.length >= 2) {
    return titleCase(parts[1]).slice(0, 40);
  }
  // IMPS/NEFT/RTGS/<ref>/<NAME>/...  → segment 3 (or 1 as fallback)
  if (/^(imps|neft|rtgs)$/i.test(parts[0] ?? '') && parts.length >= 2) {
    return titleCase(parts[3] ?? parts[1]).slice(0, 40);
  }
  // Fallback: first few words of the description.
  return titleCase(desc.split(/\s+/).slice(0, 3).join(' ')).slice(0, 40) || 'Unknown';
}

// ─── Amount / Date helpers ────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  return Math.abs(parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0);
}

const MONTHS: Record<string, string> = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

function parseDate(raw: string): string {
  const s = String(raw);
  let y = '', m = '', d = '';

  // "DD Mon, YYYY" / "DD Mon YYYY" (comma optional) — common in Indian exports.
  const dMonY = s.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/i);
  if (dMonY) {
    d = dMonY[1]; m = MONTHS[dMonY[2].toLowerCase()]; y = dMonY[3];
  } else {
    const dmy = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dmy) {
      d = dmy[1]; m = dmy[2]; y = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3];
    } else {
      const ymd = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (ymd) { y = ymd[1]; m = ymd[2]; d = ymd[3]; }
    }
  }

  // Validate before returning so a misparse can never crash the DB insert.
  const dn = parseInt(d, 10), mn = parseInt(m, 10), yn = parseInt(y, 10);
  if (yn >= 1990 && yn <= 2100 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

// ─── Parsed transaction shape (pre-insert; user_id/statement_id added later) ──

interface ParsedTxn {
  transaction_date: string;
  description: string;
  clean_merchant: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  category: string;
}

// ─── CSV parser (handles separate Debit/Credit columns) ──────────────────────

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSVText(
  csvText: string,
  statementType: 'bank' | 'credit_card',
): { transactions: ParsedTxn[]; warning: string | null } {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { transactions: [], warning: 'File appears empty.' };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]/g, '').trim());

  const dateIdx   = headers.findIndex((h) => /date/i.test(h));
  const descIdx   = headers.findIndex((h) => /particular|narration|desc|detail|remark/i.test(h));
  const debitIdx  = headers.findIndex((h) => /debit|withdrawal|\bdr\b/i.test(h));
  const creditIdx = headers.findIndex((h) => /credit|deposit|\bcr\b/i.test(h));
  const amountIdx = headers.findIndex((h) => /^amount$|txn amount|transaction amount/i.test(h));

  if (dateIdx === -1 || descIdx === -1 || (debitIdx === -1 && creditIdx === -1 && amountIdx === -1)) {
    return {
      transactions: [],
      warning: `Could not detect required columns. Found: ${headers.join(', ')}`,
    };
  }

  const transactions: ParsedTxn[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseLine(line);
    if (cols.length <= Math.max(dateIdx, descIdx)) continue;

    const description = (cols[descIdx] ?? '').replace(/['"]/g, '').trim() || 'Unknown';
    const date = parseDate(cols[dateIdx] ?? '');
    const merchant = cleanMerchant(description);
    const category = detectCategory(description);

    const debit  = debitIdx  !== -1 ? parseAmount(cols[debitIdx]  ?? '') : 0;
    const credit = creditIdx !== -1 ? parseAmount(cols[creditIdx] ?? '') : 0;

    if (debit > 0) {
      transactions.push({ transaction_date: date, description, clean_merchant: merchant, amount: debit, transaction_type: 'debit', category });
    }
    if (credit > 0) {
      transactions.push({ transaction_date: date, description, clean_merchant: merchant, amount: credit, transaction_type: 'credit', category });
    }
    // Single "Amount" column (common on credit-card exports): treat as a debit
    // spend for credit cards, otherwise as a debit by default.
    if (debit === 0 && credit === 0 && amountIdx !== -1) {
      const amt = parseAmount(cols[amountIdx] ?? '');
      if (amt > 0) {
        transactions.push({
          transaction_date: date, description, clean_merchant: merchant, amount: amt,
          transaction_type: 'debit', category,
        });
      }
    }
  }

  return {
    transactions,
    warning: transactions.length === 0 ? 'No transactions detected in the file.' : null,
  };
}

// ─── Excel → CSV (skips bank statement preamble rows) ────────────────────────

function xlsxToCSV(bytes: Uint8Array): string {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(allRows.length, 40); i++) {
    const cells = allRows[i].map((c) => String(c).toLowerCase().trim());
    const hasDate   = cells.some((c) => /\bdate\b|txn.?date|transaction.?date|value.?date/i.test(c));
    const hasAmount = cells.some((c) => /\bdebit\b|\bcredit\b|\bamount\b|withdrawal|deposit/i.test(c));
    const hasDesc   = cells.some((c) => /particular|narration|description|detail|remark/i.test(c));
    if (hasDate && hasAmount && hasDesc) { headerRowIndex = i; break; }
  }
  dbg(`[xlsxToCSV] header row at index ${headerRowIndex}`);

  return allRows.slice(headerRowIndex)
    .map((row) => row.map((cell) => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))
    .join('\n');
}

// ─── PDF extractor ────────────────────────────────────────────────────────────

function decodePDFString(s: string): string {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
}

/**
 * Primary PDF text extractor — uses unpdf (a serverless pdf.js build) which
 * inflates FlateDecode/compressed content streams that real bank statements use.
 * Falls back to the regex extractor for simple uncompressed PDFs.
 */
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join('\n') : String(text);
    if (merged.trim().length > 0) return merged;
  } catch (e) {
    console.error('[parse-statement] unpdf extract failed:', (e as Error).message);
  }
  return extractPDFTextRegex(bytes);
}

/** Fallback: reads plain (uncompressed) PDF text operators via regex. */
function extractPDFTextRegex(bytes: Uint8Array): string {
  const content = new TextDecoder('latin1').decode(bytes);
  const extracted: string[] = [];
  const blockRegex = /BT([\s\S]*?)ET/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const block = blockMatch[1];
    let m: RegExpExecArray | null;
    const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
    while ((m = tjRegex.exec(block)) !== null) { const t = decodePDFString(m[1]).trim(); if (t) extracted.push(t); }
    const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
    while ((m = tjArrRegex.exec(block)) !== null) {
      const parts: string[] = [];
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let sm: RegExpExecArray | null;
      while ((sm = strRegex.exec(m[1])) !== null) parts.push(decodePDFString(sm[1]));
      const joined = parts.join('').trim(); if (joined) extracted.push(joined);
    }
  }
  return extracted.join('\n');
}

// Maps a bank's own category column to our canonical categories.
const BANK_CAT_MAP: Record<string, string> = {
  'food and drinks': 'Food & Dining',
  'dining': 'Food & Dining',
  'grocery': 'Shopping',
  'groceries': 'Shopping',
  'shopping': 'Shopping',
  'entertainment': 'Entertainment',
  'transport': 'Transport',
  'travel': 'Transport',
  'home expenses': 'Bills & Utilities',
  'bills': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'investment': 'Investments',
  'health': 'Health',
  'digital payments': 'Other',
  'others (in)': 'Other',
  'others': 'Other',
};

const PAY_TYPE = '(?:UPI payment|Card payment|Cash[a-z ]*?|Others|IMPS|NEFT|RTGS|ACH[a-z ]*?|ATM[a-z ]*?|Net Banking|[A-Za-z]+ [Pp]ayment)';

/**
 * Parses the "Smart Summary"-style transaction export used by IDFC FIRST and
 * similar Indian banks. pdf.js extracts these as one continuous stream, each
 * record shaped like:
 *   "26 Jun, 2026 UPI payment Burger King Food and Drinks ₹438.90"
 *   "15 Jun, 2026 Others Reimb Credit ... Others (In) + ₹3,000.00"   (credit)
 */
function parseSmartSummary(text: string): ParsedTxn[] {
  const records: ParsedTxn[] = [];
  const re = new RegExp(
    `(\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?,?\\s+\\d{4})\\s+(${PAY_TYPE})\\s+(.+?)\\s+(\\+\\s*)?₹\\s*([\\d,]+(?:\\.\\d{1,2})?)`,
    'gi',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [, dateRaw, payType, middleRaw, plus, amtRaw] = m;
    const amount = parseAmount(amtRaw);
    if (!amount) continue;

    const middle = middleRaw.replace(/\s+/g, ' ').trim();
    const lc = middle.toLowerCase();

    // Map the bank's trailing category column, and strip it off the merchant.
    let category = 'Other';
    let merchant = middle;
    for (const [phrase, cat] of Object.entries(BANK_CAT_MAP)) {
      const idx = lc.lastIndexOf(phrase);
      if (idx !== -1 && idx >= lc.length - phrase.length - 6) {
        category = cat;
        merchant = middle.slice(0, idx).trim() || middle;
        break;
      }
    }
    if (category === 'Other') category = detectCategory(middle);

    records.push({
      transaction_date: parseDate(dateRaw),
      description: `${payType} ${middle}`.replace(/\s+/g, ' ').trim().slice(0, 200),
      clean_merchant: titleCase(merchant).slice(0, 40) || 'Unknown',
      amount,
      transaction_type: plus ? 'credit' : 'debit',
      category,
    });
  }
  return records;
}

function parsePDFText(
  text: string,
  statementType: 'bank' | 'credit_card',
): { transactions: ParsedTxn[]; warning: string | null } {
  // Prefer the structured "Smart Summary" parser; fall back to line-based.
  const smart = parseSmartSummary(text);
  if (smart.length > 0) return { transactions: smart, warning: null };

  const transactions: ParsedTxn[] = [];
  const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i;
  const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})/g;

  for (const line of text.split('\n')) {
    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;
    const amounts = [...line.matchAll(amountPattern)].map((m) => parseAmount(m[1]));
    if (!amounts.length) continue;
    const amount = amounts.find((a) => a >= 1 && a < 10_000_000);
    if (!amount) continue;

    const afterDate = line.slice(dateMatch.index! + dateMatch[0].length);
    const description = afterDate.replace(amountPattern, '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Bank Transaction';
    if (/total|balance|opening|closing|carried|brought/i.test(description)) continue;

    // Line-level PDFs rarely separate debit/credit reliably; treat as debit spend.
    transactions.push({
      transaction_date: parseDate(dateMatch[1]),
      description,
      clean_merchant: cleanMerchant(description),
      amount,
      transaction_type: 'debit',
      category: detectCategory(description),
    });
  }

  return {
    transactions,
    warning: transactions.length === 0
      ? 'No transactions found. Ensure the PDF is digitally generated, not a scanned image.'
      : null,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // ── 1. Authenticate the caller. Two paths:
  //   (a) Internal service-to-service (e.g. email-ingest): a shared secret
  //       header; ownership is taken from the statement row, not a user JWT.
  //   (b) End user: a verified JWT — user_id is derived from the token, never
  //       from the request body.
  const internalSecret = req.headers.get('x-internal-secret') ?? '';
  const isInternal =
    internalSecret.length > 0 &&
    internalSecret === (Deno.env.get('INGEST_INTERNAL_SECRET') ?? '\0');

  let callerUserId: string | null = null;
  if (!isInternal) {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ success: false, error: 'Missing authorization.' }, 401);
    }
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) {
      return json({ success: false, error: 'Invalid or expired session.' }, 401);
    }
    callerUserId = user.id;
  }

  let statementId: string | undefined;

  try {
    const body = await req.json();
    statementId = body.statementId;
    if (!statementId) return json({ success: false, error: 'statementId is required.' }, 400);

    // ── 2. Load the statement and (for user calls) confirm the caller owns it ──
    const { data: stmt, error: stmtErr } = await admin
      .from('statements')
      .select('id, user_id, storage_path, statement_type, file_name')
      .eq('id', statementId)
      .single();

    if (stmtErr || !stmt) return json({ success: false, error: 'Statement not found.' }, 404);
    if (!isInternal && stmt.user_id !== callerUserId) {
      return json({ success: false, error: 'Forbidden.' }, 403);
    }

    const statementType = stmt.statement_type as 'bank' | 'credit_card';
    const fileName = stmt.file_name as string;

    // ── 3. Download the raw file (using the DB-trusted storage path) ──
    const { data: fileData, error: downloadError } = await admin.storage
      .from('statements')
      .download(stmt.storage_path);
    if (downloadError) throw new Error(`Storage download failed: ${downloadError.message}`);

    const bytes = new Uint8Array(await fileData.arrayBuffer());

    // ── 4. Validate size and type before doing any work ──
    if (bytes.length > MAX_BYTES) {
      throw new Error('File exceeds the 10 MB limit.');
    }
    const lowerName = fileName.toLowerCase();
    const isXLSX = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isCSV  = lowerName.endsWith('.csv');
    const isPDF  = lowerName.endsWith('.pdf');
    if (!isXLSX && !isCSV && !isPDF) {
      throw new Error('Unsupported file type. Upload a PDF, Excel, or CSV statement.');
    }

    // ── 5. Parse ──
    let result: { transactions: ParsedTxn[]; warning: string | null };
    if (isXLSX) {
      result = parseCSVText(xlsxToCSV(bytes), statementType);
    } else if (isCSV) {
      result = parseCSVText(new TextDecoder().decode(bytes), statementType);
    } else {
      result = parsePDFText(await extractPdfText(bytes), statementType);
    }

    console.log(`[parse-statement] parsed ${result.transactions.length} txns for statement ${statementId}`);

    // ── 6. Insert transactions (stamped with verified user_id + statement_id) ──
    if (result.transactions.length > 0) {
      const rows = result.transactions.map((t) => ({
        ...t,
        user_id: stmt.user_id,
        statement_id: statementId,
      }));
      const { error: insertError } = await admin.from('transactions').insert(rows);
      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
    }

    // ── 7. Mark statement completed ──
    await admin.from('statements')
      .update({ status: 'completed', error_message: result.warning })
      .eq('id', statementId);

    // ── 8. Delete the raw file (data minimization — keep only transactions) ──
    const { error: removeError } = await admin.storage
      .from('statements')
      .remove([stmt.storage_path]);
    if (removeError) console.error('[parse-statement] raw file cleanup failed:', removeError.message);

    return json({ success: true, count: result.transactions.length, warning: result.warning });

  } catch (err: any) {
    console.error('[parse-statement] ERROR:', err.message);
    // Best-effort: flag the statement as failed so the UI can react.
    if (statementId) {
      await admin.from('statements')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', statementId);
    }
    return json({ success: false, error: err.message }, 500);
  }
});
