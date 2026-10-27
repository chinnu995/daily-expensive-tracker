/**
 * SpendWise — AI-Powered Daily Expense Tracker
 * Frontend Root Application
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api.js';
import {
  User,
  AccountSummary,
  Category,
  Transaction,
  FinancialOverview,
} from './types/index.js';
import { Navbar } from './components/Navbar.js';
import { BottomNav, ActiveTab } from './components/BottomNav.js';
import { AuthScreen } from './components/AuthScreen.js';
import { DashboardView } from './components/DashboardView.js';
import { TransactionHistoryView } from './components/TransactionHistoryView.js';
import { AiAssistantView } from './components/AiAssistantView.js';
import { ReportsView } from './components/ReportsView.js';
import { BudgetView } from './components/BudgetView.js';
import { SettingsView } from './components/SettingsView.js';
import { AiExpenseModal } from './components/AiExpenseModal.js';
import { QuickAddExpenseModal } from './components/QuickAddExpenseModal.js';
import { AddIncomeModal } from './components/AddIncomeModal.js';
import { TransferModal } from './components/TransferModal.js';
import { AccountDetailsModal } from './components/AccountDetailsModal.js';
import { UpiGatewayModal } from './components/UpiGatewayModal.js';
import { UpiProvider } from './lib/upiService.js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Modal dialog states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] =
    useState<AccountSummary | null>(null);

  // UPI Linking & Payment Gateway modal states
  const [isUpiGatewayOpen, setIsUpiGatewayOpen] = useState(false);
  const [upiGatewayMode, setUpiGatewayMode] = useState<'gateway' | 'link'>('gateway');
  const [upiDefaultProvider, setUpiDefaultProvider] = useState<UpiProvider>('phonepe');

  const handleOpenUpiGateway = (
    mode: 'gateway' | 'link' = 'gateway',
    provider: UpiProvider = 'phonepe'
  ) => {
    setUpiGatewayMode(mode);
    setUpiDefaultProvider(provider);
    setIsUpiGatewayOpen(true);
  };

  // Load user data and balances
  const refreshFinancialData = useCallback(async () => {
    try {
      const [accRes, overRes, txRes, catRes] = await Promise.all([
        api.getAccounts(),
        api.getFinancialOverview(),
        api.getTransactions({ limit: 10 }),
        api.getCategories(),
      ]);

      setAccounts(accRes.accounts);
      setOverview(overRes.overview);
      setRecentTransactions(txRes.transactions);
      setCategories(catRes.categories);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    }
  }, []);

  // Check auth on startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
        await refreshFinancialData();
      } catch (err) {
        console.warn('Session expired or invalid, clearing token:', err);
        api.removeToken();
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [refreshFinancialData]);

  const handleAuthSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    await refreshFinancialData();
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
    setOverview(null);
    setAccounts([]);
    setRecentTransactions([]);
    setActiveTab('dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Initializing SpendWise...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const currencySymbol = overview?.currencySymbol || user.currencySymbol || '₹';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top sticky Navbar */}
      <Navbar
        user={user}
        overview={overview}
        onOpenAiAdd={() => {
          setAiInitialPrompt(undefined);
          setIsAiModalOpen(true);
        }}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenTransfer={() => setIsTransferModalOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onLogout={handleLogout}
      />

      {/* Desktop / Mobile Tab Navigation */}
      <BottomNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && overview && (
          <DashboardView
            user={user}
            overview={overview}
            recentTransactions={recentTransactions}
            categories={categories}
            accounts={accounts}
            onOpenAiAdd={(initialPrompt) => {
              setAiInitialPrompt(initialPrompt);
              setIsAiModalOpen(true);
            }}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenIncome={() => setIsIncomeModalOpen(true)}
            onOpenTransfer={() => setIsTransferModalOpen(true)}
            onSelectAccount={(acc) => setSelectedAccountForDetails(acc)}
            onViewAllTransactions={() => setActiveTab('transactions')}
            onViewSpendingQuality={() => setActiveTab('quality')}
            onOpenUpiGateway={handleOpenUpiGateway}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistoryView
            accounts={accounts}
            categories={categories}
            currencySymbol={currencySymbol}
            onRefresh={refreshFinancialData}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <AiAssistantView currencySymbol={currencySymbol} />
        )}

        {activeTab === 'budgets' && (
          <BudgetView categories={categories} currencySymbol={currencySymbol} />
        )}

        {activeTab === 'quality' && (
          <ReportsView
            currencySymbol={currencySymbol}
            userDisplayName={user.displayName}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            user={user}
            onUpdateUser={(updated) => {
              setUser(updated);
              refreshFinancialData();
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Interactive Modals */}

      {/* 1. AI Natural Language Expense Parser Modal */}
      <AiExpenseModal
        isOpen={isAiModalOpen}
        onClose={() => {
          setIsAiModalOpen(false);
          setAiInitialPrompt(undefined);
        }}
        accounts={accounts}
        categories={categories}
        currencySymbol={currencySymbol}
        onSuccess={refreshFinancialData}
      />

      {/* 2. Quick Add Expense Modal */}
      <QuickAddExpenseModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        accounts={accounts}
        categories={categories}
        currencySymbol={currencySymbol}
        allowOverdraft={user?.allowOverdraft || false}
        onSuccess={refreshFinancialData}
      />

      {/* 3. Add Income Modal */}
      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        accounts={accounts}
        categories={categories}
        currencySymbol={currencySymbol}
        onSuccess={refreshFinancialData}
      />

      {/* 4. Transfer Money Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        currencySymbol={currencySymbol}
        onSuccess={refreshFinancialData}
      />

      {/* 5. Account Details & Auditable Balance Correction Modal */}
      <AccountDetailsModal
        isOpen={selectedAccountForDetails !== null}
        onClose={() => setSelectedAccountForDetails(null)}
        accountSummary={selectedAccountForDetails}
        categories={categories}
        currencySymbol={currencySymbol}
        onOpenUpiGateway={handleOpenUpiGateway}
        onSuccess={() => {
          refreshFinancialData();
          setSelectedAccountForDetails(null);
        }}
      />

      {/* 6. UPI Account Linking & Direct PhonePe / Google Pay Gateway Modal */}
      <UpiGatewayModal
        isOpen={isUpiGatewayOpen}
        onClose={() => setIsUpiGatewayOpen(false)}
        currentUser={user}
        bankAccount={accounts.find((a) => a.account.accountType === 'bank') || null}
        currencySymbol={currencySymbol}
        initialMode={upiGatewayMode}
        defaultProvider={upiDefaultProvider}
        onSuccess={refreshFinancialData}
      />
    </div>
  );
}
