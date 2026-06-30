# Changelog

## feature/app-build — 2026-06-30

Full application build on top of the initial Expo scaffold: authentication,
statement parsing (PDF / Excel / CSV), interactive dashboard, transaction
ledger, a complete Profile & security layer, and automated email ingestion.

### Backend — Supabase (`supabase/`)
- **Migrations**
  - `0001_init` — `profiles`, `statements`, `transactions` tables; owner-scoped
    Row-Level Security on every table; signup trigger (`security definer`);
    private `statements` storage bucket with per-user path policies.
  - `0002_profile_consent` — data-processing consent columns + trigger update.
  - `0003_ingest_token` — per-user email-ingest alias token.
- **Edge functions**
  - `parse-statement` — PDF (via `unpdf` + a "Smart Summary" structured parser),
    Excel and CSV parsing; debit + credit detection; merchant cleanup; JWT auth
    with an internal-secret bridge for service-to-service calls; file size/MIME
    validation; raw file deleted after parsing.
  - `delete-account` — JWT-verified account deletion (DB cascade wipes all data).
  - `email-ingest` — SendGrid Inbound Parse webhook: shared-secret auth,
    bank-domain whitelist, true-PDF magic-byte check, alias→user routing, and
    hand-off to `parse-statement`.

### App (`src/`)
- **Auth** — email/password with AsyncStorage session persistence, route guards,
  generic (non-enumerating) errors, signup consent.
- **Upload** — Bank/Credit type picker, per-user storage path, client-side
  guards, live "processing" status polling.
- **Dashboard** — donut + weekly bar charts (gifted-charts), Bank/Credit/All
  toggle, tappable category legend, refetch-on-focus.
- **Ledger** — searchable/filterable list with tap-to-recategorize.
- **Profile & security** — control room (account / security / data / legal /
  danger zone); inactivity auto-lock with password and biometric unlock;
  root/jailbreak gate; sign-out-everywhere; CSV/JSON export; wipe-all-data;
  full account deletion; onboarding walkthrough; generated Privacy Policy + ToS.
- **Native modules** (guarded so older builds degrade gracefully):
  `expo-local-authentication`, `jail-monkey`, `expo-sharing`.

### Security
- `.env` git-ignored; no secrets, keys, or tokens committed (full scan clean).
- All secrets read from `Deno.env` in functions; never hardcoded.
- RLS default-deny on every table; user ids always derived server-side.

### Setup still required to run (not in repo)
1. Create `.env` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Run migrations `0001`–`0003` in the Supabase SQL editor.
3. Deploy edge functions (`email-ingest` with `--no-verify-jwt`); set
   `INGEST_WEBHOOK_SECRET` and `INGEST_INTERNAL_SECRET` secrets.
4. Enable "Confirm email" in Supabase Auth.
5. For live email ingestion: a domain with MX → SendGrid Inbound Parse.
6. EAS dev-client build for the native modules.
