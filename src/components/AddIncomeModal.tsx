import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Wallet,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Coins,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { AccountSummary, Category } from '../types/index.js';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountSummary[];
  categories: Category[];
  currencySymbol: string;
  onSuccess: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currencySymbol,
  onSuccess,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.account.id || '');
  const incomeCategories = categories.filter((c) => c.type === 'income');
  const [categoryId, setCategoryId] = useState(incomeCategories[0]?.id || '');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a positive income amount.');
      return;
    }
    if (!accountId) {
      setError('Please select an account to receive the income.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createTransaction({
        transactionType: 'income',
        amount: numAmount,
        accountId,
        categoryId: categoryId || undefined,
        description: description.trim() || 'Income',
        note: note.trim() || undefined,
        occurredAt: new Date(occurredAt).toISOString(),
      });

      onSuccess();
      onClose();
      setDescription('');
      setAmount('');
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to record income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <Coins className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Add Income</h2>
              <p className="text-xs text-emerald-100">Record salary, client payments, gifts, or returns</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Income Amount ({currencySymbol})
            </label>
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-xl font-bold font-mono focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  +{currencySymbol}{q.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source / Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly Salary, Freelance project, Gift from family"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Into Account</label>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const isCash = acc.account.accountType === 'cash';
                const isSelected = accountId === acc.account.id;
                return (
                  <button
                    key={acc.account.id}
                    type="button"
                    onClick={() => setAccountId(acc.account.id)}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isCash ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isCash ? <Wallet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{acc.account.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Bal: {currencySymbol}{acc.currentBalance.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Income Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-emerald-500 bg-white"
            >
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reference number or note"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Income</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
