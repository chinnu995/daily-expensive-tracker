/**
 * SpendWise API Client
 */

import {
  User,
  AccountSummary,
  Category,
  Transaction,
  Budget,
  FinancialOverview,
  ParsedExpenseDraft,
  SpendingQualityReport,
  AuditLog,
  WeeklyReport,
  MonthlySummaryReport,
  ConsecutiveWeeksReport,
  YearlyReport,
  SpendClassification,
} from '../types/index.js';

const TOKEN_KEY = 'spendwise_auth_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }

    return data as T;
  },

  // Auth
  async register(params: {
    email: string;
    password: string;
    displayName: string;
    initialCash: number;
    initialBank: number;
    currencyCode?: string;
  }): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    this.setToken(res.token);
    return res;
  },

  async login(params: { email: string; password: string }): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    this.setToken(res.token);
    return res;
  },

  async loginDemo(): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/demo', {
      method: 'POST',
    });
    this.setToken(res.token);
    return res;
  },

  async loginGoogle(params: {
    email: string;
    displayName?: string;
    googleId?: string;
    avatarUrl?: string;
    initialCash?: number;
    initialBank?: number;
    currencyCode?: string;
  }): Promise<{ token: string; user: User; message: string }> {
    const res = await this.request<{ token: string; user: User; message: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; accounts: AccountSummary[] }> {
    return this.request<{ user: User; accounts: AccountSummary[] }>('/auth/me');
  },

  async updateProfile(params: Partial<User>): Promise<{ user: User; message: string }> {
    return this.request<{ user: User; message: string }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async deleteAccount(): Promise<{ message: string }> {
    const res = await this.request<{ message: string }>('/auth/delete-account', {
      method: 'DELETE',
    });
    this.removeToken();
    return res;
  },

  // Accounts
  async getAccounts(): Promise<{ accounts: AccountSummary[] }> {
    return this.request<{ accounts: AccountSummary[] }>('/accounts');
  },

  async getFinancialOverview(): Promise<{ overview: FinancialOverview }> {
    return this.request<{ overview: FinancialOverview }>('/accounts/overview');
  },

  async updateOpeningBalance(
    accountId: string,
    newBalance: number,
    reason: string
  ): Promise<{ account: AccountSummary; message: string }> {
    return this.request<{ account: AccountSummary; message: string }>(
      `/accounts/${accountId}/opening-balance`,
      {
        method: 'PATCH',
        body: JSON.stringify({ newBalance, reason }),
      }
    );
  },

  // Categories
  async getCategories(): Promise<{ categories: Category[] }> {
    return this.request<{ categories: Category[] }>('/categories');
  },

  async createCategory(params: {
    name: string;
    type: 'expense' | 'income';
    icon: string;
    color: string;
  }): Promise<{ category: Category }> {
    return this.request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Transactions
  async getTransactions(params?: {
    accountId?: string;
    transactionType?: string;
    spendClassification?: string;
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== '') query.append(key, String(val));
      });
    }
    return this.request<{ transactions: Transaction[]; total: number }>(
      `/transactions?${query.toString()}`
    );
  },

  async createTransaction(params: {
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
  }): Promise<{ transaction: Transaction; overview: FinancialOverview; message: string }> {
    return this.request<{ transaction: Transaction; overview: FinancialOverview; message: string }>(
      '/transactions',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  async updateTransaction(
    id: string,
    params: Partial<Transaction>
  ): Promise<{ transaction: Transaction; overview: FinancialOverview; message: string }> {
    return this.request<{ transaction: Transaction; overview: FinancialOverview; message: string }>(
      `/transactions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    );
  },

  async deleteTransaction(id: string): Promise<{ message: string; overview: FinancialOverview }> {
    return this.request<{ message: string; overview: FinancialOverview }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  // Transfers
  async createTransfer(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    note?: string;
    occurredAt?: string;
    idempotencyKey?: string;
  }): Promise<{ transfer: Transaction; overview: FinancialOverview; message: string }> {
    return this.request<{ transfer: Transaction; overview: FinancialOverview; message: string }>(
      '/transfers',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  // Budgets
  async getBudgets(month?: string): Promise<{ budgets: Budget[]; month: string }> {
    const query = month ? `?month=${month}` : '';
    return this.request<{ budgets: Budget[]; month: string }>(`/budgets${query}`);
  },

  async setBudget(params: {
    categoryId: string | null;
    amount: number;
    periodMonth?: string;
    alertThreshold?: number;
  }): Promise<{ budget: Budget; message: string }> {
    return this.request<{ budget: Budget; message: string }>('/budgets', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteBudget(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/budgets/${id}`, {
      method: 'DELETE',
    });
  },

  // Reports
  async getWeeklyReport(anchorDate?: string): Promise<WeeklyReport> {
    const query = anchorDate ? `?anchorDate=${anchorDate}` : '';
    return this.request<WeeklyReport>(`/reports/1-week${query}`);
  },

  async getMonthlySummaryReport(month?: string): Promise<MonthlySummaryReport> {
    const query = month ? `?month=${month}` : '';
    return this.request<MonthlySummaryReport>(`/reports/1-month${query}`);
  },

  async getConsecutiveWeeksReport(weeks = 6): Promise<ConsecutiveWeeksReport> {
    return this.request<ConsecutiveWeeksReport>(`/reports/consecutive-weeks?weeks=${weeks}`);
  },

  async getYearlyReport(year?: number): Promise<YearlyReport> {
    const query = year ? `?year=${year}` : '';
    return this.request<YearlyReport>(`/reports/1-year${query}`);
  },

  async getSpendingQualityReport(month?: string): Promise<SpendingQualityReport> {
    const query = month ? `?month=${month}` : '';
    return this.request<SpendingQualityReport>(`/reports/spending-quality${query}`);
  },

  async getDailyReport(days = 14): Promise<{
    daily: Array<{ date: string; proper: number; waste: number; unclassified: number; income: number }>;
  }> {
    return this.request<{
      daily: Array<{ date: string; proper: number; waste: number; unclassified: number; income: number }>;
    }>(`/reports/daily?days=${days}`);
  },

  async getCategoryReport(month?: string): Promise<{
    breakdown: Array<{ categoryId: string; name: string; color: string; icon: string; amount: number; count: number }>;
    month: string;
  }> {
    const query = month ? `?month=${month}` : '';
    return this.request<{
      breakdown: Array<{ categoryId: string; name: string; color: string; icon: string; amount: number; count: number }>;
      month: string;
    }>(`/reports/categories${query}`);
  },

  // AI
  async parseExpenseAI(text: string): Promise<{ draft: ParsedExpenseDraft }> {
    return this.request<{ draft: ParsedExpenseDraft }>('/ai/parse-expense', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async chatAI(query: string): Promise<{ answer: string; context: any }> {
    return this.request<{ answer: string; context: any }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  async classifyDescription(text: string): Promise<{
    spendClassification: SpendClassification;
    categoryName: string | null;
    categoryId: string | null;
    accountSuggestion: 'cash' | 'bank' | null;
    rationale: string;
  }> {
    return this.request<{
      spendClassification: SpendClassification;
      categoryName: string | null;
      categoryId: string | null;
      accountSuggestion: 'cash' | 'bank' | null;
      rationale: string;
    }>('/ai/classify-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return this.request<{ logs: AuditLog[] }>('/audit-logs');
  },
};
