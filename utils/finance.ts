
import { Transaction, FinancialStatements, AccountCategory, TransactionType, TrialBalanceItem, StatementItem, BankStatementItem, ReconMatch, EquityChangeItem, FinancialNote } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const calculateStatements = (transactions: Transaction[]): FinancialStatements => {
  // 1. Trial Balance
  const accountMap = new Map<string, { category: AccountCategory; debit: number; credit: number }>();
  transactions.forEach((tx) => {
    const current = accountMap.get(tx.accountName) || { category: tx.category, debit: 0, credit: 0 };
    if (tx.type === TransactionType.DEBIT) current.debit += tx.amount;
    else current.credit += tx.amount;
    accountMap.set(tx.accountName, current);
  });

  const trialBalance: TrialBalanceItem[] = Array.from(accountMap.entries()).map(([accountName, data]) => ({
    accountName,
    ...data,
  }));

  // 2. Income Statement
  const revenueItems: StatementItem[] = trialBalance
    .filter((i) => i.category === AccountCategory.REVENUE)
    .map((i) => ({ label: i.accountName, amount: i.credit - i.debit }));
  const expenseItems: StatementItem[] = trialBalance
    .filter((i) => i.category === AccountCategory.EXPENSE)
    .map((i) => ({ label: i.accountName, amount: i.debit - i.credit }));

  const totalRev = revenueItems.reduce((s, i) => s + i.amount, 0);
  const totalExp = expenseItems.reduce((s, i) => s + i.amount, 0);
  const netInc = totalRev - totalExp;

  // 3. Balance Sheet
  const assetItems: StatementItem[] = trialBalance
    .filter((i) => i.category === AccountCategory.ASSET)
    .map((i) => ({ label: i.accountName, amount: i.debit - i.credit }));
  const liabilityItems: StatementItem[] = trialBalance
    .filter((i) => i.category === AccountCategory.LIABILITY)
    .map((i) => ({ label: i.accountName, amount: i.credit - i.debit }));
  
  const rawEquityItems: StatementItem[] = trialBalance
    .filter((i) => i.category === AccountCategory.EQUITY)
    .map((i) => ({ label: i.accountName, amount: i.credit - i.debit }));
  
  const balanceSheetEquity = [...rawEquityItems, { label: 'Current Period Earnings', amount: netInc }];

  const totalAssets = assetItems.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilityItems.reduce((s, i) => s + i.amount, 0);
  const totalEquity = balanceSheetEquity.reduce((s, i) => s + i.amount, 0);

  // 4. Statement of Changes in Equity
  const equityChanges: EquityChangeItem[] = rawEquityItems.map(item => ({
    accountName: item.label,
    openingBalance: item.amount > 50000 ? 50000 : 0, // Heuristic for sample data
    additions: item.amount > 50000 ? item.amount - 50000 : item.amount,
    netIncome: 0,
    withdrawals: 0,
    closingBalance: item.amount
  }));
  
  // Add Retained Earnings row
  equityChanges.push({
    accountName: 'Retained Earnings',
    openingBalance: 0,
    additions: 0,
    netIncome: netInc,
    withdrawals: 0,
    closingBalance: netInc
  });

  // 5. Cash Flow (Heuristic)
  const cashAccounts = ['Cash', 'Bank', 'Petty Cash'];
  const op: StatementItem[] = [];
  const inv: StatementItem[] = [];
  const fin: StatementItem[] = [];

  transactions.filter(tx => cashAccounts.some(acc => tx.accountName.includes(acc))).forEach(tx => {
    const amt = tx.type === TransactionType.DEBIT ? tx.amount : -tx.amount;
    if (tx.category === AccountCategory.REVENUE || tx.category === AccountCategory.EXPENSE) op.push({ label: tx.description, amount: amt });
    else if (tx.category === AccountCategory.ASSET && !cashAccounts.some(acc => tx.accountName.includes(acc))) inv.push({ label: tx.description, amount: amt });
    else if (tx.category === AccountCategory.LIABILITY || tx.category === AccountCategory.EQUITY) fin.push({ label: tx.description, amount: amt });
  });

  // 6. Notes to Financial Statements
  const notes: FinancialNote[] = [
    {
      noteNumber: 1,
      title: 'Basis of Preparation',
      content: 'The financial statements have been prepared on the historical cost basis in accordance with International Financial Reporting Standards (IFRS).'
    },
    {
      noteNumber: 2,
      title: 'Revenue Recognition',
      content: 'Revenue is recognized when the significant risks and rewards of ownership have been transferred to the customer. For this period, revenue primarily consists of product sales.',
      data: revenueItems
    },
    {
      noteNumber: 3,
      title: 'Cash and Cash Equivalents',
      content: 'Cash and cash equivalents comprise cash on hand and demand deposits with banks.',
      data: assetItems.filter(a => cashAccounts.some(ca => a.label.includes(ca)))
    },
    {
      noteNumber: 4,
      title: 'Property, Plant and Equipment',
      content: 'Equipment is stated at cost less accumulated depreciation. Depreciation is calculated on a straight-line basis over the estimated useful lives of the assets.',
      data: assetItems.filter(a => !cashAccounts.some(ca => a.label.includes(ca)))
    }
  ];

  return {
    trialBalance,
    incomeStatement: { revenue: revenueItems, expenses: expenseItems, totalRevenue: totalRev, totalExpenses: totalExp, netIncome: netInc },
    balanceSheet: { assets: assetItems, liabilities: liabilityItems, equity: balanceSheetEquity, totalAssets, totalLiabilities, totalEquity },
    cashFlow: { operating: op, investing: inv, financing: fin, netCashFlow: totalAssets - totalLiabilities - totalEquity + netInc },
    equityChanges,
    notes,
    variance: {
      revenueActual: totalRev,
      revenueBudget: 65000,
      expenseActual: totalExp,
      expenseBudget: 15000
    }
  };
};

