import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  PlusCircle,
  Wallet,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Flame,
  HelpCircle,
  Sparkles,
  RotateCcw,
  TrendingDown,
  Search,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { classifyWithClientCatalog } from '../lib/googleClassifier.js';
import { AccountSummary, Category, SpendClassification } from '../types/index.js';

interface QuickAddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountSummary[];
  categories: Category[];
  currencySymbol: string;
  onSuccess: () => void;
  allowOverdraft?: boolean;
}

export const QuickAddExpenseModal: React.FC<QuickAddExpenseModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currencySymbol,
  onSuccess,
  allowOverdraft = false,
}) => {
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const defaultExpenseCat =
    expenseCategories.find((c) => c.name.toLowerCase().includes('food')) ||
    expenseCategories[0];

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.account.id || '');
  const [categoryId, setCategoryId] = useState(defaultExpenseCat?.id || '');
  const [spendClassification, setSpendClassification] =
    useState<SpendClassification>('proper_spend');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI & Google recognition states
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiDetectedClassification, setAiDetectedClassification] =
    useState<SpendClassification | null>(null);
  const [aiRationale, setAiRationale] = useState<string>('');
  const [isUserOverriddenClassification, setIsUserOverriddenClassification] = useState(false);
  const [isUserOverriddenCategory, setIsUserOverriddenCategory] = useState(false);
  const [isUserOverriddenAccount, setIsUserOverriddenAccount] = useState(false);

  // Keep debouncing ref
  const debounceTimerRef = useRef<any>(null);

  // Quick amount chips
  const quickAmounts = [20, 50, 100, 200, 500, 1000];

  // Quick test items for instant Google verification
  const quickExamples = [
    { label: 'meal', type: 'proper' },
    { label: 'pizza', type: 'waste', query: 'pizza' },
    { label: 'burger', type: 'waste', query: 'burger' },
    { label: 'rapido', type: 'proper', query: 'rapido' },
    { label: 'mobile repair', type: 'proper', query: 'mobile repair' },
    { label: 'kurkure', type: 'waste' },
    { label: 'lace / lays', type: 'waste', query: 'lace' },
    { label: 'perfume', type: 'proper', query: 'perfume' },
    { label: 'bus fare', type: 'proper' },
    { label: 'pen', type: 'proper' },
    { label: 'cold drink', type: 'waste' },
    { label: 'milk', type: 'proper' },
  ];

  // Set default account and category when modal opens or updates
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].account.id);
    }
    if (!categoryId && defaultExpenseCat) {
      setCategoryId(defaultExpenseCat.id);
    }
  }, [accounts, accountId, categoryId, defaultExpenseCat]);

  // Instant Google & Local Catalog Classifier (0ms latency feedback on keystroke)
  const runInstantClassifier = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setAiDetectedClassification(null);
        setAiRationale('');
        return;
      }

      const result = classifyWithClientCatalog(trimmed, categories);

      setAiDetectedClassification(result.spendClassification);
      setAiRationale(result.rationale);

      // Auto-set spending quality if not manually overridden by user
      if (!isUserOverriddenClassification) {
        setSpendClassification(result.spendClassification);
      }

      // Auto-set category if not manually overridden
      if (!isUserOverriddenCategory && result.matchedCategory) {
        setCategoryId(result.matchedCategory.id);
      }

      // Auto-set account suggestion (e.g. if cash or upi specified in description)
      if (!isUserOverriddenAccount && result.accountSuggestion) {
        const matchedAcc = accounts.find(
          (a) => a.account.accountType === result.accountSuggestion
        );
        if (matchedAcc) {
          setAccountId(matchedAcc.account.id);
        }
      }
    },
    [
      categories,
      accounts,
      isUserOverriddenClassification,
      isUserOverriddenCategory,
      isUserOverriddenAccount,
    ]
  );

  // Handle input change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    // Instant zero-delay Google catalog check
    runInstantClassifier(val);

    // Background server call for deep Gemini reasoning
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsAiClassifying(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const result = await api.classifyDescription(val.trim());
          if (result) {
            setAiDetectedClassification(result.spendClassification);
            setAiRationale(result.rationale || '');

            if (!isUserOverriddenClassification && result.spendClassification) {
              setSpendClassification(result.spendClassification);
            }

            if (!isUserOverriddenCategory && result.categoryId) {
              setCategoryId(result.categoryId);
            }

            if (!isUserOverriddenAccount && result.accountSuggestion) {
              const matchedAcc = accounts.find(
                (a) => a.account.accountType === result.accountSuggestion
              );
              if (matchedAcc) {
                setAccountId(matchedAcc.account.id);
              }
            }
          }
        } catch {
          // Fallback to instant Google catalog
        } finally {
          setIsAiClassifying(false);
        }
      }, 350);
    } else {
      setIsAiClassifying(false);
    }
  };

  const handleApplyQuickExample = (text: string) => {
    setDescription(text);
    runInstantClassifier(text);
  };

  const handleManualClassificationSelect = (type: SpendClassification) => {
    setSpendClassification(type);
    setIsUserOverriddenClassification(true);
  };

  const handleResetToAiClassification = () => {
    setIsUserOverriddenClassification(false);
    if (aiDetectedClassification) {
      setSpendClassification(aiDetectedClassification);
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const selectedAccount = accounts.find((a) => a.account.id === accountId);
  const selectedCurrentBal = selectedAccount?.currentBalance ?? 0;
  const selectedAfterBal = selectedCurrentBal - numAmount;
  const isInsufficient = numAmount > selectedCurrentBal && !allowOverdraft;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a positive expense amount.');
      return;
    }
    if (!accountId) {
      setError('Please select a payment account.');
      return;
    }
    if (isInsufficient) {
      setError(
        `Insufficient balance in ${selectedAccount?.account.name}. Required: ${currencySymbol}${numAmount.toFixed(
          2
        )}, Available: ${currencySymbol}${selectedCurrentBal.toFixed(2)}`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tagList = tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      await api.createTransaction({
        transactionType: 'expense',
        amount: numAmount,
        accountId,
        categoryId: categoryId || undefined,
        description: description.trim() || 'Expense',
        note: note.trim() || undefined,
        tags: tagList,
        spendClassification,
        occurredAt: new Date(occurredAt).toISOString(),
      });

      onSuccess();
      onClose();
      // Reset form
      setDescription('');
      setAmount('');
      setNote('');
      setTags('');
      setIsUserOverriddenClassification(false);
      setIsUserOverriddenCategory(false);
      setIsUserOverriddenAccount(false);
      setAiDetectedClassification(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg leading-tight">Record Expense</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-200" />
                  Google & AI Grounded
                </span>
              </div>
              <p className="text-xs text-rose-100">
                Auto-classifies Proper vs Waste spend (e.g. Kurkure, Lays, Meals) & updates balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount input & Quick chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Expense Amount ({currencySymbol})
              </label>
              {numAmount > 0 && selectedAccount && (
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 font-mono">
                  Deducting from {selectedAccount.account.name}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-base">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-xl font-bold font-mono focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer font-mono"
                >
                  +{currencySymbol}{q}
                </button>
              ))}
            </div>
          </div>

          {/* Item / Description with Real-time Google & AI recognition */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>Item / Description</span>
                <span className="text-rose-500">*</span>
              </label>
              {isAiClassifying ? (
                <span className="text-[11px] text-amber-600 flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  Verifying with Google...
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Search className="w-2.5 h-2.5" /> Google consumer verified
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={description}
              onChange={handleDescriptionChange}
              placeholder="e.g. meal, kurkure, lace, pen, bus fare, groceries"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium"
            />

            {/* Quick example items */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-semibold text-slate-400 mr-0.5">Try:</span>
              {quickExamples.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => handleApplyQuickExample(ex.query || ex.label)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer border ${
                    ex.type === 'waste'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Google & AI Real-time recognition result banner */}
            {description.trim().length > 0 && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 shadow-xs ${
                  aiDetectedClassification === 'proper_spend'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : aiDetectedClassification === 'waste_spend'
                    ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      aiDetectedClassification === 'proper_spend'
                        ? 'bg-emerald-100 text-emerald-700'
                        : aiDetectedClassification === 'waste_spend'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {aiDetectedClassification === 'proper_spend' && <ThumbsUp className="w-4 h-4" />}
                    {aiDetectedClassification === 'waste_spend' && <Flame className="w-4 h-4" />}
                    {aiDetectedClassification === 'unclassified' && <HelpCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold">
                        {aiDetectedClassification === 'proper_spend' && '✨ Google & AI: Proper Spend'}
                        {aiDetectedClassification === 'waste_spend' && '🔥 Google & AI: Waste Spend'}
                        {aiDetectedClassification === 'unclassified' && '✨ Google & AI: Unclassified'}
                      </span>
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full font-bold ${
                          aiDetectedClassification === 'proper_spend'
                            ? 'bg-emerald-200/80 text-emerald-900'
                            : aiDetectedClassification === 'waste_spend'
                            ? 'bg-rose-200/80 text-rose-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {aiDetectedClassification === 'proper_spend' && 'Essential / Value'}
                        {aiDetectedClassification === 'waste_spend' && 'Impulse / Junk'}
                        {aiDetectedClassification === 'unclassified' && 'Decide Later'}
                      </span>
                    </div>
                    <span className="text-[11px] opacity-85 block leading-tight mt-0.5">
                      {aiRationale || 'Auto-classified based on real-world spending data'}
                    </span>
                  </div>
                </div>

                {/* If user manually changed classification, give option to reset */}
                {isUserOverriddenClassification && (
                  <button
                    type="button"
                    onClick={handleResetToAiClassification}
                    className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer bg-white/70 px-2 py-1 rounded-md border border-indigo-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to AI
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Paid From Account with LIVE projected balance calculation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Paid From Account (Direct Balance Impact)
              </label>
              {numAmount > 0 && (
                <span className="text-[11px] font-medium text-slate-500 font-mono">
                  Live Preview: Deducts {currencySymbol}{numAmount.toFixed(2)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const isCash = acc.account.accountType === 'cash';
                const isSelected = accountId === acc.account.id;
                const projectedBal = acc.currentBalance - (isSelected ? numAmount : 0);
                const hasNegative = projectedBal < 0 && !allowOverdraft;

                return (
                  <button
                    key={acc.account.id}
                    type="button"
                    onClick={() => {
                      setAccountId(acc.account.id);
                      setIsUserOverriddenAccount(true);
                    }}
                    className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? hasNegative
                          ? 'border-rose-500 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-500'
                          : 'border-rose-500 bg-rose-50/50 text-rose-950 font-semibold ring-2 ring-rose-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`p-2 rounded-lg ${
                          isCash ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">
                          {acc.account.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          Current: {currencySymbol}{acc.currentBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Projected balance after deduction */}
                    {numAmount > 0 && (
                      <div
                        className={`pt-1.5 border-t border-slate-200/80 text-[11px] font-mono flex items-center justify-between ${
                          isSelected
                            ? hasNegative
                              ? 'text-rose-700 font-bold'
                              : 'text-emerald-700 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {isSelected ? 'After Spend:' : 'If Chosen:'}
                        </span>
                        <span className="flex items-center gap-1 font-bold">
                          {currencySymbol}
                          {(acc.currentBalance - numAmount).toFixed(2)}
                          {isSelected && <TrendingDown className="w-3 h-3 text-rose-500" />}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {isInsufficient && (
              <p className="mt-1 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Selected account does not have enough funds to cover this expense.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Category</span>
                {!isUserOverriddenCategory && description.trim() && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                    AI Analyzed Category
                  </span>
                )}
              </label>
              {isUserOverriddenCategory ? (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Manual Category Active
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Auto-updates from item name</span>
              )}
            </div>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setIsUserOverriddenCategory(true);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-rose-500 bg-white font-medium"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Spending Quality Classification with AI auto-selection & manual override */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>Spending Quality Classification</span>
              </label>
              {isUserOverriddenClassification ? (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Manual Override Active
                </span>
              ) : (
                aiDetectedClassification && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Auto-Selected by Google/AI
                  </span>
                )
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Proper Spend Button */}
              <button
                type="button"
                onClick={() => handleManualClassificationSelect('proper_spend')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  spendClassification === 'proper_spend'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {!isUserOverriddenClassification &&
                  aiDetectedClassification === 'proper_spend' && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-600 text-[9px] font-bold text-white rounded-full flex items-center gap-0.5 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-xs">Proper</span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Essential / Value
                </span>
              </button>

              {/* Waste Spend Button */}
              <button
                type="button"
                onClick={() => handleManualClassificationSelect('waste_spend')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  spendClassification === 'waste_spend'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {!isUserOverriddenClassification && aiDetectedClassification === 'waste_spend' && (
                  <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-rose-600 text-[9px] font-bold text-white rounded-full flex items-center gap-0.5 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
                <div className="flex items-center justify-center gap-1 text-rose-600 mb-0.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-xs">Waste</span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">
                  Impulse / Regret
                </span>
              </button>

              {/* Unclassified Button */}
              <button
                type="button"
                onClick={() => handleManualClassificationSelect('unclassified')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                  spendClassification === 'unclassified'
                    ? 'border-slate-500 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-500 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {!isUserOverriddenClassification &&
                  aiDetectedClassification === 'unclassified' &&
                  description.trim().length > 0 && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-slate-600 text-[9px] font-bold text-white rounded-full flex items-center gap-0.5 shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                <div className="flex items-center justify-center gap-1 text-slate-600 mb-0.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="text-xs">Unclassified</span>
                </div>
                <span className="text-[10px] text-slate-500 block leading-tight">Decide Later</span>
              </button>
            </div>

            {/* Pizza & Fast Food Contextual Hint */}
            {/(pizza|burger|domino|mcdonald|kfc|fries|fast food|momos)/i.test(description) && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                <span className="text-sm shrink-0">🍕</span>
                <div>
                  <span className="font-semibold">AI Guidance for Pizza & Fast Food:</span>{' '}
                  Commercial fast food is suggested as <strong className="text-rose-700">Waste (Craving/Indulgence)</strong> by default to help keep track of discretionary spending. If this pizza served as your <em>essential meal (lunch/dinner)</em>, simply tap <strong className="text-emerald-700">Proper</strong> above to mark it as necessary sustenance!
                </div>
              </div>
            )}
          </div>

          {/* Date and Optional Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Note / Tags
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. college, project"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="text-xs text-slate-500 font-mono">
              {selectedAccount && numAmount > 0 ? (
                <span>
                  {selectedAccount.account.name}: {currencySymbol}
                  {selectedCurrentBal.toFixed(2)} ➔ {currencySymbol}
                  {selectedAfterBal.toFixed(2)}
                </span>
              ) : (
                <span>Balance will be deducted upon save</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isInsufficient}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Expense</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
