-- SpendWise PostgreSQL Schema & Row Level Security (RLS) Migrations for Supabase

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '₹',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  allow_overdraft BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- 2. Accounts Table (Wallet / Cash and Bank / UPI)
CREATE TYPE account_type_enum AS ENUM ('cash', 'bank');

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type account_type_enum NOT NULL,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  color VARCHAR(20),
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_account_type UNIQUE (user_id, account_type)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own accounts"
  ON public.accounts
  FOR ALL
  USING (auth.uid() = user_id);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system categories
  name TEXT NOT NULL,
  category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('expense', 'income')),
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system and personal categories"
  ON public.categories
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can create their personal categories"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Transactions Table
CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE spend_classification_enum AS ENUM ('proper_spend', 'waste_spend', 'unclassified');

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type transaction_type_enum NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  from_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  note TEXT,
  tags TEXT[],
  spend_classification spend_classification_enum NOT NULL DEFAULT 'unclassified',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  idempotency_key TEXT,
  -- Constraints:
  CONSTRAINT valid_account_usage CHECK (
    (transaction_type IN ('income', 'expense') AND account_id IS NOT NULL AND from_account_id IS NULL AND to_account_id IS NULL)
    OR
    (transaction_type = 'transfer' AND account_id IS NULL AND from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id <> to_account_id)
  ),
  CONSTRAINT classification_only_on_expenses CHECK (
    (transaction_type = 'expense') OR (spend_classification = 'unclassified')
  )
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own transactions"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id);

-- Indexes for lightning fast queries
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_classification ON public.transactions(spend_classification);

-- 5. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL for overall monthly budget
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
  period_month VARCHAR(7) NOT NULL, -- e.g. '2026-10'
  alert_threshold SMALLINT NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_month_category UNIQUE (user_id, period_month, category_id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets"
  ON public.budgets
  FOR ALL
  USING (auth.uid() = user_id);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);
