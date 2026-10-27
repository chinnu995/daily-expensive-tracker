/**
 * SpendWise REST API Endpoints
 */

import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from './db.js';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  requireAuth,
  AuthenticatedRequest,
} from './auth.js';
import {
  parseNaturalLanguageTransaction,
  generateAiSpendingAnswer,
  classifyExpenseDescription,
} from './ai.js';

export const apiRouter = Router();

// ==========================================
// Authentication & User Profile
// ==========================================

apiRouter.post('/auth/register', (req, res): void => {
  try {
    const { email, password, displayName, initialCash, initialBank, currencyCode, timezone } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = crypto.randomUUID();
    const currency = currencyCode || 'INR';
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

    const newUser = db.createUser({
      id: userId,
      email: email.trim().toLowerCase(),
      displayName: displayName?.trim() || email.split('@')[0],
      passwordHash: hashPassword(password),
      currencyCode: currency,
      currencySymbol: symbol,
      timezone: timezone || 'Asia/Kolkata',
      allowOverdraft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Idempotently create default accounts with user-provided opening balances
    const cashOpening = Math.max(0, Number(initialCash) || 0);
    const bankOpening = Math.max(0, Number(initialBank) || 0);
    const accounts = db.ensureDefaultAccounts(userId, cashOpening, bankOpening, currency);

    // Initial audit log
    db.addAuditLog({
      userId,
      action: 'USER_REGISTERED',
      entityType: 'profile',
      entityId: userId,
      reason: 'New account created with initial balances',
      newData: { email, cashOpening, bankOpening },
    });

    const token = createSessionToken(userId);
    const { passwordHash: _, ...safeUser } = newUser;

    res.status(201).json({
      token,
      user: safeUser,
      accounts,
      message: 'Registration successful!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

apiRouter.post('/auth/login', (req, res): void => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Ensure default accounts exist
    const accounts = db.ensureDefaultAccounts(user.id, 0, 0, user.currencyCode);
    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      accounts,
      message: 'Logged in successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Google Authentication & Sign In Endpoint
apiRouter.post('/auth/google', (req, res): void => {
  try {
    const { email, displayName, googleId, avatarUrl, initialCash, initialBank, currencyCode } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Google email is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(cleanEmail);

    if (!user) {
      // New user registering with Google Auth
      const userId = crypto.randomUUID();
      const currency = currencyCode || 'INR';
      const symbol =
        currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹';

      const cashOpening = Math.max(0, Number(initialCash) || 1000);
      const bankOpening = Math.max(0, Number(initialBank) || 15000);

      user = db.createUser({
        id: userId,
        email: cleanEmail,
        displayName: displayName?.trim() || cleanEmail.split('@')[0],
        passwordHash: hashPassword(`google_oauth_${googleId || crypto.randomUUID()}`),
        currencyCode: currency,
        currencySymbol: symbol,
        timezone: 'Asia/Kolkata',
        allowOverdraft: false,
        avatarUrl: avatarUrl || undefined,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Idempotently create default accounts with initial balances
      db.ensureDefaultAccounts(userId, cashOpening, bankOpening, currency);

      db.addAuditLog({
        userId,
        action: 'USER_REGISTERED_GOOGLE',
        entityType: 'profile',
        entityId: userId,
        reason: 'New account registered via Google Authentication',
        newData: { email: cleanEmail, cashOpening, bankOpening },
      });
    }

    // Ensure default accounts exist
    const accounts = db.ensureDefaultAccounts(user.id, 1000, 15000, user.currencyCode);
    const token = createSessionToken(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      accounts,
      message: 'Signed in with Google successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Google authentication failed' });
  }
});

// Demo / Quick Sign-in for immediate evaluator convenience
apiRouter.post('/auth/demo', (req, res): void => {
  try {
    const demoEmail = 'demo@spendwise.app';
    let user = db.getUserByEmail(demoEmail);

    if (!user) {
      const userId = crypto.randomUUID();
      user = db.createUser({
        id: userId,
        email: demoEmail,
        displayName: 'Aarav Sharma',
        passwordHash: hashPassword('spendwise123'),
        currencyCode: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        allowOverdraft: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Default opening balances: ₹1,500 Cash, ₹25,000 Bank
      const accounts = db.ensureDefaultAccounts(userId, 1500, 25000, 'INR');
      const cashAcc = accounts.find((a) => a.accountType === 'cash')!;
      const bankAcc = accounts.find((a) => a.accountType === 'bank')!;
      const categories = db.getCategories(userId);

      // Seed a few realistic recent transactions
      const now = new Date();
      const catFood = categories.find((c) => c.name.includes('Food'))?.id;
      const catStationery = categories.find((c) => c.name.includes('Stationery'))?.id;
      const catTransport = categories.find((c) => c.name.includes('Transport'))?.id;
      const catGroceries = categories.find((c) => c.name.includes('Groceries'))?.id;

      // 1. ₹5 pen using cash (Proper spend)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 5,
        accountId: cashAcc.id,
        categoryId: catStationery,
        description: 'Pen for college notes',
        spendClassification: 'proper_spend',
        occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      });

      // 2. ₹40 bus fare through UPI (Proper spend)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 40,
        accountId: bankAcc.id,
        categoryId: catTransport,
        description: 'Bus fare to office',
        spendClassification: 'proper_spend',
        occurredAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      });

      // 3. ₹350 impulse snack ordering (Waste spend)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 350,
        accountId: bankAcc.id,
        categoryId: catFood,
        description: 'Late night midnight snacks delivery (uneaten)',
        spendClassification: 'waste_spend',
        occurredAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      });

      // 4. ₹650 essential vegetables & fruits (Proper spend)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 650,
        accountId: cashAcc.id,
        categoryId: catGroceries,
        description: 'Weekly market vegetables & fruits',
        spendClassification: 'proper_spend',
        occurredAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      });

      // 5. Transfer ₹2,000 from Bank to Wallet (ATM Withdrawal)
      db.createTransfer(userId, {
        fromAccountId: bankAcc.id,
        toAccountId: cashAcc.id,
        amount: 2000,
        description: 'ATM Cash Withdrawal',
        occurredAt: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
      });

      // Set a monthly budget of ₹25,000
      const currentMonth = now.toISOString().slice(0, 7);
      db.setBudget(userId, {
        categoryId: null,
        amount: 25000,
        periodMonth: currentMonth,
        alertThreshold: 80,
      });

      // Additional categories
      const catBills = categories.find((c) => c.name.includes('Bills'))?.id;
      const catSalary = categories.find((c) => c.name.includes('Salary'))?.id;
      const catSubscriptions = categories.find((c) => c.name.includes('Subscription'))?.id;
      const catShopping = categories.find((c) => c.name.includes('Shopping'))?.id;
      const catHealth = categories.find((c) => c.name.includes('Health'))?.id;

      // Seed multi-week transactions (consecutive weeks 1 to 6)
      const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

      // Consecutive Week 1 (7-13 days ago)
      db.createTransaction(userId, {
        transactionType: 'income',
        amount: 45000,
        accountId: bankAcc.id,
        categoryId: catSalary,
        description: 'Monthly Tech Salary Credit',
        spendClassification: 'unclassified',
        occurredAt: daysAgo(10),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 1450,
        accountId: cashAcc.id,
        categoryId: catGroceries,
        description: 'Supermarket Provisions & Milk',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(8),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 499,
        accountId: bankAcc.id,
        categoryId: catSubscriptions,
        description: 'Unused Gym App Subscription (Auto-renewed)',
        spendClassification: 'waste_spend',
        occurredAt: daysAgo(9),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 550,
        accountId: bankAcc.id,
        categoryId: catTransport,
        description: 'Metro Card Monthly Recharge',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(11),
      });

      // Consecutive Week 2 (14-20 days ago)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 2200,
        accountId: bankAcc.id,
        categoryId: catBills,
        description: 'Electricity & Broadband Bill',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(15),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 1100,
        accountId: cashAcc.id,
        categoryId: catGroceries,
        description: 'Organic vegetables & cooking oil',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(17),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 890,
        accountId: bankAcc.id,
        categoryId: catShopping,
        description: 'Flash sale impulse headphones (unneeded)',
        spendClassification: 'waste_spend',
        occurredAt: daysAgo(18),
      });

      // Consecutive Week 3 (21-27 days ago)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 1350,
        accountId: bankAcc.id,
        categoryId: catFood,
        description: 'Weekend Family Dinner at Haldirams',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(22),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 450,
        accountId: cashAcc.id,
        categoryId: catHealth,
        description: 'Prescription Allergy Medicine',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(24),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 620,
        accountId: bankAcc.id,
        categoryId: catFood,
        description: 'Excessive food ordering discarded uneaten',
        spendClassification: 'waste_spend',
        occurredAt: daysAgo(25),
      });

      // Consecutive Week 4 (28-34 days ago)
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 1750,
        accountId: cashAcc.id,
        categoryId: catGroceries,
        description: 'Monthly pantry staples & rice',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(29),
      });
      db.createTransaction(userId, {
        transactionType: 'expense',
        amount: 320,
        accountId: bankAcc.id,
        categoryId: catTransport,
        description: 'Auto fare to client meeting',
        spendClassification: 'proper_spend',
        occurredAt: daysAgo(31),
      });

      // Historical Seed for 1-Year Report (prior 2 to 9 months)
      const currentYear = now.getFullYear();
      for (let m = 1; m <= 9; m++) {
        const pastDate = new Date(currentYear, now.getMonth() - m, 5);
        if (pastDate.getFullYear() === currentYear) {
          const mIso = (day: number) =>
            new Date(currentYear, now.getMonth() - m, day, 12, 0, 0).toISOString();

          // Monthly Salary
          db.createTransaction(userId, {
            transactionType: 'income',
            amount: 45000,
            accountId: bankAcc.id,
            categoryId: catSalary,
            description: `Salary Credit (${pastDate.toLocaleString('default', { month: 'short' })})`,
            spendClassification: 'unclassified',
            occurredAt: mIso(1),
          });

          // Proper Spend: Groceries & Rent
          db.createTransaction(userId, {
            transactionType: 'expense',
            amount: 7500 + (m % 3) * 500,
            accountId: bankAcc.id,
            categoryId: catGroceries,
            description: `Groceries & Essentials (${pastDate.toLocaleString('default', { month: 'short' })})`,
            spendClassification: 'proper_spend',
            occurredAt: mIso(10),
          });

          // Proper Spend: Utilities
          db.createTransaction(userId, {
            transactionType: 'expense',
            amount: 2100 + (m % 4) * 200,
            accountId: bankAcc.id,
            categoryId: catBills,
            description: `Utility & Internet Bills`,
            spendClassification: 'proper_spend',
            occurredAt: mIso(18),
          });

          // Waste Spend: Impulse purchase
          db.createTransaction(userId, {
            transactionType: 'expense',
            amount: 1200 + (m % 3) * 400,
            accountId: bankAcc.id,
            categoryId: catShopping,
            description: `Impulse shopping item`,
            spendClassification: 'waste_spend',
            occurredAt: mIso(24),
          });
        }
      }
    } else {
      // If demo user exists but has fewer than 15 transactions, seed multi-week and historical transactions
      const existingTx = db.getTransactions(user.id, { limit: 100 });
      if (existingTx.total < 15) {
        const accounts = db.getUserAccounts(user.id);
        const cashAcc = accounts.find((a) => a.accountType === 'cash')!;
        const bankAcc = accounts.find((a) => a.accountType === 'bank')!;
        const categories = db.getCategories(user.id);
        const now = new Date();
        const currentYear = now.getFullYear();

        const catFood = categories.find((c) => c.name.includes('Food'))?.id;
        const catTransport = categories.find((c) => c.name.includes('Transport'))?.id;
        const catGroceries = categories.find((c) => c.name.includes('Groceries'))?.id;
        const catBills = categories.find((c) => c.name.includes('Bills'))?.id;
        const catSalary = categories.find((c) => c.name.includes('Salary'))?.id;
        const catSubscriptions = categories.find((c) => c.name.includes('Subscription'))?.id;
        const catShopping = categories.find((c) => c.name.includes('Shopping'))?.id;

        const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

        db.createTransaction(user.id, {
          transactionType: 'income',
          amount: 55000,
          accountId: bankAcc.id,
          categoryId: catSalary,
          description: 'Monthly Salary Deposit',
          spendClassification: 'unclassified',
          occurredAt: daysAgo(10),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 1450,
          accountId: cashAcc.id,
          categoryId: catGroceries,
          description: 'Weekly Provisions & Essentials',
          spendClassification: 'proper_spend',
          occurredAt: daysAgo(8),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 499,
          accountId: bankAcc.id,
          categoryId: catSubscriptions,
          description: 'Unused Gym App Subscription',
          spendClassification: 'waste_spend',
          occurredAt: daysAgo(9),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 2200,
          accountId: bankAcc.id,
          categoryId: catBills,
          description: 'Electricity & Broadband Bill',
          spendClassification: 'proper_spend',
          occurredAt: daysAgo(15),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 890,
          accountId: bankAcc.id,
          categoryId: catShopping,
          description: 'Flash sale impulse headphones',
          spendClassification: 'waste_spend',
          occurredAt: daysAgo(18),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 1350,
          accountId: bankAcc.id,
          categoryId: catFood,
          description: 'Weekend Family Dinner',
          spendClassification: 'proper_spend',
          occurredAt: daysAgo(22),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 620,
          accountId: bankAcc.id,
          categoryId: catFood,
          description: 'Late night takeout discarded',
          spendClassification: 'waste_spend',
          occurredAt: daysAgo(25),
        });
        db.createTransaction(user.id, {
          transactionType: 'expense',
          amount: 1750,
          accountId: cashAcc.id,
          categoryId: catGroceries,
          description: 'Monthly pantry staples & rice',
          spendClassification: 'proper_spend',
          occurredAt: daysAgo(29),
        });

        for (let m = 1; m <= 6; m++) {
          const pastDate = new Date(currentYear, now.getMonth() - m, 5);
          if (pastDate.getFullYear() === currentYear) {
            const mIso = (day: number) =>
              new Date(currentYear, now.getMonth() - m, day, 12, 0, 0).toISOString();

            db.createTransaction(user.id, {
              transactionType: 'income',
              amount: 55000,
              accountId: bankAcc.id,
              categoryId: catSalary,
              description: `Salary (${pastDate.toLocaleString('default', { month: 'short' })})`,
              spendClassification: 'unclassified',
              occurredAt: mIso(1),
            });
            db.createTransaction(user.id, {
              transactionType: 'expense',
              amount: 7500 + (m % 3) * 500,
              accountId: bankAcc.id,
              categoryId: catGroceries,
              description: `Groceries (${pastDate.toLocaleString('default', { month: 'short' })})`,
              spendClassification: 'proper_spend',
              occurredAt: mIso(10),
            });
            db.createTransaction(user.id, {
              transactionType: 'expense',
              amount: 2100 + (m % 4) * 200,
              accountId: bankAcc.id,
              categoryId: catBills,
              description: `Utilities & Wi-Fi`,
              spendClassification: 'proper_spend',
              occurredAt: mIso(18),
            });
            db.createTransaction(user.id, {
              transactionType: 'expense',
              amount: 1200 + (m % 3) * 400,
              accountId: bankAcc.id,
              categoryId: catShopping,
              description: `Impulse shopping`,
              spendClassification: 'waste_spend',
              occurredAt: mIso(24),
            });
          }
        }
      }
    }

    const token = createSessionToken(user.id);
    const accounts = db.ensureDefaultAccounts(user.id);
    const { passwordHash: _, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      accounts,
      message: 'Logged in as Demo User.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo login failed' });
  }
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const accounts = db.getUserAccounts(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, accounts });
});

