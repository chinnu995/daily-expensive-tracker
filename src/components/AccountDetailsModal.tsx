import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Edit3,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  PlusCircle,
  Sparkles,
  GraduationCap,
  Briefcase,
  RefreshCw,
  Coins,
  Smartphone,
  ExternalLink,
  Zap,
  Building2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { AccountSummary, Category } from '../types/index.js';
import {
  LinkedUpiAccount,
  UpiProvider,
  getLinkedUpiAccount,
  buildProviderGatewayUri,
} from '../lib/upiService.js';

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountSummary: AccountSummary | null;
  categories?: Category[];
  currencySymbol: string;
  onSuccess: () => void;
  onOpenUpiGateway?: (mode?: 'gateway' | 'link', provider?: UpiProvider) => void;
}

type TabType = 'add_money' | 'sync_balance' | 'link_upi' | 'ledger' | 'opening';

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  isOpen,
  onClose,
  accountSummary,
  categories = [],
  currencySymbol,
  onSuccess,
  onOpenUpiGateway,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('add_money');
  const [linkedUpi, setLinkedUpi] = useState<LinkedUpiAccount | null>(null);

  useEffect(() => {
    if (isOpen && accountSummary && accountSummary.account.accountType === 'bank') {
      const upi = getLinkedUpiAccount(accountSummary.account.userId || 'demo_user');
      setLinkedUpi(upi);
    }
  }, [isOpen, accountSummary]);

  // Add Money state (Students & Employees)
  const [addAmount, setAddAmount] = useState('');
  const [addSource, setAddSource] = useState('Pocket Money from Parents');
  const [addNote, setAddNote] = useState('');

  // Sync to Actual Balance state
  const [actualTargetBalance, setActualTargetBalance] = useState('');
  const [syncReason, setSyncReason] = useState('');

  // Opening Balance Audit state
  const [newOpeningBalance, setNewOpeningBalance] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !accountSummary) return null;

  const { account, currentBalance, totalIncome, totalExpenses, totalTransfersIn, totalTransfersOut } =
    accountSummary;
  const isCash = account.accountType === 'cash';

  // Quick Amount presets
  const quickAmounts = isCash
    ? [50, 100, 200, 500, 1000, 2000]
    : [500, 1000, 2000, 5000, 10000, 25000];

  // Presets tailored for students and employees
  const studentSources = isCash
    ? [
        'Pocket Money from Parents',
        'Cash Gift / Allowance',
        'Part-time / Tutoring Pay',
        'ATM Cash Added to Wallet',
        'Friend Returned Cash',
      ]
    : [
        'Pocket Money via UPI',
        'Internship Stipend',
        'Scholarship / College Grant',
        'Friend UPI Repayment',
        'Cashback / Reward',
      ];

  const employeeSources = isCash
    ? [
        'ATM Cash Withdrawal',
        'Cash Advance / Allowance',
        'Expense Reimbursement in Cash',
        'Cash Bonus / Tips',
        'Emergency Cash Top-up',
      ]
    : [
        'Monthly Salary Credit',
        'Office Expense Reimbursement',
        'Freelance / Consulting Pay',
        'Quarterly Bonus / Incentive',
        'Bank Transfer Received',
      ];

  // Helper to find best matching income category
  const findIncomeCategory = (sourceText: string) => {
    const lower = sourceText.toLowerCase();
    const incomeCats = categories.filter((c) => c.type === 'income');
    if (lower.includes('salary')) {
      return incomeCats.find((c) => c.name.toLowerCase().includes('salary'))?.id;
    }
    if (lower.includes('freelance') || lower.includes('project') || lower.includes('tutoring') || lower.includes('stipend')) {
      return incomeCats.find((c) => c.name.toLowerCase().includes('freelance'))?.id;
    }
    if (lower.includes('gift') || lower.includes('allowance') || lower.includes('pocket')) {
      return incomeCats.find((c) => c.name.toLowerCase().includes('gift') || c.name.toLowerCase().includes('allowance'))?.id;
    }
    if (lower.includes('refund') || lower.includes('cashback') || lower.includes('reimbursement')) {
      return incomeCats.find((c) => c.name.toLowerCase().includes('refund'))?.id;
    }
    return incomeCats[0]?.id;
  };

  // 1. Handle Add Money (for students getting pocket money, employees getting salary/allowance)
  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(addAmount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const catId = findIncomeCategory(addSource);
      await api.createTransaction({
        transactionType: 'income',
        amount: Math.round(val * 100) / 100,
        accountId: account.id,
        categoryId: catId,
        description: addSource.trim() || (isCash ? 'Wallet Cash Top-up' : 'Bank / UPI Deposit'),
        note: addNote.trim() || undefined,
        tags: [isCash ? 'cash_addition' : 'upi_addition', 'balance_topup'],
        occurredAt: new Date().toISOString(),
      });

      setSuccessMessage(`Successfully added ${currencySymbol}${val.toFixed(2)} to ${account.name}!`);
      setAddAmount('');
      setAddNote('');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to add money.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Sync to Actual Balance (e.g. students counting pocket cash, employees checking UPI app)
  const handleSyncActualBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(actualTargetBalance);
    if (isNaN(target) || target < 0) {
      setError('Target balance must be a non-negative number.');
      return;
    }

    const diff = Math.round((target - currentBalance) * 100) / 100;
    if (Math.abs(diff) < 0.01) {
      setError('Entered balance is already identical to the current balance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const defaultReason = syncReason.trim() || (isCash ? 'Physical wallet cash count' : 'Bank / UPI app balance sync');

      if (diff > 0) {
        // Balance increased: record positive reconciliation income
        const catId = findIncomeCategory(defaultReason);
        await api.createTransaction({
          transactionType: 'income',
          amount: diff,
          accountId: account.id,
          categoryId: catId,
          description: `Balance Update: ${defaultReason}`,
          note: `Adjusted balance from ${currencySymbol}${currentBalance.toFixed(2)} to ${currencySymbol}${target.toFixed(2)}`,
          tags: ['balance_sync', 'reconciliation'],
          occurredAt: new Date().toISOString(),
        });
      } else {
        // Balance decreased: record reconciliation expense
        const expCats = categories.filter((c) => c.type === 'expense');
        const otherExp = expCats.find((c) => c.name.toLowerCase().includes('other'))?.id || expCats[0]?.id;
        await api.createTransaction({
          transactionType: 'expense',
          amount: Math.abs(diff),
          accountId: account.id,
          categoryId: otherExp,
          description: `Balance Update: ${defaultReason}`,
          note: `Adjusted balance from ${currencySymbol}${currentBalance.toFixed(2)} to ${currencySymbol}${target.toFixed(2)}`,
          spendClassification: 'proper_spend',
          tags: ['balance_sync', 'reconciliation'],
          occurredAt: new Date().toISOString(),
        });
      }

      setSuccessMessage(`Balance updated to match ${currencySymbol}${target.toFixed(2)}!`);
      setActualTargetBalance('');
      setSyncReason('');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Auditable Opening Balance correction
  const handleUpdateOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newOpeningBalance);
    if (isNaN(val) || val < 0) {
      setError('Opening balance must be a non-negative number.');
      return;
    }
    if (!correctionReason.trim()) {
      setError('Please provide an auditable reason for adjusting your opening balance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.updateOpeningBalance(account.id, val, correctionReason.trim());
      setSuccessMessage('Opening balance updated in audit log.');
      setNewOpeningBalance('');
      setCorrectionReason('');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Failed to update opening balance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for live previews
  const parsedAdd = parseFloat(addAmount);
  const previewNewAddBalance = !isNaN(parsedAdd) && parsedAdd > 0 ? currentBalance + parsedAdd : null;

  const parsedSync = parseFloat(actualTargetBalance);
  const syncDiff = !isNaN(parsedSync) ? Math.round((parsedSync - currentBalance) * 100) / 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`px-5 py-4 text-white flex items-center justify-between ${
            isCash ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              {isCash ? <Wallet className="w-6 h-6 text-emerald-100" /> : <Landmark className="w-6 h-6 text-blue-100" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg leading-tight">{account.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                  {isCash ? 'Cash' : 'Bank / UPI'}
                </span>
              </div>
              <p className="text-xs text-white/80">Account Ledger & Direct Balance Update</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Available Balance Card */}
        <div className="px-5 pt-4 pb-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Current Available Balance
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {currencySymbol}{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Opening ({currencySymbol}{account.openingBalance.toFixed(2)}) + Income ({currencySymbol}{totalIncome.toFixed(2)}) + In ({currencySymbol}{totalTransfersIn.toFixed(2)}) - Out ({currencySymbol}{(totalExpenses + totalTransfersOut).toFixed(2)})
            </p>
          </div>
        </div>

        {/* Tabs for Students & Employees */}
        <div className="px-5 pt-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('add_money');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'add_money'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Money</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('sync_balance');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 min-w-[100px] py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'sync_balance'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Update to Actual</span>
            </button>
            {!isCash && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('link_upi');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 min-w-[110px] py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'link_upi'
                    ? 'bg-white text-purple-700 shadow-xs font-bold ring-1 ring-purple-500'
                    : 'text-purple-700 bg-purple-50/70 hover:bg-purple-100/70'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                <span>Link UPI / Gateway</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveTab('ledger');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('opening');
                setError(null);
                setSuccessMessage(null);
                setNewOpeningBalance(String(account.openingBalance));
              }}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === 'opening'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Opening</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-5 pt-3">
          {error && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: + ADD MONEY / TOP UP (Students Pocket Money & Employees Salary/Reimbursement) */}
          {activeTab === 'add_money' && (
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Top Up {account.name} Balance</span>
                  <span>
                    Add pocket money from parents, cash gifts, student stipends, or employee salary/reimbursement to directly boost your available balance.
                  </span>
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Select Quick Amount
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAddAmount(String(q))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer border ${
                        addAmount === String(q)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{currencySymbol}{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input & Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount to Add ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                {/* Live balance impact preview */}
                {previewNewAddBalance !== null && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span>Balance after addition:</span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700">
                      {currencySymbol}{previewNewAddBalance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Common Source Selector (Students & Employees) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Source / Purpose
                  </label>
                </div>

                {/* Student presets */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mb-1">
                    <GraduationCap className="w-3 h-3" /> Students & Daily Allowance:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {studentSources.map((source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setAddSource(source)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                          addSource === source
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee presets */}
                <div>
                  <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 mb-1">
                    <Briefcase className="w-3 h-3" /> Employees & Income:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {employeeSources.map((source) => (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setAddSource(source)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                          addSource === source
                            ? 'bg-blue-100 border-blue-400 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {source}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom description field */}
                <input
                  type="text"
                  value={addSource}
                  onChange={(e) => setAddSource(e.target.value)}
                  placeholder="Or enter custom description"
                  className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !addAmount}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Adding to Balance...'
                    : `Add ${currencySymbol}${addAmount || '0'} to ${account.name}`}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: UPDATE TO ACTUAL BALANCE (Counted pocket cash / verified GPay UPI balance) */}
          {activeTab === 'sync_balance' && (
            <form onSubmit={handleSyncActualBalance} className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Sync to Actual {isCash ? 'Physical Cash' : 'UPI App'} Balance</span>
                  <span>
                    Counted your physical cash or checked your PhonePe/GPay app? Enter your exact balance below, and SpendWise will automatically reconcile the difference.
                  </span>
                </div>
              </div>

              {/* Current vs Target */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">Current App Balance</span>
                  <span className="font-bold text-slate-800 text-sm font-mono">
                    {currencySymbol}{currentBalance.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-blue-700 block text-[11px] font-semibold mb-0.5">Target Balance</span>
                  <span className="font-bold text-blue-900 text-sm font-mono">
                    {parsedSync >= 0 ? `${currencySymbol}${parsedSync.toFixed(2)}` : 'Enter amount'}
                  </span>
                </div>
              </div>

              {/* Target Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Current Balance Right Now ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={actualTargetBalance}
                    onChange={(e) => setActualTargetBalance(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Difference badge */}
                {syncDiff !== null && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-xs flex items-center justify-between border ${
                      syncDiff > 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : syncDiff < 0
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Adjustment difference:</span>
                    <span className="font-mono font-bold">
                      {syncDiff > 0 ? `+${currencySymbol}${syncDiff.toFixed(2)} (Credit)` : `${currencySymbol}${syncDiff.toFixed(2)} (Debit)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reconciliation Note / Reason
                </label>
                <input
                  type="text"
                  value={syncReason}
                  onChange={(e) => setSyncReason(e.target.value)}
                  placeholder={
                    isCash
                      ? 'e.g. Counted physical cash in pocket/wallet'
                      : 'e.g. Checked actual Google Pay / PhonePe balance'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !actualTargetBalance}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Updating...'
                    : `Set ${account.name} to ${currencySymbol}${actualTargetBalance || '0'}`}
                </span>
              </button>
            </form>
          )}

          {/* TAB: LINK UPI & PAYMENT GATEWAY (PhonePe & Google Pay) */}
          {activeTab === 'link_upi' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex items-start gap-2.5">
                <Smartphone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block leading-tight">
                    PhonePe & Google Pay Payment Gateway
                  </span>
                  <span className="text-slate-600">
                    Connect your UPI Virtual Payment Address (VPA) or trigger the live payment gateway to transfer and load funds directly.
                  </span>
                </div>
              </div>

              {/* Linked UPI Account Status Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">UPI Link Status</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {linkedUpi ? 'Linked & Verified' : 'Standard Gateway'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">
                      Active VPA Handle
                    </span>
                    <span className="font-bold">{linkedUpi?.upiId || 'user@okaxis'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenUpiGateway?.('link')}
                    className="text-xs text-blue-600 font-sans font-semibold hover:underline cursor-pointer"
                  >
                    Configure
                  </button>
                </div>
              </div>

              {/* Direct Gateway Actions */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Direct Payment Gateway Triggers
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenUpiGateway?.('gateway', 'phonepe')}
                    className="p-3.5 rounded-2xl bg-[#5f259f] hover:bg-[#4d1d82] text-white flex flex-col items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="text-lg">पे</span>
                      <span>Go to PhonePe</span>
                    </div>
                    <span className="text-[10px] text-purple-200 group-hover:text-white flex items-center gap-1">
                      <span>Launch Gateway</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenUpiGateway?.('gateway', 'gpay')}
                    className="p-3.5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white flex flex-col items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span className="text-sm font-black">GPay</span>
                      <span>Go to Google Pay</span>
                    </div>
                    <span className="text-[10px] text-blue-200 group-hover:text-white flex items-center gap-1">
                      <span>Launch Gateway</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </button>
                </div>
              </div>

              {/* Launch Full Gateway Modal with QR Code */}
              <button
                type="button"
                onClick={() => onOpenUpiGateway?.('gateway')}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>Open Full UPI Gateway & Scannable QR Code</span>
              </button>
            </div>
          )}

          {/* TAB 3: LEDGER BREAKDOWN */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {!isCash && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">SpendWise Bank Balance Notice</span>
                    <span>
                      Computed from your declared opening balance and user transactions. It does not auto-sync with verified banking portals.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <span className="text-slate-600 block mb-0.5">Total Income</span>
                  <span className="font-bold text-emerald-700 text-sm font-mono">
                    +{currencySymbol}{totalIncome.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                  <span className="text-slate-600 block mb-0.5">Total Expenses</span>
                  <span className="font-bold text-rose-700 text-sm font-mono">
                    -{currencySymbol}{totalExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <span className="text-slate-600 block mb-0.5">Transfers Received</span>
                  <span className="font-bold text-blue-700 text-sm font-mono">
                    +{currencySymbol}{totalTransfersIn.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                  <span className="text-slate-600 block mb-0.5">Transfers Sent Out</span>
                  <span className="font-bold text-slate-700 text-sm font-mono">
                    -{currencySymbol}{totalTransfersOut.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Opening Balance:</span>
                  <span className="font-mono font-bold text-slate-800">{currencySymbol}{account.openingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Net Flow (Income - Expense):</span>
                  <span className={`font-mono font-bold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {totalIncome - totalExpenses >= 0 ? '+' : ''}{currencySymbol}{(totalIncome - totalExpenses).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Net Transfers (In - Out):</span>
                  <span className="font-mono font-bold text-blue-700">
                    {totalTransfersIn - totalTransfersOut >= 0 ? '+' : ''}{currencySymbol}{(totalTransfersIn - totalTransfersOut).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDITABLE OPENING BALANCE CORRECTION */}
          {activeTab === 'opening' && (
            <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Auditable Opening Balance Calibration</span>
                  <span>
                    Modify the starting balance from when you first opened SpendWise. Every change is tracked with an immutable reason in the audit trail.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Starting Balance ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Opening Balance Calibration *
                </label>
                <input
                  type="text"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Initial balance typo, counted starting physical cash"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newOpeningBalance}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Recording Audit Correction...' : 'Save Audited Opening Balance'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
