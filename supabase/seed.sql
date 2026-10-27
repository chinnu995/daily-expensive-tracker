-- Supabase Seed Data for SpendWise
-- Default system categories accessible to all users

INSERT INTO public.categories (name, category_type, icon, color) VALUES
  ('Food & Dining', 'expense', 'UtensilsCrossed', '#f97316'),
  ('Groceries', 'expense', 'ShoppingBag', '#10b981'),
  ('Transportation & Metro', 'expense', 'Bus', '#3b82f6'),
  ('Auto / Taxi', 'expense', 'Car', '#06b6d4'),
  ('Stationery & Supplies', 'expense', 'PenTool', '#8b5cf6'),
  ('Bills & Utilities', 'expense', 'Receipt', '#eab308'),
  ('Rent & Housing', 'expense', 'Home', '#6366f1'),
  ('Shopping & Apparel', 'expense', 'Tag', '#ec4899'),
  ('Health & Pharmacy', 'expense', 'HeartPulse', '#ef4444'),
  ('Entertainment & Movies', 'expense', 'Film', '#a855f7'),
  ('Education & Courses', 'expense', 'GraduationCap', '#14b8a6'),
  ('Snacks & Tea / Chai', 'expense', 'Coffee', '#d97706'),
  ('Subscriptions', 'expense', 'Sparkles', '#64748b'),
  ('Salary', 'income', 'Briefcase', '#22c55e'),
  ('Freelance & Projects', 'income', 'Laptop', '#0ea5e9'),
  ('Investments & Returns', 'income', 'TrendingUp', '#8b5cf6'),
  ('Cash Gift / Allowance', 'income', 'Gift', '#f59e0b'),
  ('Refunds', 'income', 'RotateCcw', '#64748b'),
  ('Other Income', 'income', 'Coins', '#10b981');
