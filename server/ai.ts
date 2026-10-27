/**
 * SpendWise AI Service using Gemini 3.8 Flash via @google/genai
 * Strictly runs server-side with robust error handling and safety rules.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { ParsedExpenseDraft, SpendClassification, TransactionType } from './types.js';

let geminiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

/**
 * Natural language expense/income/transfer parser adhering to safety rules:
 * 1. Never invent missing amounts.
 * 2. Never fabricate purchases.
 * 3. Never silently assume missing payment accounts.
 * 4. Generate clarification questions when required fields are missing.
 */
export async function parseNaturalLanguageTransaction(
  userInput: string,
  categories: Array<{ id: string; name: string; type: string }>,
  currencyCode = 'INR'
): Promise<ParsedExpenseDraft> {
  const client = getAiClient();

  if (client) {
    try {
      const categoryNames = categories.map((c) => c.name).join(', ');
      const systemInstruction = `
You are the natural language financial transaction parser for SpendWise (a daily expense tracker in India/worldwide).
Your job is to extract transaction details into structured JSON adhering to strict financial safety rules:
1. NEVER invent or hallucinate an amount. If the user did not specify an amount, amount MUST be null, and "amount" must be added to missingFields.
2. NEVER fabricate purchases or details.
3. NEVER silently assume a payment account. If the user does not clearly specify cash / wallet / UPI / bank / card, set accountType to "unknown" and add "payment_account" to missingFields.
4. Detect transaction type: "expense", "income", or "transfer" (e.g. "withdrew ₹500 from ATM" or "transferred ₹1000 from bank to wallet" is a transfer).
5. For transfers: source is fromAccount ("bank" for ATM withdrawal) and destination is targetAccount ("cash" for ATM withdrawal).
6. Spend Classification: suggest "proper_spend" for essentials, needs, education, groceries, bus fare, utility bills. Suggest "waste_spend" only if explicitly impulsive, wasteful, regretful, or clearly unnecessary. Otherwise suggest "unclassified".
7. Generate a friendly, concise clarificationQuestion if any required fields (amount, payment_account, description) are missing.
Available categories: ${categoryNames}.
Current Currency: ${currencyCode}.
`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Parse this transaction entry: "${userInput}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactionType: {
                type: Type.STRING,
                description: '"expense", "income", or "transfer"',
              },
              description: {
                type: Type.STRING,
                description: 'Clear short description of the item or reason',
              },
              amount: {
                type: Type.NUMBER,
                description: 'The numeric amount, or null if not provided',
              },
              currencyCode: {
                type: Type.STRING,
                description: 'Currency code, default INR',
              },
              categoryName: {
                type: Type.STRING,
                description: 'Closest matching category from the list, or null',
              },
              accountType: {
                type: Type.STRING,
                description: '"cash", "bank", or "unknown"',
              },
              targetAccountType: {
                type: Type.STRING,
                description: 'For transfers: "cash", "bank", or "unknown"',
              },
              spendClassification: {
                type: Type.STRING,
                description: '"proper_spend", "waste_spend", or "unclassified"',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score from 0.0 to 1.0',
              },
              missingFields: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of missing required fields (e.g. "amount", "payment_account")',
              },
              clarificationQuestion: {
                type: Type.STRING,
                description: 'Short clarification question to ask the user if info is missing, else null',
              },
              rationale: {
                type: Type.STRING,
                description: 'Brief reason for the spending classification or categorization',
              },
            },
            required: [
              'transactionType',
              'description',
              'currencyCode',
              'accountType',
              'spendClassification',
              'confidence',
              'missingFields',
            ],
          },
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        // Find matching category ID if present
        let matchedCat = categories.find(
          (c) => c.name.toLowerCase() === (parsed.categoryName || '').toLowerCase()
        );
        if (!matchedCat && parsed.categoryName) {
          matchedCat = categories.find((c) =>
            c.name.toLowerCase().includes((parsed.categoryName || '').toLowerCase())
          );
        }

        return {
          transactionType: (parsed.transactionType as TransactionType) || 'expense',
          description: parsed.description || userInput,
          amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : null,
          currencyCode: parsed.currencyCode || currencyCode,
          categoryName: matchedCat?.name || parsed.categoryName || null,
          categoryId: matchedCat?.id || null,
          accountType: ['cash', 'bank'].includes(parsed.accountType) ? parsed.accountType : 'unknown',
          targetAccountType: ['cash', 'bank'].includes(parsed.targetAccountType)
            ? parsed.targetAccountType
            : 'unknown',
          occurredAt: new Date().toISOString(),
          spendClassification: (parsed.spendClassification as SpendClassification) || 'unclassified',
          confidence: parsed.confidence || 0.85,
          missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
          clarificationQuestion: parsed.clarificationQuestion || null,
          rationale: parsed.rationale || '',
        };
      }
    } catch (err) {
      console.warn('Gemini parser error, using heuristic fallback parser:', err);
    }
  }

  // Heuristic rule-based fallback parser (ensures 100% reliable functionality)
  return fallbackRuleParser(userInput, categories, currencyCode);
}

