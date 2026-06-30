// Template legal copy rendered on in-app screens. This is NOT legal advice —
// replace [COMPANY], [EMAIL], and [JURISDICTION] and have it reviewed before
// any production/store release. The descriptions below are written to match how
// the app actually handles data today.

export const COMPANY_NAME = '[COMPANY]';
export const CONTACT_EMAIL = '[EMAIL]';
export const LAST_UPDATED = 'June 2026';

export const CONSENT_SUMMARY =
  'To show your spending insights, this app reads the text of the bank or ' +
  'credit-card statements you upload (dates, descriptions, and amounts). The ' +
  'original file is deleted from our servers immediately after it is parsed — ' +
  'we keep only the extracted transaction data, and only to render your charts. ' +
  'Your data is private to your account and is never sold.';

export const PRIVACY_POLICY = `Privacy Policy
Last updated: ${LAST_UPDATED}

${COMPANY_NAME} ("we", "us") built this app to help you understand your spending. This policy explains what we collect, why, and how long we keep it.

1. What we collect
• Account data: your email address (for sign-in and verification) and an optional display name.
• Statement content: when you upload a bank or credit-card statement, we extract transaction rows — date, description, merchant, amount, and debit/credit type.
• Preferences: your chosen currency and app settings.

2. How statements are processed
• Files are uploaded over an encrypted (HTTPS/TLS) connection to private, per-user storage.
• Parsing happens on our own Supabase Edge Functions. We do NOT send your statements to any third-party AI or OCR service (no AWS Textract, no OpenAI, etc.).
• The original uploaded file is permanently deleted from storage immediately after parsing succeeds. We retain only the structured transaction data.

3. How long we keep data
• Raw statement files: deleted instantly after parsing.
• Transaction data: kept only while your account exists, so we can render your graphs and ledger.
• Delete it anytime: "Wipe Data" clears all transactions and statements; "Delete Account" removes your account and all associated data permanently.

4. Data isolation & security
• Every record is protected by row-level security so it is accessible only to your authenticated account.
• Data is encrypted in transit and at rest by our infrastructure provider (Supabase).

5. Third-party disclosures
• We use Supabase for authentication, database, storage, and serverless processing. We do not sell your data or share it with advertisers.

6. Your rights
• You can export your data (CSV/JSON), wipe your data, or delete your account at any time from the Profile screen.

7. Contact
Questions: ${CONTACT_EMAIL}`;

export const TERMS_OF_SERVICE = `Terms of Service
Last updated: ${LAST_UPDATED}

1. What this app is
This app is an informational tool that helps you visualize spending from statements you choose to upload. It is NOT a bank, broker, or financial, investment, tax, or accounting advisor. Categorization is automated and may be imperfect — always verify against your official statements.

2. Your responsibilities
• You are responsible for the accuracy of files you upload and for reviewing the categorized results.
• You must only upload statements that belong to you or that you are authorized to use.

3. No warranty
The app is provided "as is" without warranties of any kind. We do not guarantee that categorization, totals, or charts are accurate or complete.

4. Limitation of liability
To the maximum extent permitted by law, ${COMPANY_NAME} is not liable for any financial decisions made using this app or for any indirect or consequential damages.

5. Account termination
You may delete your account at any time from the Profile screen. We may suspend accounts that abuse the service.

6. Governing law
These terms are governed by the laws of [JURISDICTION].

7. Contact
${CONTACT_EMAIL}`;
