import React, { useState } from 'react';
import {
  X,
  ArrowRightLeft,
  Wallet,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { AccountSummary } from '../types/index.js';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountSummary[];
  currencySymbol: string;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currencySymbol,
  onSuccess,
}) => {
  const cashAcc = accounts.find((a) => a.account.accountType === 'cash');
  const bankAcc = accounts.find((a) => a.account.accountType === 'bank');

  const [fromAccountId, setFromAccountId] = useState(bankAcc?.account.id || '');
  const [toAccountId, setToAccountId] = useState(cashAcc?.account.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('ATM Cash Withdrawal');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 2000, 5000];

  // Presets
  const applyPreset = (type: 'atm' | 'deposit') => {
    if (type === 'atm' && bankAcc && cashAcc) {
      setFromAccountId(bankAcc.account.id);
      setToAccountId(cashAcc.account.id);
      setDescription('ATM Cash Withdrawal');
    } else if (type === 'deposit' && bankAcc && cashAcc) {
      setFromAccountId(cashAcc.account.id);
      setToAccountId(bankAcc.account.id);
      setDescription('Cash Deposit to Bank Account');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a positive transfer amount.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createTransfer({
        fromAccountId,
        toAccountId,
        amount: numAmount,
        description: description.trim() || 'Account Transfer',
        note: note.trim() || undefined,
      });

      onSuccess();
      onClose();
      setAmount('');
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromAccSummary = accounts.find((a) => a.account.id === fromAccountId);
  const toAccSummary = accounts.find((a) => a.account.id === toAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Transfer Money</h2>
              <p className="text-xs text-blue-100">
                Move money atomically between Cash & Bank • Zero impact on total expenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Presets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('atm')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                fromAccountId === bankAcc?.account.id && toAccountId === cashAcc?.account.id
                  ? 'border-blue-500 bg-blue-50/70 font-semibold ring-1 ring-blue-500 text-blue-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">ATM Withdrawal</span>
                <span className="text-[10px] text-slate-500">Bank ➔ Wallet Cash</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('deposit')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                fromAccountId === cashAcc?.account.id && toAccountId === bankAcc?.account.id
                  ? 'border-emerald-500 bg-emerald-50/70 font-semibold ring-1 ring-emerald-500 text-emerald-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Cash Deposit</span>
                <span className="text-[10px] text-slate-500">Wallet Cash ➔ Bank</span>
              </div>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Amount ({currencySymbol})
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
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-xl font-bold font-mono focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  +{currencySymbol}{q.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts selection row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">From Account (Deducted)</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-blue-500 bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.account.id} value={a.account.id}>
                    {a.account.name} (Bal: {currencySymbol}{a.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">To Account (Credited)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-blue-500 bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.account.id} value={a.account.id}>
                    {a.account.name} (Bal: {currencySymbol}{a.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. ATM withdrawal from SBI branch"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Informational Alert */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>Transfers are Atomic Ledger Movements</span>
            </div>
            <p>
              Moving funds between Wallet and Bank adjusts individual balances without increasing or decreasing your total money or affecting your expense reports.
            </p>
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
