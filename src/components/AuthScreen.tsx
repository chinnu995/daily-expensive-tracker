import React, { useState } from 'react';
import {
  Wallet,
  Landmark,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  X,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { User } from '../types/index.js';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [initialCash, setInitialCash] = useState('1000');
  const [initialBank, setInitialBank] = useState('15000');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Auth Dialog States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Primary Google Account for current user session
  const defaultGoogleAccount = {
    email: 'chinmayhegde2511@gmail.com',
    displayName: 'Chinmay Hegde',
    avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const cashVal = parseFloat(initialCash) || 0;
        const bankVal = parseFloat(initialBank) || 0;

        if (cashVal < 0 || bankVal < 0) {
          throw new Error('Opening balances must be nonnegative (₹0 or greater).');
        }

        const res = await api.register({
          email,
          password,
          displayName: displayName || email.split('@')[0],
          initialCash: cashVal,
          initialBank: bankVal,
          currencyCode,
        });
        onAuthSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (
    targetEmail: string,
    targetName: string,
    avatarUrl?: string
  ) => {
    setError(null);
    setLoading(true);
    setIsGoogleModalOpen(false);

    try {
      const res = await api.loginGoogle({
        email: targetEmail,
        displayName: targetName,
        avatarUrl,
        initialCash: parseFloat(initialCash) || 1000,
        initialBank: parseFloat(initialBank) || 15000,
        currencyCode,
      });
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.loginDemo();
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30 mb-4">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            SpendWise
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
              AI-Powered
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Smart Daily Expense Tracker • Dual Cash & Bank/UPI Balances • Spending Quality Insights
          </p>
        </div>

        {/* Auth Card */}
        <div className="mt-8 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-start gap-2">
              <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In vs Create Account Tabs */}
          <div className="flex border-b border-slate-700 pb-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                !isRegister ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 text-center py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                isRegister ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* PRIMARY: GOOGLE SIGN IN BUTTON */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsGoogleModalOpen(true)}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>{isRegister ? 'Sign up with Google' : 'Sign in with Google'}</span>
            </button>

            {/* Quick 1-click prompt for active Google user */}
            <button
              type="button"
              onClick={() =>
                handleGoogleSignIn(
                  defaultGoogleAccount.email,
                  defaultGoogleAccount.displayName,
                  defaultGoogleAccount.avatar
                )
              }
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                  C
                </div>
                <span className="truncate">Continue as {defaultGoogleAccount.displayName}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold group-hover:underline">
                1-Click Sign In →
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/80" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-slate-900 px-3 text-slate-400 font-medium tracking-wider">
                or with email address
              </span>
            </div>
          </div>

          {/* Standard Email / Password Form */}
          <form onSubmit={handleStandardSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Registration Opening Balance Setup Step */}
            {isRegister && (
              <div className="pt-2 border-t border-slate-700/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Initial Opening Balances Setup</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter your initial starting funds. These create your default <strong>Wallet (Cash)</strong> and{' '}
                  <strong>Bank / UPI</strong> accounts with nonnegative balances.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wallet (Cash)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={initialCash}
                        onChange={(e) => setInitialCash(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5 text-blue-400" />
                      <span>Bank / UPI</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={initialBank}
                        onChange={(e) => setInitialBank(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                  <select
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="INR">INR (₹) — Indian Rupee (Default)</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="EUR">EUR (€) — Euro</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Complete Onboarding & Start' : 'Sign In to SpendWise'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">Want to test right now with preloaded sample data?</p>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700/80 hover:border-emerald-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Explore Instant Demo (Aarav Sharma)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
          <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-200 block mb-0.5">Dual Balance</span>
            <span>Wallet Cash & Bank UPI tracked separately</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-200 block mb-0.5">AI Parser</span>
            <span>Type naturally, review drafts safely</span>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/40 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-200 block mb-0.5">Spend Quality</span>
            <span>Proper vs Waste spending analysis</span>
          </div>
        </div>
      </div>

      {/* GOOGLE ACCOUNT SELECTION MODAL */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Google Header */}
            <div className="p-6 pb-4 text-center border-b border-slate-100 relative">
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center justify-center mb-2">
                <GoogleIcon className="w-8 h-8" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Sign in with Google</h2>
              <p className="text-xs text-slate-500 mt-0.5">to continue to SpendWise</p>
            </div>

            {/* Account List */}
            <div className="p-5 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Choose an account
              </span>

              {/* Primary Detected Google Account */}
              <button
                type="button"
                onClick={() =>
                  handleGoogleSignIn(
                    defaultGoogleAccount.email,
                    defaultGoogleAccount.displayName,
                    defaultGoogleAccount.avatar
                  )
                }
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center gap-3 transition-all cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  C
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      {defaultGoogleAccount.displayName}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[11px] text-slate-500 truncate block font-mono">
                    {defaultGoogleAccount.email}
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </button>

              {/* Use Another Google Account Toggle */}
              {!showCustomGoogleInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogleInput(true)}
                  className="w-full p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex items-center gap-3 transition-all cursor-pointer text-left text-xs text-slate-600"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">Use another Google account</span>
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customGoogleEmail) {
                      handleGoogleSignIn(
                        customGoogleEmail,
                        customGoogleName || customGoogleEmail.split('@')[0]
                      );
                    }
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">Google Email / Name</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(false)}
                      className="text-[10px] text-slate-400 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="email"
                    required
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="google.user@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Full Name (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Continue with this Google Account
                  </button>
                </form>
              )}
            </div>

            {/* Google Security Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
              To continue, Google will share your name and email address with SpendWise. Review SpendWise&apos;s Privacy Policy and Terms of Service.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