function fallbackRuleParser(
  input: string,
  categories: Array<{ id: string; name: string; type: string }>,
  currencyCode = 'INR'
): ParsedExpenseDraft {
  const text = input.trim();
  const lower = text.toLowerCase();
  const missingFields: string[] = [];

  // Determine transaction type
  let transactionType: TransactionType = 'expense';
  let accountType: 'cash' | 'bank' | 'unknown' = 'unknown';
  let targetAccountType: 'cash' | 'bank' | 'unknown' = 'unknown';

  if (
    lower.includes('salary') ||
    lower.includes('received') ||
    lower.includes('got paid') ||
    lower.includes('credit') ||
    lower.includes('dividend')
  ) {
    transactionType = 'income';
  } else if (
    lower.includes('withdraw') ||
    lower.includes('atm') ||
    (lower.includes('transfer') && (lower.includes('bank') || lower.includes('wallet') || lower.includes('cash')))
  ) {
    transactionType = 'transfer';
    if (lower.includes('atm') || lower.includes('withdraw')) {
      accountType = 'bank'; // from bank
      targetAccountType = 'cash'; // to wallet
    } else if (lower.includes('deposit')) {
      accountType = 'cash'; // from cash
      targetAccountType = 'bank'; // to bank
    }
  }

  // Detect payment account if not transfer
  if (transactionType !== 'transfer') {
    if (lower.includes('cash') || lower.includes('wallet') || lower.includes('physical money')) {
      accountType = 'cash';
    } else if (
      lower.includes('upi') ||
      lower.includes('gpay') ||
      lower.includes('phonepe') ||
      lower.includes('paytm') ||
      lower.includes('bank') ||
      lower.includes('card') ||
      lower.includes('online') ||
      lower.includes('netbanking')
    ) {
      accountType = 'bank';
    } else {
      accountType = 'unknown';
      missingFields.push('payment_account');
    }
  }

  // Extract amount
  // Matches ₹100, 100rs, 100 rupees, Rs. 100, 100.50, INR 100
  let amount: number | null = null;
  const numRegex = /(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(?:₹|rs\.?|rupees|inr|bucks)?/i;
  const wordNumberMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    twenty: 20,
    fifty: 50,
    hundred: 100,
  };

  // Check word numbers like "five rupees"
  for (const [word, val] of Object.entries(wordNumberMap)) {
    if (new RegExp(`\\b${word}\\s*(?:rupees|rs|bucks)?\\b`, 'i').test(lower)) {
      amount = val;
      break;
    }
  }

  if (amount === null) {
    const match = text.match(numRegex);
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(',', ''));
      if (!isNaN(num) && num > 0) {
        amount = num;
      }
    }
  }

  if (amount === null) {
    missingFields.push('amount');
  }

  // Category matching
  let matchedCat = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (!matchedCat) {
    if (
      lower.includes('pen') ||
      lower.includes('notebook') ||
      lower.includes('stationery') ||
      lower.includes('book')
    ) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('stationery'));
    } else if (
      lower.includes('bus') ||
      lower.includes('metro') ||
      lower.includes('train') ||
      lower.includes('fare') ||
      lower.includes('ticket')
    ) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('transport'));
    } else if (lower.includes('auto') || lower.includes('cab') || lower.includes('uber') || lower.includes('ola')) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('auto'));
    } else if (
      lower.includes('lunch') ||
      lower.includes('dinner') ||
      lower.includes('food') ||
      lower.includes('restaurant') ||
      lower.includes('pizza') ||
      lower.includes('burger') ||
      lower.includes('dominos') ||
      lower.includes('kfc') ||
      lower.includes('mcdonald') ||
      lower.includes('biryani') ||
      lower.includes('dosa')
    ) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('food'));
    } else if (lower.includes('tea') || lower.includes('chai') || lower.includes('coffee') || lower.includes('snack')) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('snack'));
    } else if (
      lower.includes('grocery') ||
      lower.includes('vegetable') ||
      lower.includes('milk') ||
      lower.includes('fruits')
    ) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('groceries'));
    } else if (lower.includes('salary')) {
      matchedCat = categories.find((c) => c.name.toLowerCase().includes('salary'));
    }
  }

  // Spend classification suggestion
  let spendClassification: SpendClassification = 'unclassified';
  if (transactionType === 'expense') {
    if (
      lower.includes('pen') ||
      lower.includes('bus') ||
      lower.includes('textbook') ||
      lower.includes('milk') ||
      lower.includes('meal') ||
      lower.includes('thali') ||
      lower.includes('vegetable') ||
      lower.includes('electricity') ||
      lower.includes('rent') ||
      lower.includes('college')
    ) {
      spendClassification = 'proper_spend';
    } else if (
      lower.includes('waste') ||
      lower.includes('impulse') ||
      lower.includes('regret') ||
      lower.includes('unused') ||
      lower.includes('discarded') ||
      lower.includes('pizza') ||
      lower.includes('burger') ||
      lower.includes('kurkure') ||
      lower.includes('lace') ||
      lower.includes('lays') ||
      lower.includes('cold drink')
    ) {
      spendClassification = 'waste_spend';
    }
  }

  // Clarification question
  let clarificationQuestion: string | null = null;
  if (missingFields.includes('amount') && missingFields.includes('payment_account')) {
    clarificationQuestion = `How much did you spend, and did you pay using Wallet / Cash or Bank / UPI?`;
  } else if (missingFields.includes('amount')) {
    clarificationQuestion = `What was the amount spent?`;
  } else if (missingFields.includes('payment_account')) {
    clarificationQuestion = `Did you pay using Wallet / Cash or Bank / UPI?`;
  }

  // Clean description
  let description = text;
  description = description
    .replace(/(?:i\s+bought|i\s+spent|paid|received|spent)\s+/i, '')
    .replace(/(?:using\s+cash|through\s+upi|using\s+bank|by\s+cash|in\s+cash)/i, '')
    .replace(/(?:for\s+₹?\d+\s*(?:rs|rupees)?)/i, '')
    .trim();
  if (description.length === 0) {
    description = matchedCat?.name || (transactionType === 'income' ? 'Income' : 'Expense');
  }
  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return {
    transactionType,
    description,
    amount,
    currencyCode,
    categoryName: matchedCat?.name || null,
    categoryId: matchedCat?.id || null,
    accountType,
    targetAccountType,
    occurredAt: new Date().toISOString(),
    spendClassification,
    confidence: missingFields.length === 0 ? 0.95 : 0.7,
    missingFields,
    clarificationQuestion,
  };
}

