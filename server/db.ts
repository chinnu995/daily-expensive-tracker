/**
 * SpendWise Relational Store with File Persistence and Multi-User Isolation
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  UserProfile,
  Account,
  Category,
  Transaction,
  Budget,
  AuditLog,
  AccountBalanceSummary,
  FinancialOverview,
} from './types.js';

interface DatabaseSchema {
  version: number;
  users: UserProfile[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'spendwise.json');

const DEFAULT_CATEGORIES: Array<Omit<Category, 'id' | 'userId'>> = [
  // Expenses
  { name: 'Food & Dining', type: 'expense', icon: 'UtensilsCrossed', color: '#f97316', isDefault: true },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#10b981', isDefault: true },
  { name: 'Personal Care & Grooming', type: 'expense', icon: 'Sparkles', color: '#ec4899', isDefault: true },
  { name: 'Transportation & Metro', type: 'expense', icon: 'Bus', color: '#3b82f6', isDefault: true },
  { name: 'Auto / Taxi', type: 'expense', icon: 'Car', color: '#06b6d4', isDefault: true },
  { name: 'Stationery & Supplies', type: 'expense', icon: 'PenTool', color: '#8b5cf6', isDefault: true },
  { name: 'Bills & Utilities', type: 'expense', icon: 'Receipt', color: '#eab308', isDefault: true },
  { name: 'Rent & Housing', type: 'expense', icon: 'Home', color: '#6366f1', isDefault: true },
  { name: 'Shopping & Apparel', type: 'expense', icon: 'Tag', color: '#f43f5e', isDefault: true },
  { name: 'Electronics & Gadgets', type: 'expense', icon: 'Laptop', color: '#0284c7', isDefault: true },
  { name: 'Health & Pharmacy', type: 'expense', icon: 'HeartPulse', color: '#ef4444', isDefault: true },
  { name: 'Entertainment & Movies', type: 'expense', icon: 'Film', color: '#a855f7', isDefault: true },
  { name: 'Education & Courses', type: 'expense', icon: 'GraduationCap', color: '#14b8a6', isDefault: true },
  { name: 'Snacks & Tea / Chai', type: 'expense', icon: 'Coffee', color: '#d97706', isDefault: true },
  { name: 'Subscriptions', type: 'expense', icon: 'RotateCcw', color: '#64748b', isDefault: true },
  { name: 'Other Expense', type: 'expense', icon: 'CircleEllipsis', color: '#94a3b8', isDefault: true },
  // Income
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#22c55e', isDefault: true },
  { name: 'Freelance & Projects', type: 'income', icon: 'Laptop', color: '#0ea5e9', isDefault: true },
  { name: 'Investments & Returns', type: 'income', icon: 'TrendingUp', color: '#8b5cf6', isDefault: true },
  { name: 'Cash Gift / Allowance', type: 'income', icon: 'Gift', color: '#f59e0b', isDefault: true },
  { name: 'Refunds', type: 'income', icon: 'RotateCcw', color: '#64748b', isDefault: true },
  { name: 'Other Income', type: 'income', icon: 'Coins', color: '#10b981', isDefault: true },
];

export class SpendWiseDB {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          // Auto-sync any newly added default categories to existing database
          let updated = false;
          if (Array.isArray(parsed.categories)) {
            for (const defCat of DEFAULT_CATEGORIES) {
              const exists = parsed.categories.some(
                (c: any) => c.name.toLowerCase() === defCat.name.toLowerCase()
              );
              if (!exists) {
                parsed.categories.push({
                  ...defCat,
                  id: crypto.randomUUID(),
                  userId: null,
                });
                updated = true;
              }
            }
          }
          if (updated) {
            this.saveDataDirect(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing database, initializing fresh store:', e);
    }

    const initial: DatabaseSchema = {
      version: 1,
      users: [],
      accounts: [],
      categories: DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        id: crypto.randomUUID(),
        userId: null,
      })),
      transactions: [],
      budgets: [],
      auditLogs: [],
    };
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  private save(): void {
    this.saveDataDirect(this.data);
  }

  // --- Multi-User Management ---

  public getUserById(id: string): UserProfile | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): UserProfile | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(profile: UserProfile): UserProfile {
    this.data.users.push(profile);
    this.save();
    return profile;
  }

  public updateUser(id: string, updates: Partial<UserProfile>): UserProfile {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.users[idx];
  }

  public deleteUser(userId: string): void {
    this.data.users = this.data.users.filter((u) => u.id !== userId);
    this.data.accounts = this.data.accounts.filter((a) => a.userId !== userId);
    this.data.transactions = this.data.transactions.filter((t) => t.userId !== userId);
    this.data.budgets = this.data.budgets.filter((b) => b.userId !== userId);
    this.data.categories = this.data.categories.filter((c) => c.userId !== userId);
    this.data.auditLogs = this.data.auditLogs.filter((l) => l.userId !== userId);
    this.save();
  }

  // --- Accounts (Wallet / Cash & Bank / UPI) ---

  public ensureDefaultAccounts(userId: string, initialCash = 0, initialBank = 0, currency = 'INR'): Account[] {
    const userAccounts = this.data.accounts.filter((a) => a.userId === userId);
    const hasCash = userAccounts.find((a) => a.accountType === 'cash');
    const hasBank = userAccounts.find((a) => a.accountType === 'bank');

    const created: Account[] = [];
    const now = new Date().toISOString();

    if (!hasCash) {
      const cashAcc: Account = {
        id: crypto.randomUUID(),
        userId,
        name: 'Wallet / Cash',
        accountType: 'cash',
        openingBalance: Math.max(0, initialCash),
        currencyCode: currency,
        color: '#10b981',
        icon: 'Wallet',
        createdAt: now,
        updatedAt: now,
      };
      this.data.accounts.push(cashAcc);
      created.push(cashAcc);
    }

    if (!hasBank) {
      const bankAcc: Account = {
        id: crypto.randomUUID(),
        userId,
        name: 'Bank / UPI',
        accountType: 'bank',
        openingBalance: Math.max(0, initialBank),
        currencyCode: currency,
        color: '#3b82f6',
        icon: 'Landmark',
        createdAt: now,
        updatedAt: now,
      };
      this.data.accounts.push(bankAcc);
      created.push(bankAcc);
    }

    if (created.length > 0) {
      this.save();
    }

    return this.data.accounts.filter((a) => a.userId === userId);
  }

  public getUserAccounts(userId: string): Account[] {
    return this.data.accounts.filter((a) => a.userId === userId);
  }

  public getAccountById(userId: string, accountId: string): Account | undefined {
    return this.data.accounts.find((a) => a.id === accountId && a.userId === userId);
  }

  public updateOpeningBalance(
    userId: string,
    accountId: string,
    newBalance: number,
    reason: string
  ): Account {
    if (newBalance < 0) {
      throw new Error('Opening balance must be non-negative.');
    }
    const acc = this.getAccountById(userId, accountId);
    if (!acc) throw new Error('Account not found');

    const oldBalance = acc.openingBalance;
    acc.openingBalance = Math.round(newBalance * 100) / 100;
    acc.updatedAt = new Date().toISOString();

    // Log in audit trail
    this.addAuditLog({
      userId,
      action: 'UPDATE_OPENING_BALANCE',
      entityType: 'account',
      entityId: accountId,
      oldData: { openingBalance: oldBalance },
      newData: { openingBalance: acc.openingBalance },
      reason: reason || 'Opening balance auditable correction',
    });

    this.save();
    return acc;
  }

  // --- Categories ---

  public getCategories(userId: string): Category[] {
    return this.data.categories.filter((c) => c.userId === null || c.userId === userId);
  }

  public createCustomCategory(
    userId: string,
    data: { name: string; type: 'expense' | 'income'; icon: string; color: string }
  ): Category {
    const cat: Category = {
      id: crypto.randomUUID(),
      userId,
      name: data.name.trim(),
      type: data.type,
      icon: data.icon || 'Tag',
      color: data.color || '#64748b',
      isDefault: false,
    };
    this.data.categories.push(cat);
    this.save();
    return cat;
  }

  // --- Balance Calculation Engine ---

  public getAccountBalanceSummary(userId: string, accountId: string): AccountBalanceSummary {
    const acc = this.getAccountById(userId, accountId);
    if (!acc) throw new Error('Account not found');

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransfersIn = 0;
    let totalTransfersOut = 0;

    const userTx = this.data.transactions.filter((t) => t.userId === userId);

    for (const t of userTx) {
      if (t.transactionType === 'income' && t.accountId === accountId) {
        totalIncome += t.amount;
      } else if (t.transactionType === 'expense' && t.accountId === accountId) {
        totalExpenses += t.amount;
      } else if (t.transactionType === 'transfer') {
        if (t.toAccountId === accountId) {
          totalTransfersIn += t.amount;
        }
        if (t.fromAccountId === accountId) {
          totalTransfersOut += t.amount;
        }
      }
    }

    // Current Balance = Opening + Income + Transfers In - Expenses - Transfers Out
    const currentBalance =
      acc.openingBalance + totalIncome + totalTransfersIn - totalExpenses - totalTransfersOut;

    return {
      account: acc,
      currentBalance: Math.round(currentBalance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalTransfersIn: Math.round(totalTransfersIn * 100) / 100,
      totalTransfersOut: Math.round(totalTransfersOut * 100) / 100,
    };
  }

  public getFinancialOverview(userId: string): FinancialOverview {
    const user = this.getUserById(userId);
    const currencySymbol = user?.currencySymbol || '₹';
    const currencyCode = user?.currencyCode || 'INR';

    const accounts = this.getUserAccounts(userId);
    const cashAcc = accounts.find((a) => a.accountType === 'cash');
    const bankAcc = accounts.find((a) => a.accountType === 'bank');

    const walletSummary = cashAcc ? this.getAccountBalanceSummary(userId, cashAcc.id) : null;
    const bankSummary = bankAcc ? this.getAccountBalanceSummary(userId, bankAcc.id) : null;

    const walletBalance = walletSummary ? walletSummary.currentBalance : 0;
    const bankBalance = bankSummary ? bankSummary.currentBalance : 0;
    const totalAvailableBalance = Math.round((walletBalance + bankBalance) * 100) / 100;

    // Time-based stats
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const monthStr = now.toISOString().slice(0, 7);

    const userTx = this.data.transactions.filter((t) => t.userId === userId);

    let todayExpenses = 0;
    let thisMonthExpenses = 0;
    let thisMonthIncome = 0;
    let totalProperSpend = 0;
    let totalWasteSpend = 0;
    let totalUnclassifiedSpend = 0;

    for (const t of userTx) {
      const txDay = t.occurredAt.slice(0, 10);
      const txMonth = t.occurredAt.slice(0, 7);

      if (t.transactionType === 'expense') {
        if (txDay === todayStr) {
          todayExpenses += t.amount;
        }
        if (txMonth === monthStr) {
          thisMonthExpenses += t.amount;
          if (t.spendClassification === 'proper_spend') {
            totalProperSpend += t.amount;
          } else if (t.spendClassification === 'waste_spend') {
            totalWasteSpend += t.amount;
          } else {
            totalUnclassifiedSpend += t.amount;
          }
        }
      } else if (t.transactionType === 'income') {
        if (txMonth === monthStr) {
          thisMonthIncome += t.amount;
        }
      }
    }

    const totalPeriodExpenses = totalProperSpend + totalWasteSpend + totalUnclassifiedSpend;
    const properSpendPercentage =
      totalPeriodExpenses > 0 ? Math.round((totalProperSpend / totalPeriodExpenses) * 1000) / 10 : 0;
    const wasteSpendPercentage =
      totalPeriodExpenses > 0 ? Math.round((totalWasteSpend / totalPeriodExpenses) * 1000) / 10 : 0;

    return {
      totalAvailableBalance,
      walletBalance,
      bankBalance,
      walletAccount: walletSummary,
      bankAccount: bankSummary,
      todayExpenses: Math.round(todayExpenses * 100) / 100,
      thisMonthExpenses: Math.round(thisMonthExpenses * 100) / 100,
      thisMonthIncome: Math.round(thisMonthIncome * 100) / 100,
      totalProperSpend: Math.round(totalProperSpend * 100) / 100,
      totalWasteSpend: Math.round(totalWasteSpend * 100) / 100,
      totalUnclassifiedSpend: Math.round(totalUnclassifiedSpend * 100) / 100,
      properSpendPercentage,
      wasteSpendPercentage,
      currencySymbol,
      currencyCode,
    };
  }

  // --- Transactions Engine ---

  public getTransactions(
    userId: string,
    filters?: {
      accountId?: string;
      transactionType?: string;
      spendClassification?: string;
      categoryId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): { transactions: Transaction[]; total: number } {
    let list = this.data.transactions.filter((t) => t.userId === userId);

    if (filters?.accountId) {
      list = list.filter(
        (t) =>
          t.accountId === filters.accountId ||
          t.fromAccountId === filters.accountId ||
          t.toAccountId === filters.accountId
      );
    }
    if (filters?.transactionType) {
      list = list.filter((t) => t.transactionType === filters.transactionType);
    }
    if (filters?.spendClassification) {
      list = list.filter((t) => t.spendClassification === filters.spendClassification);
    }
    if (filters?.categoryId) {
      list = list.filter((t) => t.categoryId === filters.categoryId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }
    if (filters?.startDate) {
      list = list.filter((t) => t.occurredAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((t) => t.occurredAt <= filters.endDate!);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const total = list.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    const paged = list.slice(offset, offset + limit);

    return { transactions: paged, total };
  }

  public getTransactionById(userId: string, txId: string): Transaction | undefined {
    return this.data.transactions.find((t) => t.id === txId && t.userId === userId);
  }

  public createTransaction(
    userId: string,
    params: {
      transactionType: 'income' | 'expense';
      amount: number;
      accountId: string;
      categoryId?: string;
      description: string;
      note?: string;
      tags?: string[];
      spendClassification?: 'proper_spend' | 'waste_spend' | 'unclassified';
      occurredAt?: string;
      idempotencyKey?: string;
    }
  ): Transaction {
    // Idempotency check
    if (params.idempotencyKey) {
      const existing = this.data.transactions.find(
        (t) => t.userId === userId && t.idempotencyKey === params.idempotencyKey
      );
      if (existing) return existing;
    }

    if (!params.amount || params.amount <= 0) {
      throw new Error('Transaction amount must be a positive number.');
    }

    const account = this.getAccountById(userId, params.accountId);
    if (!account) {
      throw new Error('Account does not exist or does not belong to you.');
    }

    const user = this.getUserById(userId);
    const allowOverdraft = user?.allowOverdraft || false;

    // Check negative balance if expense
    if (params.transactionType === 'expense' && !allowOverdraft) {
      const summary = this.getAccountBalanceSummary(userId, params.accountId);
      if (summary.currentBalance < params.amount) {
        throw new Error(
          `Insufficient balance in ${account.name}. Current balance is ${user?.currencySymbol || '₹'}${summary.currentBalance.toFixed(2)}, but ${user?.currencySymbol || '₹'}${params.amount.toFixed(2)} is required.`
        );
      }
    }

    const now = new Date().toISOString();
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      userId,
      transactionType: params.transactionType,
      amount: Math.round(params.amount * 100) / 100,
      currencyCode: account.currencyCode,
      accountId: params.accountId,
      categoryId: params.categoryId || undefined,
      description: params.description.trim() || (params.transactionType === 'income' ? 'Income' : 'Expense'),
      note: params.note?.trim(),
      tags: params.tags,
      spendClassification:
        params.transactionType === 'expense'
          ? params.spendClassification || 'unclassified'
          : 'unclassified',
      occurredAt: params.occurredAt || now,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: params.idempotencyKey,
    };

    this.data.transactions.push(newTx);
    this.save();
    return newTx;
  }

  public createTransfer(
    userId: string,
    params: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description?: string;
      note?: string;
      occurredAt?: string;
      idempotencyKey?: string;
    }
  ): Transaction {
    if (params.fromAccountId === params.toAccountId) {
      throw new Error('Source and destination accounts cannot be the same.');
    }

    if (!params.amount || params.amount <= 0) {
      throw new Error('Transfer amount must be greater than zero.');
    }

    // Idempotency check
    if (params.idempotencyKey) {
      const existing = this.data.transactions.find(
        (t) => t.userId === userId && t.idempotencyKey === params.idempotencyKey
      );
      if (existing) return existing;
    }

    const fromAcc = this.getAccountById(userId, params.fromAccountId);
    const toAcc = this.getAccountById(userId, params.toAccountId);

    if (!fromAcc || !toAcc) {
      throw new Error('Both source and destination accounts must exist and belong to you.');
    }

    const user = this.getUserById(userId);
    const allowOverdraft = user?.allowOverdraft || false;

    if (!allowOverdraft) {
      const sourceSummary = this.getAccountBalanceSummary(userId, params.fromAccountId);
      if (sourceSummary.currentBalance < params.amount) {
        throw new Error(
          `Insufficient funds in ${fromAcc.name}. Balance is ${user?.currencySymbol || '₹'}${sourceSummary.currentBalance.toFixed(2)}, cannot transfer ${user?.currencySymbol || '₹'}${params.amount.toFixed(2)}.`
        );
      }
    }

    const now = new Date().toISOString();
    const defaultDesc =
      fromAcc.accountType === 'bank' && toAcc.accountType === 'cash'
        ? 'ATM Cash Withdrawal'
        : fromAcc.accountType === 'cash' && toAcc.accountType === 'bank'
        ? 'Cash Deposit to Bank'
        : `Transfer from ${fromAcc.name} to ${toAcc.name}`;

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      userId,
      transactionType: 'transfer',
      amount: Math.round(params.amount * 100) / 100,
      currencyCode: fromAcc.currencyCode,
      fromAccountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      description: params.description?.trim() || defaultDesc,
      note: params.note?.trim(),
      spendClassification: 'unclassified', // Transfers are strictly unclassified
      occurredAt: params.occurredAt || now,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: params.idempotencyKey,
    };

    // Atomic execution
    this.data.transactions.push(newTx);
    this.save();
    return newTx;
  }

  public updateTransaction(
    userId: string,
    txId: string,
    updates: Partial<Transaction>
  ): Transaction {
    const idx = this.data.transactions.findIndex((t) => t.id === txId && t.userId === userId);
    if (idx === -1) throw new Error('Transaction not found');

    const current = this.data.transactions[idx];
    const oldCopy = { ...current };

    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('Transaction amount must be positive.');
    }

    this.data.transactions[idx] = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addAuditLog({
      userId,
      action: 'UPDATE_TRANSACTION',
      entityType: 'transaction',
      entityId: txId,
      oldData: oldCopy,
      newData: this.data.transactions[idx],
      reason: 'User modified transaction details',
    });

    this.save();
    return this.data.transactions[idx];
  }

  public deleteTransaction(userId: string, txId: string): void {
    const idx = this.data.transactions.findIndex((t) => t.id === txId && t.userId === userId);
    if (idx === -1) throw new Error('Transaction not found');

    const deleted = this.data.transactions[idx];
    this.data.transactions.splice(idx, 1);

    this.addAuditLog({
      userId,
      action: 'DELETE_TRANSACTION',
      entityType: 'transaction',
      entityId: txId,
      oldData: deleted,
      reason: 'User deleted transaction',
    });

    this.save();
  }

  // --- Budgets ---

  public getBudgets(userId: string, monthStr?: string): Budget[] {
    const month = monthStr || new Date().toISOString().slice(0, 7);
    return this.data.budgets.filter((b) => b.userId === userId && b.periodMonth === month);
  }

  public setBudget(
    userId: string,
    params: {
      categoryId: string | null;
      amount: number;
      periodMonth: string;
      alertThreshold?: number;
    }
  ): Budget {
    const user = this.getUserById(userId);
    const currency = user?.currencyCode || 'INR';

    // Check if budget already exists for this category and month
    const existingIdx = this.data.budgets.findIndex(
      (b) =>
        b.userId === userId &&
        b.categoryId === (params.categoryId || null) &&
        b.periodMonth === params.periodMonth
    );

    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      this.data.budgets[existingIdx].amount = Math.round(params.amount * 100) / 100;
      this.data.budgets[existingIdx].alertThreshold = params.alertThreshold || 80;
      this.data.budgets[existingIdx].updatedAt = now;
      this.save();
      return this.data.budgets[existingIdx];
    }

    const newBudget: Budget = {
      id: crypto.randomUUID(),
      userId,
      categoryId: params.categoryId || null,
      amount: Math.round(params.amount * 100) / 100,
      currencyCode: currency,
      periodMonth: params.periodMonth,
      alertThreshold: params.alertThreshold || 80,
      createdAt: now,
      updatedAt: now,
    };

    this.data.budgets.push(newBudget);
    this.save();
    return newBudget;
  }

  public deleteBudget(userId: string, budgetId: string): void {
    const idx = this.data.budgets.findIndex((b) => b.id === budgetId && b.userId === userId);
    if (idx === -1) throw new Error('Budget not found');
    this.data.budgets.splice(idx, 1);
    this.save();
  }

  // --- Audit Logs ---

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    this.data.auditLogs.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
    // Keep last 500 logs per instance to avoid unbounded growth
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(-400);
    }
    this.save();
  }

  public getAuditLogs(userId: string, limit = 50): AuditLog[] {
    return this.data.auditLogs
      .filter((l) => l.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const db = new SpendWiseDB();