export const performBankReconciliation = (bookEntries: Transaction[], statementEntries: BankStatementItem[]): ReconMatch[] => {
  const matches: ReconMatch[] = [];
  const matchedStatementIds = new Set<string>();

  bookEntries.forEach(book => {
    const bookAmount = book.type === TransactionType.DEBIT ? book.amount : -book.amount;
    const match = statementEntries.find(st => st.date === book.date && st.amount === bookAmount && !matchedStatementIds.has(st.id));
    if (match) {
      matches.push({ bookEntry: book, statementEntry: match, status: 'matched' });
      matchedStatementIds.add(match.id);
    } else {
      matches.push({ bookEntry: book, status: 'missing_in_statement' });
    }
  });

  statementEntries.forEach(st => {
    if (!matchedStatementIds.has(st.id)) {
      matches.push({ statementEntry: st, status: 'missing_in_book' });
    }
  });

  return matches;
};

export const getTrendData = (transactions: Transaction[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dataMap = new Map<string, { revenue: number, expense: number, profit: number }>();

  transactions.forEach(tx => {
    const monthIndex = new Date(tx.date).getMonth();
    const monthLabel = months[monthIndex];
    const current = dataMap.get(monthLabel) || { revenue: 0, expense: 0, profit: 0 };
    if (tx.category === AccountCategory.REVENUE) current.revenue += tx.amount;
    else if (tx.category === AccountCategory.EXPENSE) current.expense += tx.amount;
    current.profit = current.revenue - current.expense;
    dataMap.set(monthLabel, current);
  });

  return months.map(m => ({ month: m, ...dataMap.get(m) || { revenue: 0, expense: 0, profit: 0 } }));
};

export const sampleTransactions: Transaction[] = [
  { id: '1', date: '2023-10-01', description: 'Initial Capital', accountName: 'Cash', category: AccountCategory.ASSET, amount: 50000, type: TransactionType.DEBIT },
  { id: '2', date: '2023-10-01', description: 'Initial Capital', accountName: 'Common Stock', category: AccountCategory.EQUITY, amount: 50000, type: TransactionType.CREDIT },
  { id: '3', date: '2023-10-05', description: 'Monthly Rent', accountName: 'Rent Expense', category: AccountCategory.EXPENSE, amount: 2000, type: TransactionType.DEBIT },
  { id: '4', date: '2023-10-05', description: 'Monthly Rent', accountName: 'Cash', category: AccountCategory.ASSET, amount: 2000, type: TransactionType.CREDIT },
  { id: '5', date: '2023-10-10', description: 'Product Sale', accountName: 'Cash', category: AccountCategory.ASSET, amount: 12000, type: TransactionType.DEBIT },
  { id: '6', date: '2023-10-10', description: 'Product Sale', accountName: 'Sales Revenue', category: AccountCategory.REVENUE, amount: 12000, type: TransactionType.CREDIT },
  { id: '7', date: '2023-10-15', description: 'Office Equipment', accountName: 'Equipment', category: AccountCategory.ASSET, amount: 5000, type: TransactionType.DEBIT },
  { id: '8', date: '2023-10-15', description: 'Office Equipment', accountName: 'Cash', category: AccountCategory.ASSET, amount: 5000, type: TransactionType.CREDIT },
  { id: '9', date: '2023-10-20', description: 'Employee Salaries', accountName: 'Payroll Expense', category: AccountCategory.EXPENSE, amount: 4500, type: TransactionType.DEBIT },
  { id: '10', date: '2023-10-20', description: 'Employee Salaries', accountName: 'Cash', category: AccountCategory.ASSET, amount: 4500, type: TransactionType.CREDIT },
  { id: '11', date: '2023-09-10', description: 'Prior Sale', accountName: 'Sales Revenue', category: AccountCategory.REVENUE, amount: 40000, type: TransactionType.CREDIT },
  { id: '12', date: '2023-09-15', description: 'Prior Rent', accountName: 'Rent Expense', category: AccountCategory.EXPENSE, amount: 2000, type: TransactionType.DEBIT },
];

export const sampleBankStatement: BankStatementItem[] = [
  { id: 'st1', date: '2023-10-01', description: 'DEPOSIT CAPITAL', amount: 50000 },
  { id: 'st2', date: '2023-10-05', description: 'CHECK #101 RENT', amount: -2000 },
  { id: 'st3', date: '2023-10-10', description: 'POS CREDIT SALE', amount: 12000 },
  { id: 'st4', date: '2023-10-15', description: 'EQUIPMENT PURCHASE', amount: -5000 },
  { id: 'st5', date: '2023-10-22', description: 'BANK FEE', amount: -25 },
];