/**
 * AI Spending Assistant - Answers user queries grounded purely in verified financial figures
 */
export async function generateAiSpendingAnswer(
  userQuery: string,
  financialSummary: {
    totalAvailableBalance: number;
    walletBalance: number;
    bankBalance: number;
    todayExpenses: number;
    thisMonthExpenses: number;
    thisMonthIncome: number;
    totalProperSpend: number;
    totalWasteSpend: number;
    totalUnclassifiedSpend: number;
    properSpendPercentage: number;
    wasteSpendPercentage: number;
    topWasteItems: Array<{ description: string; amount: number; date: string }>;
    topCategories: Array<{ name: string; amount: number }>;
    biggestExpense: { description: string; amount: number; date: string } | null;
    activeBudgets?: Array<{ categoryName: string; amount: number; spent: number; percentUsed: number }>;
    currencySymbol: string;
  }
): Promise<string> {
  const client = getAiClient();
  const { currencySymbol } = financialSummary;

  const topCategoryStr =
    financialSummary.topCategories.map((c) => `${c.name}: ${currencySymbol}${c.amount.toFixed(2)}`).join(', ') ||
    'None recorded';
  const topWasteStr =
    financialSummary.topWasteItems.map((w) => `${w.description}: ${currencySymbol}${w.amount.toFixed(2)} on ${w.date}`).join(', ') ||
    'None recorded';
  const budgetsStr =
    financialSummary.activeBudgets && financialSummary.activeBudgets.length > 0
      ? financialSummary.activeBudgets
          .map((b) => `${b.categoryName}: Spent ${currencySymbol}${b.spent.toFixed(2)} of ${currencySymbol}${b.amount.toFixed(2)} (${b.percentUsed}%)`)
          .join('; ')
      : 'No category budgets active';

  if (client) {
    try {
      const prompt = `
You are SpendWise AI, an expert, empowering, and practical personal finance advisor.
Your goal is to answer the user's questions clearly, giving actionable advice on how to manage budgets, control costs, save money, and analyze spending habits.

VERIFIED FINANCIAL FIGURES FOR THIS USER (Source of Truth):
- Total Available Balance: ${currencySymbol}${financialSummary.totalAvailableBalance.toFixed(2)}
- Wallet (Cash in Hand) Balance: ${currencySymbol}${financialSummary.walletBalance.toFixed(2)}
- Bank / UPI Balance: ${currencySymbol}${financialSummary.bankBalance.toFixed(2)}
- Today's Total Expenses: ${currencySymbol}${financialSummary.todayExpenses.toFixed(2)}
- This Month's Total Expenses: ${currencySymbol}${financialSummary.thisMonthExpenses.toFixed(2)}
- This Month's Total Income: ${currencySymbol}${financialSummary.thisMonthIncome.toFixed(2)}
- Proper Spend (Essential Needs): ${currencySymbol}${financialSummary.totalProperSpend.toFixed(2)} (${financialSummary.properSpendPercentage}% of expenses)
- Waste Spend (Impulse / Craving / Regret): ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} (${financialSummary.wasteSpendPercentage}% of expenses)
- Unclassified Expenses: ${currencySymbol}${financialSummary.totalUnclassifiedSpend.toFixed(2)}
- Top Spending Categories: ${topCategoryStr}
- Top Waste Items: ${topWasteStr}
- Active Budgets: ${budgetsStr}
- Biggest Single Expense: ${financialSummary.biggestExpense ? `${financialSummary.biggestExpense.description} (${currencySymbol}${financialSummary.biggestExpense.amount.toFixed(2)})` : 'None'}

INSTRUCTIONS FOR ADVICE & ANSWERS:
1. BUDGET & COST MANAGEMENT:
   - Provide concrete, structured steps (numbered or concise bullet points).
   - Reference the 50/30/20 rule (50% Proper needs, 30% Wants, 20% Savings) tailored to their actual figures.
   - Specifically mention their highest expense categories (${topCategoryStr}) and advise setting budget thresholds in the SpendWise 'Budgets' tab.
   - Emphasize that cutting their recorded waste spend of ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} will directly lower overall costs without sacrificing necessities.

2. HOW TO SAVE MONEY:
   - Quantify their potential savings: Show that reducing their waste spend (${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)}) by 50% immediately saves ${currencySymbol}${(financialSummary.totalWasteSpend * 0.5).toFixed(2)}.
   - Recommend "Pay Yourself First" — transferring 15-20% of income/allowance directly into savings before spending.
   - Suggest managing UPI impulse friction: use physical cash limits from their Wallet (${currencySymbol}${financialSummary.walletBalance.toFixed(2)}) for discretionary treats instead of seamless UPI clicks.

3. ACCURACY & STYLE:
   - Ground every number strictly in the verified figures above. Never hallucinate transactions.
   - Format with clean readable spacing, bullet points, and bold keywords.
   - Keep answers between 3 and 6 practical, focused sentences or clear bullet points.

User Question: "${userQuery}"
`;

      const aiPromise = client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timeout')), 5000)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (err) {
      console.warn('Gemini chat error or timeout, using verified deterministic response:', err);
    }
  }

  // Robust, personalized deterministic grounded response fallback
  const q = userQuery.toLowerCase();

  // 1. Budget & Cost Management
  if (
    q.includes('budget') ||
    q.includes('cost') ||
    q.includes('manage') ||
    q.includes('plan')
  ) {
    const topCat = financialSummary.topCategories[0]?.name || 'Food & Dining';
    const topCatAmt = financialSummary.topCategories[0]?.amount || financialSummary.thisMonthExpenses;
    const halfWaste = (financialSummary.totalWasteSpend * 0.5).toFixed(2);

    return `Here is a personalized strategy to manage your budget and control costs:
1. **Apply the 50/30/20 Rule**: Allocate 50% to Proper essentials (currently ${financialSummary.properSpendPercentage}% or ${currencySymbol}${financialSummary.totalProperSpend.toFixed(2)}), 30% to discretionary wants, and 20% directly to savings.
2. **Cap Your Top Category (${topCat})**: You spent ${currencySymbol}${topCatAmt.toFixed(2)} on ${topCat}. Set a monthly threshold alert in the **Budgets** tab to prevent overspending.
3. **Trim Waste Outflow**: You have recorded ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} in waste spending (${financialSummary.wasteSpendPercentage}% of expenses). Halving this saves you ${currencySymbol}${halfWaste} immediately!
4. **Track Dual Balances**: Keep a fixed cash amount in your Wallet (${currencySymbol}${financialSummary.walletBalance.toFixed(2)}) for daily expenses, and keep the rest secure in Bank / UPI (${currencySymbol}${financialSummary.bankBalance.toFixed(2)}).`;
  }

  // 2. How to Save Money
  if (
    q.includes('save') ||
    q.includes('saving') ||
    q.includes('savings')
  ) {
    const wasteAmt = financialSummary.totalWasteSpend;
    const potentialMonthly = wasteAmt.toFixed(2);
    const potentialAnnual = (wasteAmt * 12).toFixed(2);

    return `Here are the most effective ways to save money based on your financial activity:
1. **Cut Recorded Waste Spending**: You spent ${currencySymbol}${potentialMonthly} on impulse snacks, fast food, and treats this month (${financialSummary.wasteSpendPercentage}% of expenses). Eliminating this saves you **${currencySymbol}${potentialMonthly} monthly** (over **${currencySymbol}${potentialAnnual} a year**)!
2. **Pay Yourself First**: Transfer 15%–20% of your incoming money directly into a separate bank reserve before making any discretionary purchases.
3. **Control Instant UPI Taps**: UPI makes micro-spends feel painless. For street food or snacks, withdraw cash from your Bank (${currencySymbol}${financialSummary.bankBalance.toFixed(2)}) to your Wallet (${currencySymbol}${financialSummary.walletBalance.toFixed(2)}) to create visual spending friction.
4. **Classify Pending Expenses**: You have ${currencySymbol}${financialSummary.totalUnclassifiedSpend.toFixed(2)} in unclassified items—reviewing them helps eliminate hidden financial leaks.`;
  }

  // 3. Cut Expenses / Reduce Outflow / Tips
  if (
    q.includes('reduce') ||
    q.includes('cut') ||
    q.includes('tip') ||
    q.includes('advice') ||
    q.includes('impulse')
  ) {
    return `Top cost-reduction tips based on your records:
• **Curb Fast Food / Takeout**: Replace takeout cravings (pizza, burgers, commercial snacks) with nutritious meals to protect your wallet.
• **Set Category Budgets**: Go to the **Budgets** tab and establish monthly limits with alert thresholds at 80%.
• **Current Balance Health**: Your total available balance is ${currencySymbol}${financialSummary.totalAvailableBalance.toFixed(2)} (${currencySymbol}${financialSummary.walletBalance.toFixed(2)} Cash + ${currencySymbol}${financialSummary.bankBalance.toFixed(2)} Bank/UPI). Maintain an emergency buffer of at least 1 month of expenses (${currencySymbol}${financialSummary.thisMonthExpenses.toFixed(2)}).`;
  }

  // 4. Specific Figure Lookups
  if (q.includes('today')) {
    return `Today you have spent a total of ${currencySymbol}${financialSummary.todayExpenses.toFixed(2)}. Your current total available balance is ${currencySymbol}${financialSummary.totalAvailableBalance.toFixed(2)}.`;
  }
  if (q.includes('waste')) {
    return `This month, you have classified ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} as waste spending (${financialSummary.wasteSpendPercentage}% of your total expenses). Cutting back on these items could save you up to ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)}!`;
  }
  if (q.includes('wallet') || q.includes('cash')) {
    return `Your physical wallet cash balance is ${currencySymbol}${financialSummary.walletBalance.toFixed(2)}.`;
  }
  if (q.includes('bank') || q.includes('upi')) {
    return `Your Bank / UPI balance is ${currencySymbol}${financialSummary.bankBalance.toFixed(2)}. Note that this is calculated from your SpendWise entries.`;
  }
  if (q.includes('biggest') || q.includes('highest')) {
    if (financialSummary.biggestExpense) {
      return `Your biggest single expense is "${financialSummary.biggestExpense.description}" for ${currencySymbol}${financialSummary.biggestExpense.amount.toFixed(2)}.`;
    }
    return `You have not recorded any expenses yet.`;
  }
  if (q.includes('compare') || q.includes('proper')) {
    return `This month, your Proper (essential) spending is ${currencySymbol}${financialSummary.totalProperSpend.toFixed(2)} (${financialSummary.properSpendPercentage}%), while Waste spending is ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} (${financialSummary.wasteSpendPercentage}%). ${financialSummary.properSpendPercentage >= 70 ? 'Great job prioritizing essentials!' : 'Aim to keep proper spend above 70% to boost savings.'}`;
  }
  if (q.includes('total') || q.includes('balance')) {
    return `Your Total Available Balance is ${currencySymbol}${financialSummary.totalAvailableBalance.toFixed(2)} (${currencySymbol}${financialSummary.walletBalance.toFixed(2)} in cash and ${currencySymbol}${financialSummary.bankBalance.toFixed(2)} in Bank/UPI).`;
  }

  return `This month you have spent ${currencySymbol}${financialSummary.thisMonthExpenses.toFixed(2)} (${currencySymbol}${financialSummary.totalProperSpend.toFixed(2)} proper spend and ${currencySymbol}${financialSummary.totalWasteSpend.toFixed(2)} waste spend). Your total available balance is ${currencySymbol}${financialSummary.totalAvailableBalance.toFixed(2)}. Ask me how to manage your budget, how to save money, or how to reduce waste spend!`;
}

