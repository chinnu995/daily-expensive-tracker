import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  X,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Budget, Category } from '../types/index.js';

interface BudgetViewProps {
  categories: Category[];
  currencySymbol: string;
}

export const BudgetView: React.FC<BudgetViewProps> = ({ categories, currencySymbol }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(''); // empty string = overall monthly
  const [amount, setAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.getBudgets(currentMonth);
      setBudgets(res.budgets);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a positive budget target.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.setBudget({
        categoryId: categoryId || null,
        amount: num,
        periodMonth: currentMonth,
        alertThreshold: parseInt(alertThreshold, 10) || 80,
      });

      setIsAddOpen(false);
      setAmount('');
      setCategoryId('');
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || 'Failed to set budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.deleteBudget(id);
      fetchBudgets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete budget.');
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Budget Limits & Alerts</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              {currentMonth}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Control overall and category-level monthly spending with instant alerts
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddOpen(true);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Set Budget</span>
        </button>
      </div>

      {/* Budget List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
          <span>Loading budgets...</span>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          <PiggyBank className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h4 className="font-bold text-slate-700 text-sm">No budgets set for this month</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create an overall monthly budget or specific category caps to keep your spending on track.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const isOverall = b.categoryId === null;
            const cat = categories.find((c) => c.id === b.categoryId);
            const title = isOverall ? 'Overall Monthly Budget' : cat?.name || 'Category Budget';

            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 transition-all ${
                  b.isExceeded
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : b.isNearLimit
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isOverall
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                      <span className="text-[10px] text-slate-400">
                        Threshold warning: {b.alertThreshold}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBudget(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      Spent: {currencySymbol}{b.spent.toFixed(2)}
                    </span>
                    <span className="font-bold text-slate-800">
                      Limit: {currencySymbol}{b.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.isExceeded
                          ? 'bg-rose-600'
                          : b.isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span
                      className={`font-semibold ${
                        b.isExceeded
                          ? 'text-rose-600'
                          : b.isNearLimit
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {b.percentUsed}% used
                    </span>
                    <span className="text-slate-500 font-mono">
                      {b.remaining >= 0
                        ? `Remaining: ${currencySymbol}${b.remaining.toFixed(2)}`
                        : `Exceeded by: ${currencySymbol}${Math.abs(b.remaining).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Warning Alert Badges */}
                {b.isExceeded ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-semibold">Budget Exceeded! Spending has exceeded 100%.</span>
                  </div>
                ) : b.isNearLimit ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">
                      Approaching Limit! Spent more than {b.alertThreshold}% of budget.
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Budget Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <span className="font-bold text-sm">Create Monthly Budget</span>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="p-5 space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Target</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                >
                  <option value="">Overall Monthly Budget (All Expenses)</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Category: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Budget Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alert Warning Threshold (%)
                </label>
                <select
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                >
                  <option value="70">70% of budget</option>
                  <option value="80">80% of budget (Recommended)</option>
                  <option value="90">90% of budget</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Setting...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
