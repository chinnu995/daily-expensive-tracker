import React from 'react';
import {
  Wallet,
  Sparkles,
  LogOut,
  User as UserIcon,
  PlusCircle,
  ArrowRightLeft,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { User, FinancialOverview } from '../types/index.js';

interface NavbarProps {
  user: User | null;
  overview: FinancialOverview | null;
  onOpenAiAdd: () => void;
  onOpenQuickAdd: () => void;
  onOpenTransfer: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  overview,
  onOpenAiAdd,
  onOpenQuickAdd,
  onOpenTransfer,
  onOpenSettings,
  onLogout,
}) => {
  const symbol = overview?.currencySymbol || user?.currencySymbol || '₹';
  const totalBalance = overview?.totalAvailableBalance ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">SpendWise</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Daily Expense & Dual Balance Tracker</p>
          </div>
        </div>

        {/* Center: Prominent Total Balance Badge */}
        {user && overview && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 rounded-full transition-all">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-slate-600">Total Available:</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {symbol}{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Right side buttons */}
        {user ? (
          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            <button
              onClick={onOpenAiAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Add expense using AI Natural Language"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>AI Add</span>
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-600" />
              <span>+ Expense</span>
            </button>

            <button
              onClick={onOpenTransfer}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              title="Transfer between Wallet and Bank"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Transfer</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {/* Profile / Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Account Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <UserIcon className="w-4 h-4" />
            <span>Not logged in</span>
          </div>
        )}
      </div>
    </header>
  );
};