apiRouter.patch('/auth/profile', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const { displayName, currencyCode, currencySymbol, timezone, allowOverdraft } = req.body;

    const updates: any = {};
    if (displayName) updates.displayName = displayName.trim();
    if (currencyCode) {
      updates.currencyCode = currencyCode;
      updates.currencySymbol =
        currencySymbol || (currencyCode === 'INR' ? '₹' : currencyCode === 'USD' ? '$' : '€');
    }
    if (timezone) updates.timezone = timezone;
    if (typeof allowOverdraft === 'boolean') updates.allowOverdraft = allowOverdraft;

    const updated = db.updateUser(user.id, updates);
    const { passwordHash: _, ...safeUser } = updated;
    res.json({ user: safeUser, message: 'Profile updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/auth/delete-account', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    db.deleteUser(user.id);
    res.json({ message: 'Account and all associated records deleted permanently.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Accounts & Balances
// ==========================================

apiRouter.get('/accounts', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const accounts = db.getUserAccounts(user.id);
  const summaries = accounts.map((acc) => db.getAccountBalanceSummary(user.id, acc.id));
  res.json({ accounts: summaries });
});

apiRouter.get('/accounts/overview', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const overview = db.getFinancialOverview(user.id);
  res.json({ overview });
});

apiRouter.patch('/accounts/:id/opening-balance', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const accountId = req.params.id;
    const { newBalance, reason } = req.body;

    if (newBalance === undefined || isNaN(Number(newBalance))) {
      res.status(400).json({ error: 'New balance must be a valid number.' });
      return;
    }

    const updated = db.updateOpeningBalance(user.id, accountId, Number(newBalance), reason || 'Manual opening balance correction');
    const summary = db.getAccountBalanceSummary(user.id, accountId);

    res.json({
      account: summary,
      message: 'Opening balance corrected and recorded in audit log.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Categories
// ==========================================

apiRouter.get('/categories', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const categories = db.getCategories(user.id);
  res.json({ categories });
});

apiRouter.post('/categories', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const { name, type, icon, color } = req.body;
    if (!name || !type) {
      res.status(400).json({ error: 'Category name and type are required.' });
      return;
    }
    const created = db.createCustomCategory(user.id, { name, type, icon, color });
    res.status(201).json({ category: created });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Transactions
// ==========================================

apiRouter.get('/transactions', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const { accountId, transactionType, spendClassification, categoryId, search, startDate, endDate, limit, offset } =
    req.query;

  const result = db.getTransactions(user.id, {
    accountId: accountId as string,
    transactionType: transactionType as string,
    spendClassification: spendClassification as string,
    categoryId: categoryId as string,
    search: search as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });

  res.json(result);
});

apiRouter.get('/transactions/:id', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const tx = db.getTransactionById(user.id, req.params.id);
  if (!tx) {
    res.status(404).json({ error: 'Transaction not found.' });
    return;
  }
  res.json({ transaction: tx });
});

apiRouter.post('/transactions', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const {
      transactionType,
      amount,
      accountId,
      categoryId,
      description,
      note,
      tags,
      spendClassification,
      occurredAt,
      idempotencyKey,
    } = req.body;

    if (!transactionType || !amount || !accountId) {
      res.status(400).json({ error: 'Missing required transaction fields: type, amount, accountId' });
      return;
    }

    const tx = db.createTransaction(user.id, {
      transactionType,
      amount: Number(amount),
      accountId,
      categoryId,
      description: description || 'Transaction',
      note,
      tags,
      spendClassification,
      occurredAt,
      idempotencyKey,
    });

    const overview = db.getFinancialOverview(user.id);

    res.status(201).json({
      transaction: tx,
      overview,
      message: 'Transaction saved successfully.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/transactions/:id', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const updated = db.updateTransaction(user.id, req.params.id, req.body);
    const overview = db.getFinancialOverview(user.id);
    res.json({ transaction: updated, overview, message: 'Transaction updated.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/transactions/:id', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    db.deleteTransaction(user.id, req.params.id);
    const overview = db.getFinancialOverview(user.id);
    res.json({ message: 'Transaction deleted.', overview });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Transfers (Atomic Wallet <-> Bank)
// ==========================================

apiRouter.post('/transfers', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const { fromAccountId, toAccountId, amount, description, note, occurredAt, idempotencyKey } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      res.status(400).json({ error: 'Source account, destination account, and amount are required.' });
      return;
    }

    const tx = db.createTransfer(user.id, {
      fromAccountId,
      toAccountId,
      amount: Number(amount),
      description,
      note,
      occurredAt,
      idempotencyKey,
    });

    const overview = db.getFinancialOverview(user.id);
    res.status(201).json({
      transfer: tx,
      overview,
      message: 'Transfer completed successfully. Balances updated.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Budgets
// ==========================================

apiRouter.get('/budgets', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const budgets = db.getBudgets(user.id, month);

  // Calculate actual spending for each budget
  const userTx = db.getTransactions(user.id, {
    startDate: `${month}-01T00:00:00.000Z`,
    endDate: `${month}-31T23:59:59.999Z`,
    transactionType: 'expense',
    limit: 1000,
  }).transactions;

  const enriched = budgets.map((b) => {
    let spent = 0;
    if (b.categoryId === null) {
      // Overall budget: all expenses
      spent = userTx.reduce((acc, t) => acc + t.amount, 0);
    } else {
      spent = userTx.filter((t) => t.categoryId === b.categoryId).reduce((acc, t) => acc + t.amount, 0);
    }
    const spentRounded = Math.round(spent * 100) / 100;
    const remaining = Math.round((b.amount - spentRounded) * 100) / 100;
    const percentUsed = b.amount > 0 ? Math.round((spentRounded / b.amount) * 1000) / 10 : 0;

    return {
      ...b,
      spent: spentRounded,
      remaining,
      percentUsed,
      isNearLimit: percentUsed >= b.alertThreshold && percentUsed < 100,
      isExceeded: percentUsed >= 100,
    };
  });

  res.json({ budgets: enriched, month });
});

apiRouter.post('/budgets', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    const { categoryId, amount, periodMonth, alertThreshold } = req.body;

    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ error: 'Budget amount must be greater than zero.' });
      return;
    }

    const month = periodMonth || new Date().toISOString().slice(0, 7);
    const budget = db.setBudget(user.id, {
      categoryId: categoryId || null,
      amount: Number(amount),
      periodMonth: month,
      alertThreshold: alertThreshold ? Number(alertThreshold) : 80,
    });

    res.status(201).json({ budget, message: 'Budget set successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.delete('/budgets/:id', requireAuth, (req: AuthenticatedRequest, res): void => {
  try {
    const user = req.user!;
    db.deleteBudget(user.id, req.params.id);
    res.json({ message: 'Budget deleted.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Reports & Spending Quality Analytics
// ==========================================

apiRouter.get('/reports/spending-quality', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const categories = db.getCategories(user.id);

  const txList = db.getTransactions(user.id, {
    startDate: `${month}-01T00:00:00.000Z`,
    endDate: `${month}-31T23:59:59.999Z`,
    transactionType: 'expense',
    limit: 1000,
  }).transactions;

  let totalProper = 0;
  let totalWaste = 0;
  let totalUnclassified = 0;
  const wasteByCategory: Record<string, { name: string; amount: number; count: number; color: string }> = {};
  const properByCategory: Record<string, { name: string; amount: number; count: number; color: string }> = {};

  for (const t of txList) {
    const cat = categories.find((c) => c.id === t.categoryId) || {
      name: 'Uncategorized',
      color: '#94a3b8',
    };

    if (t.spendClassification === 'proper_spend') {
      totalProper += t.amount;
      if (!properByCategory[cat.name]) {
        properByCategory[cat.name] = { name: cat.name, amount: 0, count: 0, color: cat.color };
      }
      properByCategory[cat.name].amount += t.amount;
      properByCategory[cat.name].count += 1;
    } else if (t.spendClassification === 'waste_spend') {
      totalWaste += t.amount;
      if (!wasteByCategory[cat.name]) {
        wasteByCategory[cat.name] = { name: cat.name, amount: 0, count: 0, color: cat.color };
      }
      wasteByCategory[cat.name].amount += t.amount;
      wasteByCategory[cat.name].count += 1;
    } else {
      totalUnclassified += t.amount;
    }
  }

  const totalExpenses = totalProper + totalWaste + totalUnclassified;
  const properPercentage = totalExpenses > 0 ? Math.round((totalProper / totalExpenses) * 1000) / 10 : 0;
  const wastePercentage = totalExpenses > 0 ? Math.round((totalWaste / totalExpenses) * 1000) / 10 : 0;
  const unclassifiedPercentage = totalExpenses > 0 ? Math.round((totalUnclassified / totalExpenses) * 1000) / 10 : 0;

  // Potential savings estimate: eliminating recorded waste spending
  const potentialSavings = Math.round(totalWaste * 100) / 100;

  res.json({
    month,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalProper: Math.round(totalProper * 100) / 100,
    totalWaste: Math.round(totalWaste * 100) / 100,
    totalUnclassified: Math.round(totalUnclassified * 100) / 100,
    properPercentage,
    wastePercentage,
    unclassifiedPercentage,
    potentialSavings,
    wasteByCategory: Object.values(wasteByCategory).sort((a, b) => b.amount - a.amount),
    properByCategory: Object.values(properByCategory).sort((a, b) => b.amount - a.amount),
  });
});

apiRouter.get('/reports/daily', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  const txList = db.getTransactions(user.id, {
    startDate,
    limit: 1000,
  }).transactions;

  const dayMap: Record<string, { date: string; proper: number; waste: number; unclassified: number; income: number }> = {};

  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().slice(0, 10);
    dayMap[dayStr] = { date: dayStr, proper: 0, waste: 0, unclassified: 0, income: 0 };
  }

  for (const t of txList) {
    const dayStr = t.occurredAt.slice(0, 10);
    if (!dayMap[dayStr]) {
      dayMap[dayStr] = { date: dayStr, proper: 0, waste: 0, unclassified: 0, income: 0 };
    }
    if (t.transactionType === 'income') {
      dayMap[dayStr].income += t.amount;
    } else if (t.transactionType === 'expense') {
      if (t.spendClassification === 'proper_spend') {
        dayMap[dayStr].proper += t.amount;
      } else if (t.spendClassification === 'waste_spend') {
        dayMap[dayStr].waste += t.amount;
      } else {
        dayMap[dayStr].unclassified += t.amount;
      }
    }
  }

  res.json({ daily: Object.values(dayMap) });
});

apiRouter.get('/reports/categories', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const categories = db.getCategories(user.id);

  const txList = db.getTransactions(user.id, {
    startDate: `${month}-01T00:00:00.000Z`,
    endDate: `${month}-31T23:59:59.999Z`,
    transactionType: 'expense',
    limit: 1000,
  }).transactions;

  const catMap: Record<string, { categoryId: string; name: string; color: string; icon: string; amount: number; count: number }> = {};

  for (const t of txList) {
    const cat = categories.find((c) => c.id === t.categoryId) || {
      id: 'uncategorized',
      name: 'Other',
      color: '#94a3b8',
      icon: 'Tag',
    };

    if (!catMap[cat.name]) {
      catMap[cat.name] = {
        categoryId: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        amount: 0,
        count: 0,
      };
    }
    catMap[cat.name].amount += t.amount;
    catMap[cat.name].count += 1;
  }

  const breakdown = Object.values(catMap).sort((a, b) => b.amount - a.amount);
  res.json({ breakdown, month });
});

// 1. One Week Report Endpoint
apiRouter.get('/reports/1-week', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const anchorStr = (req.query.anchorDate as string) || new Date().toISOString();
  const anchorDate = new Date(anchorStr);
  const categories = db.getCategories(user.id);

  // 7 days ending at anchorDate
  const startDate = new Date(anchorDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(anchorDate);
  endDate.setHours(23, 59, 59, 999);

  // Previous 7 days for comparison
  const prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevEndDate = new Date(startDate.getTime() - 1);

  const txCurrent = db.getTransactions(user.id, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 1000,
  }).transactions;

  const txPrevious = db.getTransactions(user.id, {
    startDate: prevStartDate.toISOString(),
    endDate: prevEndDate.toISOString(),
    limit: 1000,
  }).transactions;

  let totalExpenses = 0;
  let totalIncome = 0;
  let totalProper = 0;
  let totalWaste = 0;
  let totalUnclassified = 0;
  const categoryTotals: Record<string, { name: string; amount: number; color: string; count: number }> = {};

  const dailySlots: Array<{
    date: string;
    dayLabel: string;
    totalExpense: number;
    proper: number;
    waste: number;
    unclassified: number;
    income: number;
  }> = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    dailySlots.push({
      date: dateStr,
      dayLabel: dayNames[d.getDay()],
      totalExpense: 0,
      proper: 0,
      waste: 0,
      unclassified: 0,
      income: 0,
    });
  }

  for (const t of txCurrent) {
    const tDate = t.occurredAt.slice(0, 10);
    const slot = dailySlots.find((s) => s.date === tDate);

    if (t.transactionType === 'expense') {
      totalExpenses += t.amount;
      if (slot) slot.totalExpense += t.amount;

      if (t.spendClassification === 'proper_spend') {
        totalProper += t.amount;
        if (slot) slot.proper += t.amount;
      } else if (t.spendClassification === 'waste_spend') {
        totalWaste += t.amount;
        if (slot) slot.waste += t.amount;
      } else {
        totalUnclassified += t.amount;
        if (slot) slot.unclassified += t.amount;
      }

      const cat = categories.find((c) => c.id === t.categoryId) || { name: 'Other', color: '#94a3b8' };
      if (!categoryTotals[cat.name]) {
        categoryTotals[cat.name] = { name: cat.name, amount: 0, color: cat.color, count: 0 };
      }
      categoryTotals[cat.name].amount += t.amount;
      categoryTotals[cat.name].count += 1;
    } else if (t.transactionType === 'income') {
      totalIncome += t.amount;
      if (slot) slot.income += t.amount;
    }
  }

  let previousWeekExpenses = 0;
  for (const t of txPrevious) {
    if (t.transactionType === 'expense') {
      previousWeekExpenses += t.amount;
    }
  }

  const weekOverWeekChange =
    previousWeekExpenses > 0
      ? Math.round(((totalExpenses - previousWeekExpenses) / previousWeekExpenses) * 1000) / 10
      : 0;

  const properPercentage = totalExpenses > 0 ? Math.round((totalProper / totalExpenses) * 1000) / 10 : 0;
  const wastePercentage = totalExpenses > 0 ? Math.round((totalWaste / totalExpenses) * 1000) / 10 : 0;

  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((c) => ({ ...c, amount: Math.round(c.amount * 100) / 100 }));

  res.json({
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalProper: Math.round(totalProper * 100) / 100,
    totalWaste: Math.round(totalWaste * 100) / 100,
    totalUnclassified: Math.round(totalUnclassified * 100) / 100,
    properPercentage,
    wastePercentage,
    previousWeekExpenses: Math.round(previousWeekExpenses * 100) / 100,
    weekOverWeekChange,
    daily: dailySlots.map((d) => ({
      ...d,
      totalExpense: Math.round(d.totalExpense * 100) / 100,
      proper: Math.round(d.proper * 100) / 100,
      waste: Math.round(d.waste * 100) / 100,
      unclassified: Math.round(d.unclassified * 100) / 100,
      income: Math.round(d.income * 100) / 100,
    })),
    topCategories,
  });
});

// 2. One Month Report Endpoint
apiRouter.get('/reports/1-month', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const categories = db.getCategories(user.id);

  const [yearStr, monthNumStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  // Previous month string
  const prevMonthDate = new Date(year, monthNum - 2, 1);
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);
  const prevDays = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();

  const txCurrent = db.getTransactions(user.id, {
    startDate: `${month}-01T00:00:00.000Z`,
    endDate: `${month}-${daysInMonth}T23:59:59.999Z`,
    limit: 2000,
  }).transactions;

  const txPrevious = db.getTransactions(user.id, {
    startDate: `${prevMonthStr}-01T00:00:00.000Z`,
    endDate: `${prevMonthStr}-${prevDays}T23:59:59.999Z`,
    limit: 2000,
  }).transactions;

  let totalExpenses = 0;
  let totalIncome = 0;
  let totalProper = 0;
  let totalWaste = 0;
  let totalUnclassified = 0;

  const dailyMap: Record<number, { date: string; day: number; expense: number; income: number; proper: number; waste: number }> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayPadded = String(d).padStart(2, '0');
    dailyMap[d] = {
      date: `${month}-${dayPadded}`,
      day: d,
      expense: 0,
      income: 0,
      proper: 0,
      waste: 0,
    };
  }

  const catMap: Record<string, { name: string; amount: number; color: string; count: number }> = {};

  for (const t of txCurrent) {
    const day = parseInt(t.occurredAt.slice(8, 10), 10);
    const dayEntry = dailyMap[day];

    if (t.transactionType === 'expense') {
      totalExpenses += t.amount;
      if (dayEntry) dayEntry.expense += t.amount;

      if (t.spendClassification === 'proper_spend') {
        totalProper += t.amount;
        if (dayEntry) dayEntry.proper += t.amount;
      } else if (t.spendClassification === 'waste_spend') {
        totalWaste += t.amount;
        if (dayEntry) dayEntry.waste += t.amount;
      } else {
        totalUnclassified += t.amount;
      }

      const cat = categories.find((c) => c.id === t.categoryId) || { name: 'Other', color: '#94a3b8' };
      if (!catMap[cat.name]) {
        catMap[cat.name] = { name: cat.name, amount: 0, color: cat.color, count: 0 };
      }
      catMap[cat.name].amount += t.amount;
      catMap[cat.name].count += 1;
    } else if (t.transactionType === 'income') {
      totalIncome += t.amount;
      if (dayEntry) dayEntry.income += t.amount;
    }
  }

  let previousMonthExpenses = 0;
  for (const t of txPrevious) {
    if (t.transactionType === 'expense') {
      previousMonthExpenses += t.amount;
    }
  }

  const monthOverMonthChange =
    previousMonthExpenses > 0
      ? Math.round(((totalExpenses - previousMonthExpenses) / previousMonthExpenses) * 1000) / 10
      : 0;

  const properPercentage = totalExpenses > 0 ? Math.round((totalProper / totalExpenses) * 1000) / 10 : 0;
  const wastePercentage = totalExpenses > 0 ? Math.round((totalWaste / totalExpenses) * 1000) / 10 : 0;
  const netSavings = Math.round((totalIncome - totalExpenses) * 100) / 100;

  const categoryList = Object.values(catMap)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      amount: Math.round(c.amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 1000) / 10 : 0,
    }));

  res.json({
    month,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    netSavings,
    totalProper: Math.round(totalProper * 100) / 100,
    totalWaste: Math.round(totalWaste * 100) / 100,
    totalUnclassified: Math.round(totalUnclassified * 100) / 100,
    properPercentage,
    wastePercentage,
    potentialSavings: Math.round(totalWaste * 100) / 100,
    previousMonthExpenses: Math.round(previousMonthExpenses * 100) / 100,
    monthOverMonthChange,
    daily: Object.values(dailyMap).map((d) => ({
      ...d,
      expense: Math.round(d.expense * 100) / 100,
      income: Math.round(d.income * 100) / 100,
      proper: Math.round(d.proper * 100) / 100,
      waste: Math.round(d.waste * 100) / 100,
    })),
    categories: categoryList,
  });
});

// 3. Consecutive Weeks Report Endpoint
apiRouter.get('/reports/consecutive-weeks', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const weeksCount = Math.min(12, Math.max(4, parseInt((req.query.weeks as string) || '6', 10)));
  const now = new Date();

  const weeksData = [];
  const allTx = db.getTransactions(user.id, { limit: 5000 }).transactions;

  for (let i = weeksCount - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const startStr = start.toISOString();
    const endStr = end.toISOString();

    const startLabel = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const weekLabel = `${startLabel} - ${endLabel}`;

    const txInWeek = allTx.filter((t) => t.occurredAt >= startStr && t.occurredAt <= endStr);

    let totalExpenses = 0;
    let totalIncome = 0;
    let totalProper = 0;
    let totalWaste = 0;
    let totalUnclassified = 0;

    for (const t of txInWeek) {
      if (t.transactionType === 'expense') {
        totalExpenses += t.amount;
        if (t.spendClassification === 'proper_spend') totalProper += t.amount;
        else if (t.spendClassification === 'waste_spend') totalWaste += t.amount;
        else totalUnclassified += t.amount;
      } else if (t.transactionType === 'income') {
        totalIncome += t.amount;
      }
    }

    const properPercentage = totalExpenses > 0 ? Math.round((totalProper / totalExpenses) * 1000) / 10 : 0;
    const wastePercentage = totalExpenses > 0 ? Math.round((totalWaste / totalExpenses) * 1000) / 10 : 0;

    weeksData.push({
      weekNumber: weeksCount - i,
      weekLabel,
      startDate: startStr.slice(0, 10),
      endDate: endStr.slice(0, 10),
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalProper: Math.round(totalProper * 100) / 100,
      totalWaste: Math.round(totalWaste * 100) / 100,
      properPercentage,
      wastePercentage,
      weekOverWeekChange: 0,
      wasteChange: 0,
    });
  }

  for (let i = 1; i < weeksData.length; i++) {
    const prev = weeksData[i - 1];
    const curr = weeksData[i];

    if (prev.totalExpenses > 0) {
      curr.weekOverWeekChange = Math.round(((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 1000) / 10;
    }
    if (prev.totalWaste > 0) {
      curr.wasteChange = Math.round(((curr.totalWaste - prev.totalWaste) / prev.totalWaste) * 1000) / 10;
    }
  }

  const totalAllWeeksExpenses = weeksData.reduce((acc, w) => acc + w.totalExpenses, 0);
  const totalAllWeeksWaste = weeksData.reduce((acc, w) => acc + w.totalWaste, 0);
  const averageWeeklyExpense = Math.round((totalAllWeeksExpenses / weeksCount) * 100) / 100;
  const averageWeeklyWaste = Math.round((totalAllWeeksWaste / weeksCount) * 100) / 100;

  const half = Math.floor(weeksCount / 2);
  const firstHalfAvg = weeksData.slice(0, half).reduce((a, b) => a + b.totalExpenses, 0) / half;
  const secondHalfAvg = weeksData.slice(half).reduce((a, b) => a + b.totalExpenses, 0) / (weeksCount - half);
  const overallTrend: 'increasing' | 'decreasing' | 'stable' =
    secondHalfAvg > firstHalfAvg * 1.05 ? 'increasing' : secondHalfAvg < firstHalfAvg * 0.95 ? 'decreasing' : 'stable';

  const activeWeeks = weeksData.filter((w) => w.totalExpenses > 0);
  let bestWeek = null;
  if (activeWeeks.length > 0) {
    const sorted = [...activeWeeks].sort((a, b) => a.totalWaste - b.totalWaste);
    bestWeek = { weekLabel: sorted[0].weekLabel, wasteSpend: sorted[0].totalWaste };
  }

  res.json({
    weeksCount,
    weeks: weeksData,
    averageWeeklyExpense,
    averageWeeklyWaste,
    overallTrend,
    bestWeek,
  });
});

// 4. One Year Report Endpoint
apiRouter.get('/reports/1-year', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
  const categories = db.getCategories(user.id);
  const allTx = db.getTransactions(user.id, { limit: 10000 }).transactions;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsData = [];
  const catMap: Record<string, { name: string; amount: number; color: string }> = {};

  let annualExpenses = 0;
  let annualIncome = 0;
  let annualProper = 0;
  let annualWaste = 0;

  for (let m = 0; m < 12; m++) {
    const mPadded = String(m + 1).padStart(2, '0');
    const period = `${year}-${mPadded}`;
    const txInMonth = allTx.filter((t) => t.occurredAt.slice(0, 7) === period);

    let mExpense = 0;
    let mIncome = 0;
    let mProper = 0;
    let mWaste = 0;

    for (const t of txInMonth) {
      if (t.transactionType === 'expense') {
        mExpense += t.amount;
        if (t.spendClassification === 'proper_spend') mProper += t.amount;
        else if (t.spendClassification === 'waste_spend') mWaste += t.amount;

        const cat = categories.find((c) => c.id === t.categoryId) || { name: 'Other', color: '#94a3b8' };
        if (!catMap[cat.name]) {
          catMap[cat.name] = { name: cat.name, amount: 0, color: cat.color };
        }
        catMap[cat.name].amount += t.amount;
      } else if (t.transactionType === 'income') {
        mIncome += t.amount;
      }
    }

    annualExpenses += mExpense;
    annualIncome += mIncome;
    annualProper += mProper;
    annualWaste += mWaste;

    monthsData.push({
      monthLabel: monthNames[m],
      period,
      totalExpenses: Math.round(mExpense * 100) / 100,
      totalIncome: Math.round(mIncome * 100) / 100,
      netSavings: Math.round((mIncome - mExpense) * 100) / 100,
      properSpend: Math.round(mProper * 100) / 100,
      wasteSpend: Math.round(mWaste * 100) / 100,
    });
  }

  const annualNetSavings = Math.round((annualIncome - annualExpenses) * 100) / 100;
  const properPercentage = annualExpenses > 0 ? Math.round((annualProper / annualExpenses) * 1000) / 10 : 0;
  const wastePercentage = annualExpenses > 0 ? Math.round((annualWaste / annualExpenses) * 1000) / 10 : 0;
  const monthlyAverageExpense = Math.round((annualExpenses / 12) * 100) / 100;
  const monthlyAverageIncome = Math.round((annualIncome / 12) * 100) / 100;

  const activeMonths = monthsData.filter((m) => m.totalExpenses > 0);
  let highestMonth = null;
  let lowestMonth = null;
  if (activeMonths.length > 0) {
    const sorted = [...activeMonths].sort((a, b) => b.totalExpenses - a.totalExpenses);
    highestMonth = { monthLabel: sorted[0].monthLabel, period: sorted[0].period, amount: sorted[0].totalExpenses };
    lowestMonth = { monthLabel: sorted[sorted.length - 1].monthLabel, period: sorted[sorted.length - 1].period, amount: sorted[sorted.length - 1].totalExpenses };
  }

  const annualCategories = Object.values(catMap)
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      ...c,
      amount: Math.round(c.amount * 100) / 100,
      percentage: annualExpenses > 0 ? Math.round((c.amount / annualExpenses) * 1000) / 10 : 0,
    }));

  res.json({
    year,
    annualExpenses: Math.round(annualExpenses * 100) / 100,
    annualIncome: Math.round(annualIncome * 100) / 100,
    annualNetSavings,
    annualProper: Math.round(annualProper * 100) / 100,
    annualWaste: Math.round(annualWaste * 100) / 100,
    properPercentage,
    wastePercentage,
    monthlyAverageExpense,
    monthlyAverageIncome,
    highestMonth,
    lowestMonth,
    months: monthsData,
    annualCategories,
  });
});

