import React, { useState } from 'react';
import {
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Wallet,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Calendar,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Category, AccountSummary, ParsedExpenseDraft, SpendClassification } from '../types/index.js';

interface AiExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountSummary[];
  categories: Category[];
  currencySymbol: string;
  onSuccess: () => void;
}

export const AiExpenseModal: React.FC<AiExpenseModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currencySymbol,
  onSuccess,
}) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Draft state (editable by user)
  const [draft, setDraft] = useState<ParsedExpenseDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const examplePrompts = [
    'I bought a pen for 5 rupees using cash.',
    'Paid ₹40 for bus fare through UPI.',
    'I spent ₹100 on lunch.',
    'Received ₹500 as salary.',
    'Bought groceries for ₹350 using cash.',
    'Transfer ₹1,000 from bank to wallet.',
    'I bought some snacks.', // Ambiguous
    'Spent ₹50 on lunch.', // Missing account
  ];

  const handleParse = async (textToParse?: string) => {
    const text = textToParse || inputText;
    if (!text.trim()) return;

    setIsParsing(true);
    setParseError(null);
    setDraft(null);

    try {
      const res = await api.parseExpenseAI(text);
      setDraft(res.draft);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse natural language text.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!draft) return;

    // Validate required fields
    if (!draft.amount || draft.amount <= 0) {
      setSaveError('Please enter a valid amount before saving.');
      return;
    }

    if (draft.transactionType === 'transfer') {
      if (!draft.accountId || !draft.targetAccountId) {
        setSaveError('Please select both source and destination accounts for the transfer.');
        return;
      }
    } else {
      if (!draft.accountId) {
        setSaveError('Please select a payment account (Wallet / Cash or Bank / UPI).');
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (draft.transactionType === 'transfer') {
        await api.createTransfer({
          fromAccountId: draft.accountId!,
          toAccountId: draft.targetAccountId!,
          amount: draft.amount,
          description: draft.description,
          occurredAt: draft.occurredAt,
        });
      } else {
        await api.createTransaction({
          transactionType: draft.transactionType,
          amount: draft.amount,
          accountId: draft.accountId!,
          categoryId: draft.categoryId || undefined,
          description: draft.description,
          spendClassification: draft.spendClassification,
          occurredAt: draft.occurredAt,
        });
      }

      onSuccess();
      onClose();
      // Reset
      setInputText('');
      setDraft(null);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const cashAcc = accounts.find((a) => a.account.accountType === 'cash');
  const bankAcc = accounts.find((a) => a.account.accountType === 'bank');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg">AI Expense Parser</h2>
              <p className="text-xs text-emerald-100">
                Natural-language entry • Safe draft review before saving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Natural Language Input Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Describe your expense, income, or transfer:
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. I bought a pen for 5 rupees using cash."
                className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => handleParse()}
                disabled={isParsing || !inputText.trim()}
                className="absolute right-2 bottom-2.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isParsing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Parse Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Example Chips */}
          <div>
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
              Click an example to test:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {examplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(p);
                    handleParse(p);
                  }}
                  className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {parseError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* DRAFT REVIEW CARD */}
          {draft && (
            <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/20 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>AI Generated Draft (Review & Edit)</span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Confidence: {Math.round(draft.confidence * 100)}%
                </span>
              </div>

              {/* Clarification Box if missing info */}
              {draft.clarificationQuestion && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Clarification Needed:</span>
                    <span>{draft.clarificationQuestion}</span>
                    <span className="block mt-1 text-[11px] text-amber-800">
                      Please supply the missing details in the fields below.
                    </span>
                  </div>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Item</label>
                  <input
                    type="text"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:border-emerald-500 bg-white"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ({currencySymbol})
                    {!draft.amount && (
                      <span className="text-rose-500 text-[10px] ml-1 font-normal">*Required</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={draft.amount !== null ? draft.amount : ''}
                    placeholder="Enter amount"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        amount: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className={`w-full px-3 py-1.5 rounded-lg border text-sm font-mono focus:outline-hidden bg-white ${
                      !draft.amount ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={draft.transactionType}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        transactionType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 bg-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Payment Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {draft.transactionType === 'transfer' ? 'From Account' : 'Account'}
                    {!draft.accountId && (
                      <span className="text-rose-500 text-[10px] ml-1 font-normal">*Select account</span>
                    )}
                  </label>
                  <select
                    value={draft.accountId || ''}
                    onChange={(e) => setDraft({ ...draft, accountId: e.target.value || null })}
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs focus:outline-hidden bg-white ${
                      !draft.accountId ? 'border-amber-400 bg-amber-50/30' : 'border-slate-300 focus:border-emerald-500'
                    }`}
                  >
                    <option value="">-- Choose Account --</option>
                    {cashAcc && <option value={cashAcc.account.id}>Wallet / Cash (₹{cashAcc.currentBalance.toFixed(2)})</option>}
                    {bankAcc && <option value={bankAcc.account.id}>Bank / UPI (₹{bankAcc.currentBalance.toFixed(2)})</option>}
                  </select>
                </div>

                {/* Destination Account for Transfers */}
                {draft.transactionType === 'transfer' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      To Account
                      {!draft.targetAccountId && (
                        <span className="text-rose-500 text-[10px] ml-1 font-normal">*Select target</span>
                      )}
                    </label>
                    <select
                      value={draft.targetAccountId || ''}
                      onChange={(e) => setDraft({ ...draft, targetAccountId: e.target.value || null })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 bg-white"
                    >
                      <option value="">-- Choose Target Account --</option>
                      {cashAcc && <option value={cashAcc.account.id}>Wallet / Cash</option>}
                      {bankAcc && <option value={bankAcc.account.id}>Bank / UPI</option>}
                    </select>
                  </div>
                )}

                {/* Category (for Expense & Income) */}
                {draft.transactionType !== 'transfer' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={draft.categoryId || ''}
                      onChange={(e) => {
                        const cat = categories.find((c) => c.id === e.target.value);
                        setDraft({
                          ...draft,
                          categoryId: e.target.value || null,
                          categoryName: cat?.name || null,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-hidden focus:border-emerald-500 bg-white"
                    >
                      <option value="">-- Select Category --</option>
                      {categories
                        .filter((c) => c.type === draft.transactionType)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Spend Classification (Only for Expenses) */}
                {draft.transactionType === 'expense' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Spending Quality Classification
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, spendClassification: 'proper_spend' })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          draft.spendClassification === 'proper_spend'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>Proper Spend</span>
                        <span className="text-[9px] opacity-80 font-normal">Need / Planned</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, spendClassification: 'waste_spend' })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          draft.spendClassification === 'waste_spend'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>Waste Spend</span>
                        <span className="text-[9px] opacity-80 font-normal">Impulse / Regret</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, spendClassification: 'unclassified' })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex flex-col items-center justify-center transition-all cursor-pointer ${
                          draft.spendClassification === 'unclassified'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>Unclassified</span>
                        <span className="text-[9px] opacity-80 font-normal">Review Later</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {saveError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/50">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Discard Draft
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={isSaving || !draft.amount}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm and Save Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
