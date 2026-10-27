# SpendWise — AI-Powered Daily Expense Tracker

SpendWise is a full-stack personal finance application engineered for precision, dual-balance accounting, spending quality classification (Proper vs. Waste), and AI financial intelligence.

---

## 🌟 Key Features

### 1. Dual-Balance Accounting Engine
- **Wallet Balance (Physical Cash):** Tracks cash in hand, ATM cash withdrawals, cash deposits, and daily cash purchases.
- **Bank / UPI Balance (Manual Bank Ledger):** Tracks UPI payments, online transactions, bank transfers, and deposits with a clear disclaimer notice explaining manual ledger calculation.
- **Total Available Balance:** Prominently computed as:
  $$\text{Total Available Balance} = \text{Wallet Balance} + \text{Bank Balance}$$
- **Atomic Double-Entry Transfers:**
  - ATM Withdrawal: Decreases Bank, increases Wallet by the same amount.
  - Cash Deposit: Decreases Wallet, increases Bank.
  - Never affects income or expense totals.
- **Overdraft Protection:** Prevents negative balances by default with configurable policy in Settings.
- **Auditable Opening Balance Corrections:** Allows correcting starting balances with an audited explanation and timestamp trail.

### 2. AI-Powered Natural-Language Expense Parser
- Powered by Gemini 3.8 Flash (`gemini-3.8-flash`) via the modern `@google/genai` TypeScript SDK.
- Parses unstructured phrases such as:
  - *"I bought a pen for 5 rupees using cash."*
  - *"Paid ₹40 for bus fare through UPI."*
  - *"Received ₹500 as salary."*
  - *"Transfer ₹1,000 from bank to wallet."*
- **Strict Financial Safety Rules:**
  - Never invents missing amounts.
  - Never fabricates purchases.
  - Prompts for clarification when information is missing (e.g. *"Did you pay using Wallet / Cash or Bank / UPI?"*).
  - **Draft Only Guarantee:** Produces an editable draft review card. Transactions are committed only after the user explicitly reviews and clicks *"Confirm and Save"*.

### 3. Spending Quality Classification (Proper vs. Waste)
- **Proper Spend:** Essential, educational, planned, or valuable expenses (stationery, bus fare, essential groceries, textbooks, utilities).
- **Waste Spend:** Impulsive, unnecessary, discarded, or regretted purchases (uneaten midnight takeout, unused subscriptions, impulse buys).
- **Unclassified:** Default status awaiting user review.
- **Spending Quality Analytics:**
  - Proper vs. Waste percentage breakdown.
  - Waste spending by category.
  - **Hypothetical Potential Savings Simulation:** Dynamically calculates potential monthly savings if waste spend is reduced by a chosen percentage.

### 4. Budgets and Alerts
- Set monthly overall spending caps and category-specific budgets.
- Progress bars with threshold alerts at 80% (approaching limit) and 100% (exceeded).
- Strictly counts expense transactions, excluding transfers and income.

### 5. Grounded AI Spending Assistant
- Conversational chat powered by Gemini.
- Uses exact pre-calculated ledger figures (Wallet balance, Bank balance, Today's spend, Top categories, Biggest expense) as source of truth.
- Factual and concise answers without hallucinating numbers.

---

## 🏗️ Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Mobile-first responsive UI.
- **Backend:** Node.js, Express.js, TypeScript (`tsx`), REST API.
- **AI SDK:** `@google/genai` with `gemini-3.8-flash`.
- **Database Options:**
  - In-app Relational Store: File-backed atomic JSON store with multi-user isolation, ACID-like transactions, and audit logs (`data/spendwise.json`).
  - Supabase PostgreSQL: Production-ready SQL schema with Row-Level Security (RLS) located at `supabase/migrations/001_initial_schema.sql` and `supabase/seed.sql`.

---

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (runs fullstack Express API + Vite on port 3000):
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`. You can test immediately using the **Explore Instant Demo (Aarav Sharma)** button on the sign-in screen.

---

## 📡 REST API Reference

### Auth
- `POST /api/auth/register` — Register user & set opening balances for Wallet & Bank.
- `POST /api/auth/login` — Sign in.
- `POST /api/auth/demo` — Quick-login with sample test data.
- `GET /api/auth/me` — Get authenticated user & accounts.
- `PATCH /api/auth/profile` — Update display name, currency, timezone, overdraft toggle.
- `DELETE /api/auth/delete-account` — Permanently purge account & data.

### Accounts & Ledger
- `GET /api/accounts` — List accounts with current balance, income, expense, transfers.
- `GET /api/accounts/overview` — Total Available Balance, Wallet & Bank breakdown.
- `PATCH /api/accounts/:id/opening-balance` — Auditable opening balance correction.

### Transactions & Transfers
- `GET /api/transactions` — Filterable by account, type, spending quality, category, search.
- `POST /api/transactions` — Confirm and commit a transaction.
- `PATCH /api/transactions/:id` — Edit an existing transaction.
- `DELETE /api/transactions/:id` — Delete transaction & recalculate balance.
- `POST /api/transfers` — Execute atomic transfer between Wallet and Bank.

### AI Features
- `POST /api/ai/parse-expense` — Parse natural language text into an editable draft (never auto-saves).
- `POST /api/ai/chat` — Factual chat assistant grounded in verified ledger figures.
