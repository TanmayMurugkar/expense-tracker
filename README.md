# 📊 Expense Tracker

A multi-user mobile app to **upload bank & credit-card statements, parse them
automatically, and visualize your spending** by category. Built with React
Native (Expo) and Supabase.

Statements can be added two ways — uploaded in-app (PDF / Excel / CSV) or
**emailed in** to a personal address via SendGrid Inbound Parse. The raw file
is parsed on the server and **deleted immediately afterward**; only the
extracted transactions are kept.

---

## ✨ Features

- **Authentication** — email/password with verified email, persistent sessions, and per-user data isolation.
- **Statement parsing** — PDF (digitally generated), Excel (`.xlsx`/`.xls`), and CSV. Detects debits *and* credits, cleans up merchant names, and auto-categorizes.
- **Email ingestion** — forward/route bank statements to `ingest-<token>@<your-domain>`; validated and parsed automatically.
- **Interactive dashboard** — category donut chart, week-over-week spend bars, Bank/Credit/All toggle, tap-a-category to drill into transactions.
- **Transaction ledger** — searchable, filterable list with tap-to-recategorize.
- **Profile & security** — biometric unlock, inactivity auto-lock, root/jailbreak gate, data export (CSV/JSON), wipe-all-data, full account deletion, in-app Privacy Policy & Terms.

---

## 🧱 Tech stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + **Expo** (TypeScript) |
| Navigation | React Navigation (bottom tabs + native stack) |
| Charts | `react-native-gifted-charts` + `react-native-svg` |
| Backend | **Supabase** — Postgres, Auth, Storage, Edge Functions (Deno) |
| PDF parsing | `unpdf` (serverless pdf.js) |
| Excel parsing | `xlsx` (SheetJS) |
| Email intake | SendGrid Inbound Parse → Supabase Edge Function |
| Native security | `expo-local-authentication`, `jail-monkey`, `expo-sharing` |

---

## 🏗️ Architecture

```
┌─────────────┐    upload (in-app)     ┌──────────────────┐
│  Expo app   │ ─────────────────────► │ Supabase Storage │
│ (RN + TS)   │                        │  (private, RLS)  │
└─────────────┘                        └──────────────────┘
       │                                        │
       │ invoke (JWT)                           │ download (service role)
       ▼                                        ▼
┌────────────────────┐   internal-secret  ┌──────────────────┐
│ parse-statement fn │ ◄───────────────── │  email-ingest fn │ ◄── SendGrid
│  (PDF/XLSX/CSV)    │                     │ (webhook + checks)│     Inbound Parse
└────────────────────┘                    └──────────────────┘
       │ insert (user_id, RLS)
       ▼
┌──────────────────┐     select (RLS)      ┌─────────────┐
│  transactions    │ ────────────────────► │  Dashboard  │
└──────────────────┘                       └─────────────┘
```

---

## 📁 Project structure

```
expense-tracker/
├── App.tsx                     # Entry point (providers + navigator)
├── src/
│   ├── components/             # DonutChart, SpendBarChart, FilePicker, ...
│   ├── screens/                # Auth, Dashboard, Upload, Ledger, Profile, legal/
│   ├── navigation/             # Auth gate, tabs, Profile stack
│   ├── services/               # supabase client, transactions, statements, profile, ...
│   ├── hooks/                  # useTransactions, useProfile, useStatementUpload
│   ├── context/                # AuthProvider, AppLockProvider
│   ├── utils/                  # validation, categoryColors
│   ├── constants/              # legal text, config
│   └── types/                  # shared TypeScript types
└── supabase/
    ├── migrations/             # 0001_init, 0002_profile_consent, 0003_ingest_token
    └── functions/              # parse-statement, delete-account, email-ingest
```

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- For Android: Android Studio (emulator) or a device with [Expo Go](https://expo.dev/go) / a dev build

### 1. Install
```bash
git clone https://github.com/TanmayMurugkar/expense-tracker.git
cd expense-tracker
npm install
```

### 2. Configure environment
Create a `.env` file in the project root (it is git-ignored):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```
> Only the **anon** key goes in the app — RLS is the real guard. The
> service-role key lives only in Edge Function secrets.

### 3. Set up the database
In the Supabase **SQL Editor**, run the migrations in order:
`supabase/migrations/0001_init.sql`, `0002_profile_consent.sql`, `0003_ingest_token.sql`.

Then enable **Authentication → Email → Confirm email**.

### 4. Deploy the Edge Functions
```bash
npx supabase login
npx supabase functions deploy parse-statement --project-ref <ref>
npx supabase functions deploy delete-account  --project-ref <ref>
npx supabase functions deploy email-ingest --no-verify-jwt --project-ref <ref>

# Secrets used by the functions:
npx supabase secrets set INGEST_WEBHOOK_SECRET=<random> INGEST_INTERNAL_SECRET=<random> --project-ref <ref>
```

### 5. Run the app
```bash
npm start            # Expo dev server
# press a (Android), or scan the QR with a dev build
```
> The native security modules (biometrics, root detection, file export)
> require an **EAS dev-client build**, not Expo Go:
> `eas build --profile development --platform android`.

---

## 📧 Email ingestion (optional)

To accept statements by email:
1. Own a domain and point an MX record for a subdomain (e.g. `parse.yourapp.com`) to `mx.sendgrid.net`.
2. In SendGrid → **Inbound Parse**, set the destination URL to
   `https://<ref>.supabase.co/functions/v1/email-ingest?key=<INGEST_WEBHOOK_SECRET>`.
3. Set `INGEST_DOMAIN` in `src/constants/config.ts` to your subdomain.
4. Each user's address (Profile → "Email statements in") is
   `ingest-<token>@parse.yourapp.com`. Only emails from whitelisted bank
   domains are accepted.

---

## 🔒 Security

- **Row-Level Security** (default-deny) on every table; user ids are derived
  server-side, never trusted from the client.
- **Private storage** with per-user path policies; raw statement files deleted
  right after parsing.
- **Edge functions** verify the caller's JWT (or an internal shared secret for
  service-to-service calls); validate file size and true PDF signature.
- **No secrets in the repo** — `.env` is git-ignored; function secrets are read
  from the environment.
- **Client hardening** — masked passwords, generic auth errors, biometric/
  password app-lock, optional root/jailbreak gate.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Open on Android |
| `npm run web` | Open the web preview (limited) |
| `npx tsc --noEmit` | Type-check |

---

## ⚖️ Disclaimer

This app is an **informational tool**, not a bank, broker, or financial advisor.
Categorization is automated and may be imperfect — always verify against your
official statements.

---

## 📄 License

See [LICENSE](LICENSE).
