import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BarChart3,
  TrendingDown,
  TrendingUp,
  ThumbsUp,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  Layers,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Download,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { generateMonthlyReportPdf } from '../lib/pdfReportGenerator.js';
import {
  WeeklyReport,
  MonthlySummaryReport,
  ConsecutiveWeeksReport,
  YearlyReport,
  SpendingQualityReport,
} from '../types/index.js';

type ReportTab = '1-week' | '1-month' | 'consecutive-weeks' | '1-year' | 'quality';

interface ReportsViewProps {
  currencySymbol: string;
  userDisplayName?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currencySymbol, userDisplayName = 'Aarav Sharma' }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('1-week');
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // 1-Week Report State
  const [weeklyData, setWeeklyData] = useState<WeeklyReport | null>(null);

  // 1-Month Report State
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryReport | null>(null);

  const handleDownloadMonthlyPdf = () => {
    if (!monthlyData) return;
    setIsGeneratingPdf(true);
    try {
      generateMonthlyReportPdf(monthlyData, currencySymbol, userDisplayName);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to generate PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Consecutive Weeks Report State
  const [consecutiveWeeksCount, setConsecutiveWeeksCount] = useState(6);
  const [consecutiveData, setConsecutiveData] = useState<ConsecutiveWeeksReport | null>(null);

  // 1-Year Report State
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYearNum);
  const [yearlyData, setYearlyData] = useState<YearlyReport | null>(null);

  // Spending Quality Report State
  const [qualityData, setQualityData] = useState<SpendingQualityReport | null>(null);
  const [targetCutPercentage, setTargetCutPercentage] = useState(50);

  // Load data according to active tab
  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeTab === '1-week') {
        const res = await api.getWeeklyReport();
        setWeeklyData(res);
      } else if (activeTab === '1-month') {
        const res = await api.getMonthlySummaryReport(selectedMonth);
        setMonthlyData(res);
      } else if (activeTab === 'consecutive-weeks') {
        const res = await api.getConsecutiveWeeksReport(consecutiveWeeksCount);
        setConsecutiveData(res);
      } else if (activeTab === '1-year') {
        const res = await api.getYearlyReport(selectedYear);
        setYearlyData(res);
      } else if (activeTab === 'quality') {
        const res = await api.getSpendingQualityReport(selectedMonth);
        setQualityData(res);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedMonth, consecutiveWeeksCount, selectedYear]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Financial Reports & Analytics</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              SpendWise Intelligence
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate your spending performance across 1 week, 1 month, consecutive weeks, and 1 year
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('1-week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === '1-week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Week
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('1-month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === '1-month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Month
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('consecutive-weeks')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'consecutive-weeks'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Consecutive Weeks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('1-year')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === '1-year'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Year
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quality'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Waste vs Proper
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-xs font-medium">Calculating report ledger metrics...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ========================================================= */}
          {/* 1. ONE WEEK REPORT                                        */}
          {/* ========================================================= */}
          {activeTab === '1-week' && weeklyData && (
            <div className="space-y-6">
              {/* Range & WoW Pill */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200">
                <span className="font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>
                    Past 7 Days: {weeklyData.startDate} to {weeklyData.endDate}
                  </span>
                </span>
                <span className="font-medium">
                  Prior 7 Days: {currencySymbol}
                  {weeklyData.previousWeekExpenses.toFixed(2)} (
                  <span
                    className={
                      weeklyData.weekOverWeekChange <= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'
                    }
                  >
                    {weeklyData.weekOverWeekChange > 0 ? '+' : ''}
                    {weeklyData.weekOverWeekChange}% WoW
                  </span>
                  )
                </span>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Week Total Spent
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {currencySymbol}
                    {weeklyData.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Avg ~{currencySymbol}{(weeklyData.totalExpenses / 7).toFixed(2)}/day
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Proper Spend</span>
                  </span>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {currencySymbol}
                    {weeklyData.totalProper.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block font-semibold">
                    {weeklyData.properPercentage}% of weekly spend
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>Waste Spend</span>
                  </span>
                  <div className="text-2xl font-black text-rose-700 font-mono">
                    {currencySymbol}
                    {weeklyData.totalWaste.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                    {weeklyData.wastePercentage}% of weekly spend
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Week Total Income
                  </span>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    +{currencySymbol}
                    {weeklyData.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Net: {currencySymbol}
                    {(weeklyData.totalIncome - weeklyData.totalExpenses).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 7-Day Visual Daily Bar Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                      Daily 7-Day Spending Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hover to view Proper (green) vs Waste (red) per day
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Proper
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Waste
                    </span>
                  </div>
                </div>

                {/* SVG/HTML Responsive Bar Chart */}
                {(() => {
                  const maxDayVal = Math.max(
                    ...weeklyData.daily.map((d) => d.totalExpense),
                    50
                  );
                  return (
                    <div className="pt-4 pb-2">
                      <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 px-2">
                        {weeklyData.daily.map((day, idx) => {
                          const heightPct = (day.totalExpense / maxDayVal) * 100;
                          const properPct =
                            day.totalExpense > 0 ? (day.proper / day.totalExpense) * 100 : 0;
                          const wastePct =
                            day.totalExpense > 0 ? (day.waste / day.totalExpense) * 100 : 0;

                          return (
                            <div key={idx} className="flex flex-col items-center h-full justify-end group">
                              <div className="text-[10px] font-mono text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {currencySymbol}
                                {day.totalExpense.toFixed(0)}
                              </div>
                              <div
                                className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-95"
                                style={{ height: `${Math.max(8, heightPct)}%` }}
                              >
                                {wastePct > 0 && (
                                  <div
                                    className="bg-rose-500 w-full"
                                    style={{ height: `${wastePct}%` }}
                                    title={`Waste: ${currencySymbol}${day.waste.toFixed(2)}`}
                                  />
                                )}
                                {properPct > 0 && (
                                  <div
                                    className="bg-emerald-500 w-full"
                                    style={{ height: `${properPct}%` }}
                                    title={`Proper: ${currencySymbol}${day.proper.toFixed(2)}`}
                                  />
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-700 mt-2 block">
                                {day.dayLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {day.date.slice(8, 10)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Daily Table Summary */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2">Date</th>
                        <th className="py-2">Total Expense</th>
                        <th className="py-2">Proper Spend</th>
                        <th className="py-2">Waste Spend</th>
                        <th className="py-2">Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {weeklyData.daily.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 font-medium text-slate-800">
                            {d.date} ({d.dayLabel})
                          </td>
                          <td className="py-2 font-mono font-bold text-slate-900">
                            {currencySymbol}
                            {d.totalExpense.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-emerald-600">
                            {currencySymbol}
                            {d.proper.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-rose-600">
                            {currencySymbol}
                            {d.waste.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-emerald-700">
                            {d.income > 0 ? `+${currencySymbol}${d.income.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Categories in Week */}
              {weeklyData.topCategories.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                    Top Spending Categories in the Past 7 Days
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {weeklyData.topCategories.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1"
                      >
                        <span className="text-xs font-semibold text-slate-700 block truncate">
                          {c.name}
                        </span>
                        <span className="font-bold font-mono text-sm text-slate-900 block">
                          {currencySymbol}
                          {c.amount.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{c.count} transactions</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. ONE MONTH REPORT                                       */}
          {/* ========================================================= */}
          {activeTab === '1-month' && monthlyData && (
            <div className="space-y-6">
              {/* Month Selector Bar with PDF Download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Monthly Report:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-xs font-bold bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-xs font-medium text-slate-600 hidden md:block">
                    Prior Month: {currencySymbol}
                    {monthlyData.previousMonthExpenses.toFixed(2)} (
                    <span
                      className={
                        monthlyData.monthOverMonthChange <= 0
                          ? 'text-emerald-600 font-bold'
                          : 'text-rose-600 font-bold'
                      }
                    >
                      {monthlyData.monthOverMonthChange > 0 ? '+' : ''}
                      {monthlyData.monthOverMonthChange}% MoM
                    </span>
                    )
                  </div>

                  {/* PDF Download Button */}
                  <button
                    type="button"
                    onClick={handleDownloadMonthlyPdf}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all hover:scale-102 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}</span>
                  </button>
                </div>
              </div>

              {pdfSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Monthly statement PDF has been generated and downloaded to your device successfully!
                  </span>
                </div>
              )}

              {/* Month Key Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Month Total Expenses
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {currencySymbol}
                    {monthlyData.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Proper {monthlyData.properPercentage}% • Waste {monthlyData.wastePercentage}%
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Month Total Income
                  </span>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    +{currencySymbol}
                    {monthlyData.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block font-semibold">
                    Net Flow: {currencySymbol}
                    {monthlyData.netSavings.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>Waste Spend</span>
                  </span>
                  <div className="text-2xl font-black text-rose-700 font-mono">
                    {currencySymbol}
                    {monthlyData.totalWaste.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                    {monthlyData.wastePercentage}% of all purchases
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Potential Savings</span>
                  </span>
                  <div className="text-2xl font-black text-teal-700 font-mono">
                    {currencySymbol}
                    {monthlyData.potentialSavings.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[11px] text-teal-600 mt-1 block">
                    Hypothetical savings if waste is cut
                  </span>
                </div>
              </div>

              {/* 30-Day Daily Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-3">
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Daily Spending Across {monthlyData.month}
                </h3>
                <p className="text-xs text-slate-500">
                  Visual daily timeline tracking essential vs impulse spend
                </p>

                {(() => {
                  const maxVal = Math.max(...monthlyData.daily.map((d) => d.expense), 50);
                  return (
                    <div className="pt-4 pb-2">
                      <div className="flex items-end gap-1 sm:gap-1.5 h-40 border-b border-slate-200 px-1 overflow-x-auto">
                        {monthlyData.daily.map((d) => {
                          const heightPct = (d.expense / maxVal) * 100;
                          const isWaste = d.waste > 0;
                          return (
                            <div
                              key={d.day}
                              className="flex-1 min-w-[14px] flex flex-col items-center h-full justify-end group"
                            >
                              <div
                                className={`w-full rounded-t-sm transition-all ${
                                  isWaste ? 'bg-rose-500' : 'bg-emerald-500'
                                } group-hover:brightness-90`}
                                style={{ height: `${Math.max(4, heightPct)}%` }}
                                title={`Day ${d.day}: ${currencySymbol}${d.expense.toFixed(2)}`}
                              />
                              <span className="text-[9px] text-slate-400 mt-1 block">{d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Category Breakdown in Month */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
                <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                  Monthly Expense Breakdown by Category
                </h4>
                <div className="space-y-3">
                  {monthlyData.categories.map((c, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({c.count} items)
                          </span>
                        </span>
                        <span className="font-bold font-mono text-slate-900">
                          {currencySymbol}
                          {c.amount.toFixed(2)}{' '}
                          <span className="text-slate-400 font-normal text-[11px]">
                            ({c.percentage}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. CONSECUTIVE WEEKS REPORT                               */}
          {/* ========================================================= */}
          {activeTab === 'consecutive-weeks' && consecutiveData && (
            <div className="space-y-6">
              {/* Controls & Trend Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Consecutive Weeks Window:</span>
                  <div className="flex gap-1">
                    {[4, 6, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setConsecutiveWeeksCount(num)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          consecutiveWeeksCount === num
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {num} Weeks
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Overall Spending Velocity:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full uppercase text-[10px] ${
                      consecutiveData.overallTrend === 'decreasing'
                        ? 'bg-emerald-100 text-emerald-800'
                        : consecutiveData.overallTrend === 'increasing'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {consecutiveData.overallTrend === 'decreasing' && '📉 Decreasing (Saving More)'}
                    {consecutiveData.overallTrend === 'increasing' && '📈 Increasing (Watch Out)'}
                    {consecutiveData.overallTrend === 'stable' && '➡️ Stable'}
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Average Weekly Spend
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {currencySymbol}
                    {consecutiveData.averageWeeklyExpense.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Calculated over {consecutiveData.weeksCount} consecutive weeks
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block mb-1">
                    Average Weekly Waste
                  </span>
                  <div className="text-2xl font-black text-rose-700 font-mono">
                    {currencySymbol}
                    {consecutiveData.averageWeeklyWaste.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[11px] text-rose-600 mt-1 block">
                    Avoidable impulse purchases per week
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Most Frugal Week
                  </span>
                  <div className="text-xl font-black text-emerald-700 font-mono">
                    {consecutiveData.bestWeek ? consecutiveData.bestWeek.weekLabel : 'None yet'}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block">
                    {consecutiveData.bestWeek
                      ? `Lowest waste: ${currencySymbol}${consecutiveData.bestWeek.wasteSpend.toFixed(2)}`
                      : 'Record more transactions'}
                  </span>
                </div>
              </div>

              {/* Consecutive Weeks Multi-Bar Comparison Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                      Consecutive Weeks Trend Analysis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tracking week-by-week total spend, proper spend (green), and waste spend (red)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" /> Proper Spend
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs" /> Waste Spend
                    </span>
                  </div>
                </div>

                {(() => {
                  const maxWeekVal = Math.max(
                    ...consecutiveData.weeks.map((w) => w.totalExpenses),
                    100
                  );
                  return (
                    <div className="pt-4 pb-2">
                      <div className="flex items-end gap-3 sm:gap-6 h-52 border-b border-slate-200 px-4 overflow-x-auto justify-around">
                        {consecutiveData.weeks.map((w, i) => {
                          const totalHeightPct = (w.totalExpenses / maxWeekVal) * 100;
                          const properPct =
                            w.totalExpenses > 0 ? (w.totalProper / w.totalExpenses) * 100 : 0;
                          const wastePct =
                            w.totalExpenses > 0 ? (w.totalWaste / w.totalExpenses) * 100 : 0;

                          return (
                            <div
                              key={i}
                              className="flex-1 max-w-[80px] min-w-[50px] flex flex-col items-center h-full justify-end group"
                            >
                              <div className="text-[10px] font-mono font-bold text-slate-600 mb-1 group-hover:text-emerald-700">
                                {currencySymbol}
                                {w.totalExpenses.toFixed(0)}
                              </div>
                              <div
                                className="w-full bg-slate-100 rounded-t-xl overflow-hidden flex flex-col justify-end transition-all group-hover:shadow-md"
                                style={{ height: `${Math.max(10, totalHeightPct)}%` }}
                              >
                                {wastePct > 0 && (
                                  <div
                                    className="bg-rose-500 w-full"
                                    style={{ height: `${wastePct}%` }}
                                    title={`Waste: ${currencySymbol}${w.totalWaste.toFixed(2)}`}
                                  />
                                )}
                                {properPct > 0 && (
                                  <div
                                    className="bg-emerald-500 w-full"
                                    style={{ height: `${properPct}%` }}
                                    title={`Proper: ${currencySymbol}${w.totalProper.toFixed(2)}`}
                                  />
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-slate-800 mt-2 block text-center truncate w-full">
                                W{w.weekNumber}
                              </span>
                              <span className="text-[9px] text-slate-400 block text-center truncate w-full">
                                {w.weekLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Consecutive Weeks Detail Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5">Week</th>
                        <th className="py-2.5">Date Range</th>
                        <th className="py-2.5">Total Expenses</th>
                        <th className="py-2.5">Proper Spend</th>
                        <th className="py-2.5">Waste Spend</th>
                        <th className="py-2.5">WoW Change</th>
                        <th className="py-2.5">Waste Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consecutiveData.weeks.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 font-bold text-slate-800">Week {w.weekNumber}</td>
                          <td className="py-2.5 text-slate-600">{w.weekLabel}</td>
                          <td className="py-2.5 font-mono font-bold text-slate-900">
                            {currencySymbol}
                            {w.totalExpenses.toFixed(2)}
                          </td>
                          <td className="py-2.5 font-mono text-emerald-600">
                            {currencySymbol}
                            {w.totalProper.toFixed(2)} ({w.properPercentage}%)
                          </td>
                          <td className="py-2.5 font-mono text-rose-600">
                            {currencySymbol}
                            {w.totalWaste.toFixed(2)} ({w.wastePercentage}%)
                          </td>
                          <td className="py-2.5 font-mono">
                            {idx === 0 ? (
                              <span className="text-slate-400">Baseline</span>
                            ) : (
                              <span
                                className={`font-semibold flex items-center gap-0.5 ${
                                  w.weekOverWeekChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {w.weekOverWeekChange > 0 ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {w.weekOverWeekChange > 0 ? '+' : ''}
                                {w.weekOverWeekChange}%
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 font-mono">
                            {idx === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span
                                className={`font-semibold ${
                                  w.wasteChange <= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {w.wasteChange > 0 ? '+' : ''}
                                {w.wasteChange}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. ONE YEAR REPORT                                        */}
          {/* ========================================================= */}
          {activeTab === '1-year' && yearlyData && (
            <div className="space-y-6">
              {/* Year Selector */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Annual Financial Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 text-slate-800 focus:outline-hidden"
                  >
                    {[2026, 2025, 2024].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Full 12-Month Annual Ledger
                </span>
              </div>

              {/* Annual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Annual Total Expenses
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {currencySymbol}
                    {yearlyData.annualExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Avg ~{currencySymbol}{yearlyData.monthlyAverageExpense.toFixed(2)} / month
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Annual Total Income
                  </span>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    +{currencySymbol}
                    {yearlyData.annualIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block font-semibold">
                    Net Saved: {currencySymbol}
                    {yearlyData.annualNetSavings.toFixed(2)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block mb-1 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>Annual Waste Spend</span>
                  </span>
                  <div className="text-2xl font-black text-rose-700 font-mono">
                    {currencySymbol}
                    {yearlyData.annualWaste.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-rose-600 mt-1 block font-semibold">
                    {yearlyData.wastePercentage}% of all annual spend
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block mb-1">
                    Peak Spending Month
                  </span>
                  <div className="text-xl font-black text-blue-900 font-mono">
                    {yearlyData.highestMonth
                      ? `${yearlyData.highestMonth.monthLabel} (${currencySymbol}${yearlyData.highestMonth.amount.toFixed(0)})`
                      : 'None'}
                  </div>
                  <span className="text-[11px] text-blue-600 mt-1 block">
                    Lowest:{' '}
                    {yearlyData.lowestMonth
                      ? `${yearlyData.lowestMonth.monthLabel} (${currencySymbol}${yearlyData.lowestMonth.amount.toFixed(0)})`
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* 12-Month Bar Chart */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                      Annual 12-Month Spending & Income Trend
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comparing expenses (proper in green, waste in red) with monthly income (blue marker)
                    </p>
                  </div>
                </div>

                {(() => {
                  const maxMonthVal = Math.max(
                    ...yearlyData.months.map((m) => Math.max(m.totalExpenses, m.totalIncome)),
                    1000
                  );
                  return (
                    <div className="pt-4 pb-2">
                      <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-56 border-b border-slate-200 px-1 overflow-x-auto">
                        {yearlyData.months.map((m, i) => {
                          const expHeight = (m.totalExpenses / maxMonthVal) * 100;
                          const properPct =
                            m.totalExpenses > 0 ? (m.properSpend / m.totalExpenses) * 100 : 0;
                          const wastePct =
                            m.totalExpenses > 0 ? (m.wasteSpend / m.totalExpenses) * 100 : 0;

                          return (
                            <div
                              key={i}
                              className="flex flex-col items-center h-full justify-end group min-w-[24px]"
                            >
                              <div className="text-[8px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {currencySymbol}
                                {(m.totalExpenses / 1000).toFixed(0)}k
                              </div>
                              <div
                                className="w-full bg-slate-100 rounded-t-sm overflow-hidden flex flex-col justify-end transition-all group-hover:brightness-95"
                                style={{ height: `${Math.max(6, expHeight)}%` }}
                              >
                                {wastePct > 0 && (
                                  <div
                                    className="bg-rose-500 w-full"
                                    style={{ height: `${wastePct}%` }}
                                    title={`Waste: ${currencySymbol}${m.wasteSpend.toFixed(2)}`}
                                  />
                                )}
                                {properPct > 0 && (
                                  <div
                                    className="bg-emerald-500 w-full"
                                    style={{ height: `${properPct}%` }}
                                    title={`Proper: ${currencySymbol}${m.properSpend.toFixed(2)}`}
                                  />
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-700 mt-2 block">
                                {m.monthLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 12-Month Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2">Month</th>
                        <th className="py-2">Expenses</th>
                        <th className="py-2">Proper Spend</th>
                        <th className="py-2">Waste Spend</th>
                        <th className="py-2">Income</th>
                        <th className="py-2">Net Savings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearlyData.months.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 font-bold text-slate-800">{m.monthLabel}</td>
                          <td className="py-2 font-mono font-bold text-slate-900">
                            {currencySymbol}
                            {m.totalExpenses.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-emerald-600">
                            {currencySymbol}
                            {m.properSpend.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-rose-600">
                            {currencySymbol}
                            {m.wasteSpend.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono text-emerald-700">
                            +{currencySymbol}
                            {m.totalIncome.toFixed(2)}
                          </td>
                          <td className="py-2 font-mono font-semibold">
                            <span className={m.netSavings >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {currencySymbol}
                              {m.netSavings.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Annual Categories */}
              {yearlyData.annualCategories.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
                  <h4 className="font-extrabold text-sm text-slate-900 mb-3">
                    Annual Spending by Category ({yearlyData.year})
                  </h4>
                  <div className="space-y-3">
                    {yearlyData.annualCategories.map((c, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.name}</span>
                          </span>
                          <span className="font-bold font-mono text-slate-900">
                            {currencySymbol}
                            {c.amount.toFixed(2)}{' '}
                            <span className="text-slate-400 font-normal text-[11px]">
                              ({c.percentage}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. SPENDING QUALITY (PROPER VS WASTE)                     */}
          {/* ========================================================= */}
          {activeTab === 'quality' && qualityData && (
            <div className="space-y-6">
              {/* Top Cards: Proper vs Waste vs Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-emerald-600" />
                      <span>Proper Spend</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      {qualityData.properPercentage}% of expenses
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {currencySymbol}
                    {qualityData.totalProper.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Essential groceries, bus/commute fare, study books, utilities, planned value purchases.
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, qualityData.properPercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-600" />
                      <span>Waste Spend</span>
                    </span>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                      {qualityData.wastePercentage}% of expenses
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {currencySymbol}
                    {qualityData.totalWaste.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Impulse orders, discarded takeout, forgotten subscriptions, buyer's remorse.
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, qualityData.wastePercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Unclassified</span>
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {qualityData.unclassifiedPercentage}%
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono">
                    {currencySymbol}
                    {qualityData.totalUnclassified.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Expenses awaiting your review. Classifying them sharpens your savings recommendations.
                  </p>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-slate-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, qualityData.unclassifiedPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Hypothetical Potential Savings Simulation */}
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
                        <span className="font-bold text-emerald-400 font-mono">
                          {targetCutPercentage}% cut
                        </span>
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
                        {(
                          Math.round(((qualityData.totalWaste * targetCutPercentage) / 100) * 100) /
                          100
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 italic">
                    *Presented as a hypothetical estimate calculated strictly from your recorded waste expenses ({currencySymbol}
                    {qualityData.totalWaste.toFixed(2)}). Not guaranteed returns.
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

                {qualityData.wasteByCategory.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-60" />
                    <p className="font-semibold text-slate-700">Zero waste recorded this month!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qualityData.wasteByCategory.map((cat, idx) => {
                      const pct =
                        qualityData.totalWaste > 0
                          ? Math.round((cat.amount / qualityData.totalWaste) * 100)
                          : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span>{cat.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({cat.count} purchases)
                              </span>
                            </span>
                            <span className="font-bold font-mono text-slate-900">
                              {currencySymbol}
                              {cat.amount.toFixed(2)}{' '}
                              <span className="text-slate-400 font-normal text-[11px]">
                                ({pct}%)
                              </span>
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
          )}
        </>
      )}
    </div>
  );
};