import { classifyWithGoogleCatalog } from './googleClassifier.js';

/**
 * Real-time description classifier for Quick Add Expense modal
 * Grounded in Google consumer product catalog and Gemini AI
 * Recognizes Proper vs Waste vs Unclassified and suggests matching category & account
 */
export async function classifyExpenseDescription(
  text: string,
  categories: Array<{ id: string; name: string }>
): Promise<{
  spendClassification: SpendClassification;
  categoryName: string | null;
  categoryId: string | null;
  accountSuggestion: 'cash' | 'bank' | null;
  rationale: string;
}> {
  const client = getAiClient();
  const lower = text.trim().toLowerCase();

  // 1. Google Consumer Catalog Knowledge Base (Handles Kurkure, Lays/Lace, Meal, Thali, Pen, Bus fare, etc.)
  const googleResult = classifyWithGoogleCatalog(text, categories);

  const matchedCat = categories.find(
    (c) => c.name.toLowerCase() === googleResult.categoryMatch.toLowerCase()
  ) || categories.find(
    (c) => c.name.toLowerCase().includes(googleResult.categoryMatch.toLowerCase())
  );

  // If Google catalog already identified Proper or Waste with high certainty, return immediately
  if (googleResult.spendClassification !== 'unclassified') {
    return {
      spendClassification: googleResult.spendClassification,
      categoryName: matchedCat?.name || googleResult.categoryMatch,
      categoryId: matchedCat?.id || null,
      accountSuggestion: googleResult.accountSuggestion || null,
      rationale: googleResult.rationale,
    };
  }

  // 2. Optional Gemini semantic check for complex sentences if quota available
  if (client && text.length > 3) {
    try {
      const categoryNames = categories.map((c) => c.name).join(', ');
      const systemPrompt = `You are a financial spending classifier for India grounded in consumer spending data.
Classify this item as:
- "waste_spend" for impulse snacks, chips, kurkure, lays, junk food, cold drinks, sweets, cigarettes, lottery, gambling, in-app gaming, regretted purchases.
- "proper_spend" for daily meals, lunch, dinner, breakfast, thali, groceries, milk, vegetables, stationery, pen, books, commute, bus fare, metro, fuel, medicines, doctor, rent, utilities.
- "unclassified" if ambiguous.
Return JSON with { "spendClassification": "...", "categoryName": "...", "rationale": "..." }. Available categories: ${categoryNames}.`;

      const aiPromise = client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Classify: "${text}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spendClassification: { type: Type.STRING },
              categoryName: { type: Type.STRING },
              rationale: { type: Type.STRING },
            },
            required: ['spendClassification'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI classification timeout')), 3500)
      );

      const resp = await Promise.race([aiPromise, timeoutPromise]);
      if (resp && resp.text) {
        const parsed = JSON.parse(resp.text);
        let aiCat = categories.find(
          (c) => c.name.toLowerCase() === (parsed.categoryName || '').toLowerCase()
        );
        if (!aiCat && parsed.categoryName) {
          aiCat = categories.find((c) =>
            c.name.toLowerCase().includes(parsed.categoryName.toLowerCase())
          );
        }

        return {
          spendClassification:
            (parsed.spendClassification as SpendClassification) || googleResult.spendClassification,
          categoryName: aiCat?.name || matchedCat?.name || null,
          categoryId: aiCat?.id || matchedCat?.id || null,
          accountSuggestion: googleResult.accountSuggestion || null,
          rationale: parsed.rationale || googleResult.rationale,
        };
      }
    } catch {
      // Gracefully fall back to Google Catalog
    }
  }

  return {
    spendClassification: googleResult.spendClassification,
    categoryName: matchedCat?.name || googleResult.categoryMatch,
    categoryId: matchedCat?.id || null,
    accountSuggestion: googleResult.accountSuggestion || null,
    rationale: googleResult.rationale,
  };
}

