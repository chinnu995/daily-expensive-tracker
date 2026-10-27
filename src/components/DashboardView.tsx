import React from 'react';
import {
  Wallet,
  Landmark,
  ShieldCheck,
  PlusCircle,
  ArrowRightLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  Flame,
  Info,
  Calendar,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  PiggyBank,
  Smartphone,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { User, FinancialOverview, Transaction, AccountSummary, Category } from '../types/index.js';
import { CategoryIcon } from './CategoryIcon.js';
import { getLinkedUpiAccount, UpiProvider } from '../lib/upiService.js';

interface DashboardViewProps {
  user: User;
  overview: FinancialOverview;
  recentTransactions: Transaction[];
  categories: Category[];
  accounts: AccountSummary[];
  onOpenAiAdd: (initialPrompt?: string) => void;
  onOpenQuickAdd: () => void;
  onOpenIncome: () => void;
  onOpenTransfer: () => void;
  onSelectAccount: (acc: AccountSummary) => void;
  onViewAllTransactions: () => void;
  onViewSpendingQuality: () => void;
  onOpenUpiGateway?: (mode?: 'gateway' | 'link', provider?: UpiProvider) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  overview,
  recentTransactions,
  categories,
  accounts,
  onOpenAiAdd,
  onOpenQuickAdd,
  onOpenIncome,
  onOpenTransfer,
  onSelectAccount,
  onViewAllTransactions,
  onViewSpendingQuality,
  onOpenUpiGateway,
}) => {
  const linkedUpi = getLinkedUpiAccount(user.id);
  const symbol = overview.currencySymbol || user.currencySymbol || '₹';
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const cashAcc = accounts.find((a) => a.account.accountType === 'cash');
  const bankAcc = accounts.find((a) => a.account.accountType === 'bank');

  const getCategory = (catId?: string) => categories.find((c) => c.id === catId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Top Welcome & Total Available Balance Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mb-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{todayFormatted}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user.displayName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Dual-balance ledger with intelligent spending quality classification
            </p>

            {/* Total Balance display */}
            <div className="mt-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Total Available Balance (Cash + Bank)</span>
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                {symbol}
                {overview.totalAvailableBalance.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <button
              onClick={() => onOpenAiAdd()}
              className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <Sparkles className="w-5 h-5 text-emerald-200 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">AI Add</span>
              <span className="text-[9px] text-emerald-100">Natural Text</span>
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <PlusCircle className="w-5 h-5 text-rose-300 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">+ Expense</span>
              <span className="text-[9px] text-slate-300">Quick Manual</span>
            </button>

            <button
              onClick={onOpenIncome}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <TrendingUp className="w-5 h-5 text-emerald-300 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">+ Income</span>
              <span className="text-[9px] text-slate-300">Salary / Cash</span>
            </button>

            <button
              onClick={onOpenTransfer}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
            >
              <ArrowRightLeft className="w-5 h-5 text-blue-300 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Transfer</span>
              <span className="text-[9px] text-slate-300">ATM / Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* DUAL BALANCE CARDS: Wallet (Cash) & Bank / UPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A. Wallet Balance Card (Physical Cash) */}
        <div
          onClick={() => cashAcc && onSelectAccount(cashAcc)}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-5 sm:p-6 cursor-pointer relative group overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Wallet Balance
                </span>
                <span className="text-[11px] text-slate-500">Physical Cash in Possession</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 shadow-2xs group-hover:scale-105">
                <PlusCircle className="w-3.5 h-3.5" /> + Add Money / Update
              </span>
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {symbol}
            {overview.walletBalance.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Opening: {symbol}
              {cashAcc?.account.openingBalance.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-emerald-700 font-medium">Automatic formula calculation</span>
          </div>
        </div>

        {/* B. Bank / UPI Balance Card */}
        <div
          onClick={() => bankAcc && onSelectAccount(bankAcc)}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-5 sm:p-6 cursor-pointer relative group overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Bank / UPI Balance
                </span>
                <span className="text-[11px] text-slate-500">Account Funds Tracked Manually</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUpiGateway?.('gateway');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all flex items-center gap-1 shadow-2xs group-hover:scale-105 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Link UPI / Gateway</span>
              </button>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all flex items-center gap-1 shadow-2xs">
                <PlusCircle className="w-3.5 h-3.5" /> + Add Money
              </span>
            </div>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {symbol}
            {overview.bankBalance.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* UPI Gateway & Linked Account Status Row */}
          {linkedUpi ? (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-600 font-medium">
                  {linkedUpi.provider === 'phonepe' ? 'PhonePe' : 'Google Pay'}:
                </span>
                <span className="font-mono text-purple-800 font-bold text-[11px] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  {linkedUpi.upiId}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpiGateway?.('gateway', 'phonepe');
                  }}
                  className="px-2 py-0.5 rounded-md bg-[#5f259f] hover:bg-[#4d1d82] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <span>पे PhonePe Gateway</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUpiGateway?.('gateway', 'gpay');
                  }}
                  className="px-2 py-0.5 rounded-md bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <span>GPay Gateway</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onOpenUpiGateway?.('link');
              }}
              className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-purple-700 bg-purple-50/70 hover:bg-purple-100/70 p-2 rounded-xl transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-bold text-[11px]">
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Link UPI Account — Directly launch PhonePe & Google Pay Gateway</span>
              </span>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>Link Now</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          )}

          {/* Mandatory Bank Notice from Spec */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-amber-800 bg-amber-50/80 p-2 rounded-xl">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Notice:</strong> Bank balance is calculated from opening balance and transactions entered in SpendWise. It is not an automated bank feed sync.
            </span>
          </div>
        </div>
      </div>

      {/* AI Quick Bar Input */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>AI Natural Language Parser (Safe Draft Mode)</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">
            Draft only • Explicit user confirmation required
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder='Type naturally, e.g. "I bought a pen for 5 rupees using cash" or "Paid ₹40 for bus fare through UPI"'
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                if (target.value.trim()) {
                  onOpenAiAdd(target.value.trim());
                  target.value = '';
                }
              }
            }}
            id="dashboard-ai-input"
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs text-slate-800"
          />
          <button
            onClick={() => {
              const el = document.getElementById('dashboard-ai-input') as HTMLInputElement;
              if (el && el.value.trim()) {
                onOpenAiAdd(el.value.trim());
                el.value = '';
              } else {
                onOpenAiAdd();
              }
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Parse Draft</span>
          </button>
        </div>
      </div>

      {/* Spending Overview & Quality Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Spend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Today's Expenses
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {symbol}
            {overview.todayExpenses.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            This month: {symbol}
            {overview.thisMonthExpenses.toFixed(2)}
          </span>
        </div>

        {/* Proper Spend Quality Metric */}
        <div
          onClick={onViewSpendingQuality}
          className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Proper Spend</span>
            </span>
            <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              {overview.properSpendPercentage}% <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {symbol}
            {overview.totalProperSpend.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Essential & high-value expenses</span>
        </div>

        {/* Waste Spend Quality Metric */}
        <div
          onClick={onViewSpendingQuality}
          className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Waste Spend</span>
            </span>
            <span className="text-xs font-bold text-rose-600 group-hover:translate-x-0.5 transition-transform flex items-center">
              {overview.wasteSpendPercentage}% <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {symbol}
            {overview.totalWasteSpend.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Impulsive / avoidable purchases</span>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Recent Activity</h3>
            <p className="text-xs text-slate-500">Latest wallet and bank entries</p>
          </div>
          <button
            onClick={onViewAllTransactions}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View All History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions recorded yet. Tap <strong>AI Add</strong> or <strong>+ Expense</strong> to start!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.slice(0, 5).map((t) => {
              const cat = getCategory(t.categoryId);
              const isIncome = t.transactionType === 'income';
              const isExpense = t.transactionType === 'expense';
              const isTransfer = t.transactionType === 'transfer';

              return (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-700'
                          : isExpense
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft className="w-4 h-4" />
                      ) : cat ? (
                        <CategoryIcon name={cat.icon} size={18} />
                      ) : isIncome ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                          {t.description}
                        </span>
                        {isExpense && t.spendClassification === 'proper_spend' && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-full">
                            Proper
                          </span>
                        )}
                        {isExpense && t.spendClassification === 'waste_spend' && (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-semibold px-1.5 py-0.2 rounded-full">
                            Waste
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(t.occurredAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold font-mono text-xs sm:text-sm ${
                        isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-blue-600'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {symbol}
                      {t.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
