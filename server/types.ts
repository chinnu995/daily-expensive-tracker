/**
 * SpendWise Shared & Backend Types
 */

export type AccountType = 'cash' | 'bank';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type SpendClassification = 'proper_spend' | 'waste_spend' | 'unclassified';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  currencyCode: string; // e.g. 'INR', 'USD', 'EUR'
  currencySymbol: string; // e.g. '₹', '$', '€'
  timezone: string; // e.g. 'Asia/Kolkata'
  allowOverdraft: boolean;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string; // e.g. "Wallet / Cash" or "Bank / UPI"
  accountType: AccountType;
  openingBalance: number; // in monetary units with 2 decimal precision
  currencyCode: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string | null; // null for system categories
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  transactionType: TransactionType;
  amount: number; // positive number
  currencyCode: string;
  accountId?: string; // used for income and expense
  fromAccountId?: string; // used for transfer
  toAccountId?: string; // used for transfer
  categoryId?: string;
  description: string;
  note?: string;
  tags?: string[];
  spendClassification: SpendClassification; // only relevant for expense
  occurredAt: string; // ISO 8601 string
  createdAt: string;
  updatedAt: string;
  idempotencyKey?: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null; // null = overall monthly budget
  amount: number;
  currencyCode: string;
  periodMonth: string; // YYYY-MM
  alertThreshold: number; // e.g. 80 for 80%
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: 'account' | 'transaction' | 'budget' | 'profile';
  entityId: string;
  oldData?: Record<string, unknown> | object;
  newData?: Record<string, unknown> | object;
  reason?: string;
  timestamp: string;
}

export interface AccountBalanceSummary {
  account: Account;
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
}

export interface FinancialOverview {
  totalAvailableBalance: number;
  walletBalance: number;
  bankBalance: number;
  walletAccount: AccountBalanceSummary | null;
  bankAccount: AccountBalanceSummary | null;
  todayExpenses: number;
  thisMonthExpenses: number;
  thisMonthIncome: number;
  totalProperSpend: number;
  totalWasteSpend: number;
  totalUnclassifiedSpend: number;
  properSpendPercentage: number;
  wasteSpendPercentage: number;
  currencySymbol: string;
  currencyCode: string;
}

export interface ParsedExpenseDraft {
  transactionType: TransactionType;
  description: string;
  amount: number | null;
  currencyCode: string;
  categoryName: string | null;
  categoryId?: string | null;
  accountType: 'cash' | 'bank' | 'unknown';
  accountId?: string | null;
  targetAccountType?: 'cash' | 'bank' | 'unknown'; // For transfers
  targetAccountId?: string | null;
  occurredAt: string;
  spendClassification: SpendClassification;
  confidence: number; // 0 to 1
  missingFields: string[];
  clarificationQuestion: string | null;
  rationale?: string;
}