// ==========================================
// AI Features (Parser, Clarification, Chat)
// ==========================================

/**
 * AI Parser Endpoint
 * CRITICAL RULE: This endpoint creates a draft ONLY.
 * It NEVER saves or commits a transaction to the database.
 */
apiRouter.post('/ai/parse-expense', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = req.user!;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text prompt is required.' });
      return;
    }

    const categories = db.getCategories(user.id);
    const userAccounts = db.getUserAccounts(user.id);
    const cashAcc = userAccounts.find((a) => a.accountType === 'cash');
    const bankAcc = userAccounts.find((a) => a.accountType === 'bank');

    const draft = await parseNaturalLanguageTransaction(text.trim(), categories, user.currencyCode);

    // Map extracted account types to concrete user account IDs
    if (draft.accountType === 'cash' && cashAcc) {
      draft.accountId = cashAcc.id;
    } else if (draft.accountType === 'bank' && bankAcc) {
      draft.accountId = bankAcc.id;
    }

    if (draft.transactionType === 'transfer') {
      if (draft.targetAccountType === 'cash' && cashAcc) {
        draft.targetAccountId = cashAcc.id;
      } else if (draft.targetAccountType === 'bank' && bankAcc) {
        draft.targetAccountId = bankAcc.id;
      }
    }

    res.json({ draft });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI parsing error' });
  }
});

