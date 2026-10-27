import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Calendar,
  Wallet,
  Landmark,
  ThumbsUp,
  Flame,
  HelpCircle,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Transaction, AccountSummary, Category, SpendClassification } from '../types/index.js';
import { CategoryIcon } from './CategoryIcon.js';

interface TransactionHistoryViewProps {
  accounts: AccountSummary[];
  categories: Category[];
  currencySymbol: string;
  onRefresh: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  accounts,
  categories,
  currencySymbol,
  onRefresh,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Edit / Details modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuality, setEditQuality] = useState<SpendClassification>('unclassified');
  const [editNote, setEditNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({
        search: search || undefined,
        accountId: selectedAccount || undefined,
        transactionType: selectedType || undefined,
        spendClassification: selectedQuality || undefined,
        categoryId: selectedCategory || undefined,
        limit: 200,
      });
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, selectedAccount, selectedType, selectedQuality, selectedCategory]);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDesc(tx.description);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.categoryId || '');
    setEditQuality(tx.spendClassification);
    setEditNote(tx.note || '');
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) {
      setActionError('Amount must be positive.');
      return;
    }

    setIsUpdating(true);
    setActionError(null);

    try {
      await api.updateTransaction(editingTx.id, {
        description: editDesc.trim(),
        amount: num,
        categoryId: editCategory || undefined,
        spendClassification: editQuality,
        note: editNote.trim() || undefined,
      });

      setEditingTx(null);
      fetchTransactions();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update transaction.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction? Balances will be recalculated.')) {
      return;
    }

    try {
      await api.deleteTransaction(id);
      if (editingTx?.id === id) setEditingTx(null);
      fetchTransactions();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete transaction.');
    }
  };

  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Classification', 'Note'];
    const rows = transactions.map((t) => [
      t.occurredAt,
      t.transactionType,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.currencyCode,
      t.spendClassification,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SpendWise_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountName = (accId?: string) => {
    const acc = accounts.find((a) => a.account.id === accId);
    return acc ? acc.account.name : 'Unknown Account';
  };

  const getCategory = (catId?: string) => {
    return categories.find((c) => c.id === catId);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-20">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Transaction History</h2>
          <p className="text-xs text-slate-500">
            Search, filter, edit, and audit all income, expenses, and transfers
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={transactions.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions by title, note, or tag..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.account.id} value={a.account.id}>
                {a.account.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="">All Types</option>
            <option value="expense">Expenses Only</option>
            <option value="income">Income Only</option>
            <option value="transfer">Transfers Only</option>
          </select>

          {/* Quality Filter */}
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="">All Spending Quality</option>
            <option value="proper_spend">Proper Spend (Essential)</option>
            <option value="waste_spend">Waste Spend (Impulse/Regret)</option>
            <option value="unclassified">Unclassified</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-600">No transactions found</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Try adjusting your search filters or add a new transaction.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const cat = getCategory(tx.categoryId);
              const isExpense = tx.transactionType === 'expense';
              const isIncome = tx.transactionType === 'income';
              const isTransfer = tx.transactionType === 'transfer';

              return (
                <div
                  key={tx.id}
                  onClick={() => handleOpenEdit(tx)}
                  className="p-3.5 sm:p-4 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-700'
                          : isExpense
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isTransfer ? (
                        <ArrowRightLeft className="w-5 h-5" />
                      ) : cat ? (
                        <CategoryIcon name={cat.icon} size={20} />
                      ) : isIncome ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 truncate">{tx.description}</span>

                        {/* Spend classification badge for expenses */}
                        {isExpense && (
                          <>
                            {tx.spendClassification === 'proper_spend' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                <ThumbsUp className="w-2.5 h-2.5" /> Proper
                              </span>
                            )}
                            {tx.spendClassification === 'waste_spend' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                                <Flame className="w-2.5 h-2.5" /> Waste
                              </span>
                            )}
                            {tx.spendClassification === 'unclassified' && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Unclassified
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                        <span>{new Date(tx.occurredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        {isTransfer ? (
                          <span>
                            {getAccountName(tx.fromAccountId)} ➔ {getAccountName(tx.toAccountId)}
                          </span>
                        ) : (
                          <span>{getAccountName(tx.accountId)}</span>
                        )}
                        {cat && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 font-medium">{cat.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount and quick action */}
                  <div className="text-right shrink-0">
                    <span
                      className={`font-bold font-mono text-sm sm:text-base ${
                        isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-blue-600'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {currencySymbol}
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 block capitalize">
                      {isTransfer ? 'Transfer' : tx.transactionType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Details Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">Edit Transaction</span>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              {actionError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>

              {editingTx.transactionType === 'expense' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="">-- None --</option>
                      {categories
                        .filter((c) => c.type === 'expense')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Spending Classification
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditQuality('proper_spend')}
                        className={`p-1.5 rounded-lg text-xs font-semibold border ${
                          editQuality === 'proper_spend'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Proper
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditQuality('waste_spend')}
                        className={`p-1.5 rounded-lg text-xs font-semibold border ${
                          editQuality === 'waste_spend'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Waste
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditQuality('unclassified')}
                        className={`p-1.5 rounded-lg text-xs font-semibold border ${
                          editQuality === 'unclassified'
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        Unclassified
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Optional memo"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDelete(editingTx.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
