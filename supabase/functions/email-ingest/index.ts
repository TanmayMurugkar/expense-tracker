import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ───────────────────────────────────────────────────────────────────
// Whitelisted bank sender domains. Override with the BANK_DOMAINS env var
// (comma-separated) without redeploying code.
const DEFAULT_BANK_DOMAINS = [
  'hdfcbank.com', 'hdfcbank.net',
  'icicibank.com',
  'sbi.co.in', 'alerts.sbi.co.in',
  'axisbank.com',
  'idfcfirstbank.com',
  'kotak.com',
  'yesbank.in',
  'pnb.co.in',
  'aubank.in',
];

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB cap for inbound attachments
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

function bankDomains(): string[] {
  const env = Deno.env.get('BANK_DOMAINS');
  return env ? env.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean) : DEFAULT_BANK_DOMAINS;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

/** Extracts the bare email address from a "Name <addr@x.com>" or raw string. */
function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

/** Pulls the ingest token out of a recipient like ingest-<token>@parse.app. */
function extractToken(recipient: string): string | null {
  const email = extractEmail(recipient);
  const local = email.split('@')[0];
  const m = local.match(/^ingest[-+]([a-z0-9]+)$/i);
  return m ? m[1] : null;
}

serve(async (req) => {
  if (req.method !== 'POST') return jsonResp({ error: 'Method not allowed.' }, 405);

  // ── 1. Webhook auth — shared secret in the query string (SendGrid lets you
  //       set the full POST URL, e.g. .../email-ingest?key=SECRET). ──
  const url = new URL(req.url);
  const provided = url.searchParams.get('key') ?? req.headers.get('x-webhook-key') ?? '';
  const expected = Deno.env.get('INGEST_WEBHOOK_SECRET') ?? '';
  if (!expected || provided !== expected) {
    return jsonResp({ error: 'Unauthorized.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // ── 2. Parse the multipart/form-data body from SendGrid Inbound Parse ──
    const form = await req.formData();

    // SendGrid sends an `envelope` JSON ({to:[...], from:"..."}) — the most
    // reliable source for routing. Fall back to the display headers.
    let envelopeTo = '';
    let envelopeFrom = '';
    const envelopeRaw = form.get('envelope');
    if (typeof envelopeRaw === 'string') {
      try {
        const env = JSON.parse(envelopeRaw);
        envelopeTo = Array.isArray(env.to) ? env.to[0] : (env.to ?? '');
        envelopeFrom = env.from ?? '';
      } catch { /* ignore malformed envelope */ }
    }

    const toAddr = envelopeTo || String(form.get('to') ?? '');
    const fromAddr = envelopeFrom || String(form.get('from') ?? '');
    const subject = String(form.get('subject') ?? '');

    // ── 3a. Route: recipient alias token → user ──
    const token = extractToken(toAddr);
    if (!token) return jsonResp({ error: 'No ingest token in recipient address.' }, 400);

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('id')
      .eq('ingest_token', token)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!profile) return jsonResp({ error: 'Unknown ingest token.' }, 404);
    const userId = profile.id as string;

    // ── 3b. Validate sender against the bank-domain whitelist ──
    const senderEmail = extractEmail(fromAddr);
    const senderDomain = senderEmail.split('@')[1] ?? '';
    const allowed = bankDomains();
    const domainOk = allowed.some((d) => senderDomain === d || senderDomain.endsWith(`.${d}`));
    if (!domainOk) {
      return jsonResp({ error: `Sender domain not allowed: ${senderDomain}` }, 403);
    }

    // ── 3c. Find a PDF attachment and verify it's a *true* PDF ──
    let pdf: File | null = null;
    for (const [, value] of form.entries()) {
      if (value instanceof File) {
        const name = value.name.toLowerCase();
        if (value.type === 'application/pdf' || name.endsWith('.pdf')) {
          pdf = value;
          break;
        }
      }
    }
    if (!pdf) return jsonResp({ error: 'No PDF attachment found.' }, 422);

    const bytes = new Uint8Array(await pdf.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      return jsonResp({ error: 'Attachment empty or too large.' }, 413);
    }
    // True-format check: declared MIME AND the %PDF magic header.
    const magicOk = PDF_MAGIC.every((b, i) => bytes[i] === b);
    if (pdf.type !== 'application/pdf' && !magicOk) {
      return jsonResp({ error: 'Attachment is not a valid PDF.' }, 415);
    }
    if (!magicOk) {
      return jsonResp({ error: 'Attachment failed PDF signature check.' }, 415);
    }

    // ── 4. Upload to the user's storage prefix, log a statement, hand off ──
    const rawName = pdf.name || 'statement.pdf';
    // Sanitize for the storage key: Supabase rejects most punctuation and very
    // long names. Keep a short, safe slug while preserving the .pdf extension.
    const base = rawName
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60) || 'statement';
    const safeName = `${base}.pdf`;
    const storagePath = `${userId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await admin.storage
      .from('statements')
      .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw upErr;

    // Infer type from the subject; default to a bank statement.
    const statementType = /credit\s*card/i.test(subject) ? 'credit_card' : 'bank';

    const { data: stmt, error: insErr } = await admin
      .from('statements')
      .insert({
        // Store the sanitized name (always ends in .pdf) — the raw email
        // attachment name can carry quotes/odd chars that break the parser's
        // extension check. We've already verified it's a true PDF above.
        user_id: userId,
        file_name: safeName,
        storage_path: storagePath,
        statement_type: statementType,
        status: 'processing',
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    // Securely hand the statement to the existing parser. We call it server-to-
    // server with the service-role token (passes the gateway) plus an internal
    // secret header that tells parse-statement to trust the row's user_id
    // instead of expecting an end-user JWT.
    const parseRes = await fetch(`${supabaseUrl}/functions/v1/parse-statement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        'x-internal-secret': Deno.env.get('INGEST_INTERNAL_SECRET') ?? '',
      },
      body: JSON.stringify({ statementId: stmt.id }),
    });
    const parseJson = await parseRes.json().catch(() => ({}));

    return jsonResp({
      success: true,
      statementId: stmt.id,
      parse: parseJson,
    });
  } catch (err: any) {
    console.error('[email-ingest] ERROR:', err.message);
    return jsonResp({ success: false, error: err.message }, 500);
  }
});
