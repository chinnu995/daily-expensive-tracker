/**
 * Frontend Type Definitions
 */

export type AccountType = 'cash' | 'bank';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type SpendClassification = 'proper_spend' | 'waste_spend' | 'unclassified';

export interface User {
  id: string;
  email: string;
  displayName: string;
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  allowOverdraft: boolean;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  openingBalance: number;
  currencyCode: string;
  color?: string;
  icon?: string;
}

export interface AccountSummary {
  account: Account;
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
}

export interface Category {
  id: string;
  userId: string | null;
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
  amount: number;
  currencyCode: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  categoryId?: string;
  description: string;
  note?: string;
  tags?: string[];
  spendClassification: SpendClassification;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  currencyCode: string;
  periodMonth: string;
  alertThreshold: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isNearLimit: boolean;
  isExceeded: boolean;
}

export interface FinancialOverview {
  totalAvailableBalance: number;
  walletBalance: number;
  bankBalance: number;
  walletAccount: AccountSummary | null;
  bankAccount: AccountSummary | null;
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
  targetAccountType?: 'cash' | 'bank' | 'unknown';
  targetAccountId?: string | null;
  occurredAt: string;
  spendClassification: SpendClassification;
  confidence: number;
  missingFields: string[];
  clarificationQuestion: string | null;
  rationale?: string;
}

export interface SpendingQualityReport {
  month: string;
  totalExpenses: number;
  totalProper: number;
  totalWaste: number;
  totalUnclassified: number;
  properPercentage: number;
  wastePercentage: number;
  unclassifiedPercentage: number;
  potentialSavings: number;
  wasteByCategory: Array<{ name: string; amount: number; count: number; color: string }>;
  properByCategory: Array<{ name: string; amount: number; count: number; color: string }>;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
  timestamp: string;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  totalExpenses: number;
  totalIncome: number;
  totalProper: number;
  totalWaste: number;
  totalUnclassified: number;
  properPercentage: number;
  wastePercentage: number;
  previousWeekExpenses: number;
  weekOverWeekChange: number; // percentage (+/-)
  daily: Array<{
    date: string;
    dayLabel: string;
    totalExpense: number;
    proper: number;
    waste: number;
    unclassified: number;
    income: number;
  }>;
  topCategories: Array<{ name: string; amount: number; color: string; count: number }>;
}

export interface MonthlySummaryReport {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  totalProper: number;
  totalWaste: number;
  totalUnclassified: number;
  properPercentage: number;
  wastePercentage: number;
  potentialSavings: number;
  previousMonthExpenses: number;
  monthOverMonthChange: number; // percentage (+/-)
  daily: Array<{
    date: string;
    day: number;
    expense: number;
    income: number;
    proper: number;
    waste: number;
  }>;
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
    count: number;
  }>;
}

export interface ConsecutiveWeeksReport {
  weeksCount: number;
  weeks: Array<{
    weekNumber: number;
    weekLabel: string;
    startDate: string;
    endDate: string;
    totalExpenses: number;
    totalIncome: number;
    totalProper: number;
    totalWaste: number;
    properPercentage: number;
    wastePercentage: number;
    weekOverWeekChange: number; // % change vs prior week
    wasteChange: number; // % change in waste vs prior week
  }>;
  averageWeeklyExpense: number;
  averageWeeklyWaste: number;
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  bestWeek: { weekLabel: string; wasteSpend: number } | null;
}

export interface YearlyReport {
  year: number;
  annualExpenses: number;
  annualIncome: number;
  annualNetSavings: number;
  annualProper: number;
  annualWaste: number;
  properPercentage: number;
  wastePercentage: number;
  monthlyAverageExpense: number;
  monthlyAverageIncome: number;
  highestMonth: { monthLabel: string; period: string; amount: number } | null;
  lowestMonth: { monthLabel: string; period: string; amount: number } | null;
  months: Array<{
    monthLabel: string;
    period: string; // YYYY-MM
    totalExpenses: number;
    totalIncome: number;
    netSavings: number;
    properSpend: number;
    wasteSpend: number;
  }>;
  annualCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}

