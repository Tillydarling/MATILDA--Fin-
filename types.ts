
export enum AccountCategory {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense'
}

export enum TransactionType {
  DEBIT = 'Debit',
  CREDIT = 'Credit'
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  accountName: string;
  category: AccountCategory;
  amount: number;
  type: TransactionType;
}

export interface TrialBalanceItem {
  accountName: string;
  category: AccountCategory;
  debit: number;
  credit: number;
}

export interface StatementItem {
  label: string;
  amount: number;
  isTotal?: boolean;
}

export interface EquityChangeItem {
  accountName: string;
  openingBalance: number;
  additions: number;
  netIncome: number;
  withdrawals: number;
  closingBalance: number;
}

export interface FinancialNote {
  noteNumber: number;
  title: string;
  content: string;
  data?: StatementItem[];
}

export interface BankStatementItem {
  id: string;
  date: string;
  description: string;
  amount: number; // Positive is deposit, Negative is withdrawal
}

export interface ReconMatch {
  bookEntry?: Transaction;
  statementEntry?: BankStatementItem;
  status: 'matched' | 'missing_in_statement' | 'missing_in_book' | 'amount_mismatch';
}

export interface FinancialStatements {
  trialBalance: TrialBalanceItem[];
  incomeStatement: {
    revenue: StatementItem[];
    expenses: StatementItem[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
  balanceSheet: {
    assets: StatementItem[];
    liabilities: StatementItem[];
    equity: StatementItem[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  };
  cashFlow: {
    operating: StatementItem[];
    investing: StatementItem[];
    financing: StatementItem[];
    netCashFlow: number;
  };
  equityChanges: EquityChangeItem[];
  notes: FinancialNote[];
  variance: {
    revenueActual: number;
    revenueBudget: number;
    expenseActual: number;
    expenseBudget: number;
  };
}