/**
 * AI Real-Time Description Classifier
 * Recognizes Proper vs Waste vs Unclassified and suggests category + account in real time
 */
apiRouter.post('/ai/classify-text', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = req.user!;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text is required.' });
      return;
    }

    const categories = db.getCategories(user.id);
    const classification = await classifyExpenseDescription(text.trim(), categories);
    res.json(classification);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI classification error' });
  }
});

/**
 * AI Spending Assistant Chat
 * Responds strictly grounded in verified user statistics
 */
apiRouter.post('/ai/chat', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = req.user!;
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required.' });
      return;
    }

    const overview = db.getFinancialOverview(user.id);
    const month = new Date().toISOString().slice(0, 7);

    const monthTx = db.getTransactions(user.id, {
      startDate: `${month}-01T00:00:00.000Z`,
      transactionType: 'expense',
      limit: 1000,
    }).transactions;

    const wasteItems = monthTx
      .filter((t) => t.spendClassification === 'waste_spend')
      .slice(0, 5)
      .map((t) => ({
        description: t.description,
        amount: t.amount,
        date: t.occurredAt.slice(0, 10),
      }));

    // Find biggest expense
    let biggestExpense: { description: string; amount: number; date: string } | null = null;
    if (monthTx.length > 0) {
      const sorted = [...monthTx].sort((a, b) => b.amount - a.amount);
      biggestExpense = {
        description: sorted[0].description,
        amount: sorted[0].amount,
        date: sorted[0].occurredAt.slice(0, 10),
      };
    }

    // Top categories
    const categories = db.getCategories(user.id);
    const catTotals: Record<string, number> = {};
    for (const t of monthTx) {
      const name = categories.find((c) => c.id === t.categoryId)?.name || 'Other';
      catTotals[name] = (catTotals[name] || 0) + t.amount;
    }
    const topCategories = Object.entries(catTotals)
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const userBudgets = db.getBudgets(user.id, month);
    const activeBudgets = userBudgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const catSpent = b.categoryId
        ? monthTx.filter((t) => t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0)
        : overview.thisMonthExpenses;
      return {
        categoryName: cat ? cat.name : 'Overall Monthly Budget',
        amount: b.amount,
        spent: Math.round(catSpent * 100) / 100,
        percentUsed: b.amount > 0 ? Math.round((catSpent / b.amount) * 100) : 0,
      };
    });

    const answer = await generateAiSpendingAnswer(query.trim(), {
      totalAvailableBalance: overview.totalAvailableBalance,
      walletBalance: overview.walletBalance,
      bankBalance: overview.bankBalance,
      todayExpenses: overview.todayExpenses,
      thisMonthExpenses: overview.thisMonthExpenses,
      thisMonthIncome: overview.thisMonthIncome,
      totalProperSpend: overview.totalProperSpend,
      totalWasteSpend: overview.totalWasteSpend,
      totalUnclassifiedSpend: overview.totalUnclassifiedSpend,
      properSpendPercentage: overview.properSpendPercentage,
      wasteSpendPercentage: overview.wasteSpendPercentage,
      topWasteItems: wasteItems,
      topCategories,
      biggestExpense,
      activeBudgets,
      currencySymbol: overview.currencySymbol,
    });

    res.json({
      answer,
      context: {
        totalAvailableBalance: overview.totalAvailableBalance,
        walletBalance: overview.walletBalance,
        bankBalance: overview.bankBalance,
        month,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI Chat failed' });
  }
});

// ==========================================
// Audit Logs
// ==========================================

apiRouter.get('/audit-logs', requireAuth, (req: AuthenticatedRequest, res): void => {
  const user = req.user!;
  const logs = db.getAuditLogs(user.id, 50);
  res.json({ logs });
});
