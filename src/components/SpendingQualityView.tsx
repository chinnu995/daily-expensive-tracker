import React, { useState, useEffect } from 'react';
import {
  PieChart,
  ThumbsUp,
  Flame,
  HelpCircle,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { SpendingQualityReport } from '../types/index.js';

interface SpendingQualityViewProps {
  currencySymbol: string;
}

export const SpendingQualityView: React.FC<SpendingQualityViewProps> = ({ currencySymbol }) => {
  const [report, setReport] = useState<SpendingQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetCutPercentage, setTargetCutPercentage] = useState(50); // for hypothetical potential savings simulation

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getSpendingQualityReport(currentMonth);
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch spending quality report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
        <span>Analyzing spending quality...</span>
      </div>
    );
  }

  if (!report) return null;

  // Calculate hypothetical savings
  const simulatedSavings = Math.round(((report.totalWaste * targetCutPercentage) / 100) * 100) / 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Spending Quality & Waste Analytics</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
            {report.month}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Distinguish high-value investments (Proper Spend) from regretful purchases (Waste Spend)
        </p>
      </div>

      {/* Top Cards: Proper vs Waste vs Total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Proper Spend Card */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <span>Proper Spend</span>
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              {report.properPercentage}% of expenses
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {currencySymbol}
            {report.totalProper.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Essential groceries, bus/commute fare, study books, utilities, planned value purchases.
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, report.properPercentage)}%` }}
            />
          </div>
        </div>

        {/* Waste Spend Card */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Waste Spend</span>
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
              {report.wastePercentage}% of expenses
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {currencySymbol}
            {report.totalWaste.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Impulse orders, discarded takeout, forgotten subscriptions, buyer's remorse.
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, report.wastePercentage)}%` }}
            />
          </div>
        </div>

        {/* Unclassified Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Unclassified</span>
            </span>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {report.unclassifiedPercentage}%
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {currencySymbol}
            {report.totalUnclassified.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Expenses awaiting your review. Classifying them sharpens your savings recommendations.
          </p>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-slate-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, report.unclassifiedPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hypothetical Potential Savings Calculator */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Hypothetical Potential Savings Simulation</span>
          </div>
          <h3 className="text-xl font-extrabold text-white">
            What if you trimmed your waste spending?
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            By avoiding unnecessary purchases classified as waste spending, you directly retain cash in your wallet and bank accounts.
          </p>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Reduction Target:</span>
                <span className="font-bold text-emerald-400 font-mono">{targetCutPercentage}% cut</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={targetCutPercentage}
                onChange={(e) => setTargetCutPercentage(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-center sm:text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">
                Estimated Monthly Savings
              </span>
              <span className="text-2xl font-black text-emerald-300 font-mono">
                {currencySymbol}
                {simulatedSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 italic">
            *Presented as a hypothetical estimate calculated strictly from your recorded waste expenses ({currencySymbol}{report.totalWaste.toFixed(2)}). Not guaranteed returns.
          </p>
        </div>
      </div>

      {/* Waste Spending by Category */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
          <span>Waste Spending by Category</span>
          <span className="text-xs text-slate-500 font-normal">
            Where your impulse spending goes
          </span>
        </h3>

        {report.wasteByCategory.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-60" />
            <p className="font-semibold text-slate-700">Zero waste recorded this month!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All of your recorded expenses are currently marked as proper or unclassified.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {report.wasteByCategory.map((cat, idx) => {
              const pct = report.totalWaste > 0 ? Math.round((cat.amount / report.totalWaste) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({cat.count} purchases)</span>
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      {currencySymbol}{cat.amount.toFixed(2)}{' '}
                      <span className="text-slate-400 font-normal text-[11px]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
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
