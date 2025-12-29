
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, 
  FileText, 
  Table, 
  ArrowRightLeft, 
  BrainCircuit, 
  Upload, 
  Plus, 
  Download,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  Scale,
  RotateCcw,
  BarChart3,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Transaction, FinancialStatements, AccountCategory, TransactionType } from './types';
import { calculateStatements, sampleTransactions, formatCurrency, performBankReconciliation, sampleBankStatement, getTrendData } from './utils/finance';
import { getFinancialAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'trial-balance' | 'income' | 'balance-sheet' | 'cashflow' | 'reconciliation' | 'variance' | 'trend' | 'ai'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const statements = useMemo(() => calculateStatements(transactions), [transactions]);
  const trendData = useMemo(() => getTrendData(transactions), [transactions]);
  
  // Bank Recon
  const bankTransactions = useMemo(() => transactions.filter(t => t.accountName === 'Cash'), [transactions]);
  const reconMatches = useMemo(() => performBankReconciliation(bankTransactions, sampleBankStatement), [bankTransactions]);

  const handleImport = () => {
    try {
      const lines = importText.trim().split('\n');
      const newTransactions: Transaction[] = lines.map((line, idx) => {
        const [date, description, accountName, category, amount, type] = line.split(',').map(s => s.trim());
        return {
          id: `new-${idx}-${Date.now()}`,
          date,
          description,
          accountName,
          category: category as AccountCategory,
          amount: parseFloat(amount),
          type: type as TransactionType
        };
      });
      setTransactions([...transactions, ...newTransactions]);
      setImportText('');
      setShowImportModal(false);
    } catch (e) {
      alert("Invalid format. Use: Date, Description, Account, Category, Amount, Type (Debit/Credit)");
    }
  };

  const handleGenerateAI = async () => {
    setIsAnalyzing(true);
    setActiveTab('ai');
    const analysis = await getFinancialAnalysis(statements);
    setAiAnalysis(analysis || "No analysis generated.");
    setIsAnalyzing(false);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    let ws;
    let fileName = `FinReport_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;

    switch (activeTab) {
      case 'transactions':
        ws = XLSX.utils.json_to_sheet(transactions);
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        break;
      case 'trial-balance':
        ws = XLSX.utils.json_to_sheet(statements.trialBalance);
        XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
        break;
      case 'income':
        const isData = [
          ["Income Statement"],
          ["Revenue"],
          ...statements.incomeStatement.revenue.map(i => [i.label, i.amount]),
          ["Total Revenue", statements.incomeStatement.totalRevenue],
          [""],
          ["Expenses"],
          ...statements.incomeStatement.expenses.map(i => [i.label, i.amount]),
          ["Total Expenses", statements.incomeStatement.totalExpenses],
          [""],
          ["Net Income", statements.incomeStatement.netIncome]
        ];
        ws = XLSX.utils.aoa_to_sheet(isData);
        XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
        break;
      case 'balance-sheet':
        const bsData = [
          ["Balance Sheet"],
          ["Assets"],
          ...statements.balanceSheet.assets.map(i => [i.label, i.amount]),
          ["Total Assets", statements.balanceSheet.totalAssets],
          [""],
          ["Liabilities"],
          ...statements.balanceSheet.liabilities.map(i => [i.label, i.amount]),
          ["Total Liabilities", statements.balanceSheet.totalLiabilities],
          [""],
          ["Equity"],
          ...statements.balanceSheet.equity.map(i => [i.label, i.amount]),
          ["Total Equity", statements.balanceSheet.totalEquity],
          [""],
          ["Total L&E", statements.balanceSheet.totalLiabilities + statements.balanceSheet.totalEquity]
        ];
        ws = XLSX.utils.aoa_to_sheet(bsData);
        XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
        break;
      case 'cashflow':
        const cfData = [
          ["Cash Flow Statement"],
          ["Operating Activities"],
          ...statements.cashFlow.operating.map(i => [i.label, i.amount]),
          [""],
          ["Investing Activities"],
          ...statements.cashFlow.investing.map(i => [i.label, i.amount]),
          [""],
          ["Financing Activities"],
          ...statements.cashFlow.financing.map(i => [i.label, i.amount]),
          [""],
          ["Net Cash Flow", statements.cashFlow.netCashFlow]
        ];
        ws = XLSX.utils.aoa_to_sheet(cfData);
        XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
        break;
      case 'reconciliation':
        const reconData = reconMatches.map(m => ({
          Book_Description: m.bookEntry?.description || '',
          Book_Date: m.bookEntry?.date || '',
          Book_Amount: m.bookEntry?.amount || '',
          Bank_Description: m.statementEntry?.description || '',
          Bank_Date: m.statementEntry?.date || '',
          Bank_Amount: m.statementEntry?.amount || '',
          Status: m.status
        }));
        ws = XLSX.utils.json_to_sheet(reconData);
        XLSX.utils.book_append_sheet(wb, ws, "Reconciliation");
        break;
      case 'trend':
        ws = XLSX.utils.json_to_sheet(trendData);
        XLSX.utils.book_append_sheet(wb, ws, "Trends");
        break;
      default:
        // Default to exporting all transactions if on dashboard or AI
        ws = XLSX.utils.json_to_sheet(transactions);
        XLSX.utils.book_append_sheet(wb, ws, "Full Ledger");
        fileName = `FinReport_FullLedger_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    XLSX.writeFile(wb, fileName);
  };

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <DollarSign size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FinReport Pro</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <p className="px-4 py-2 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Main</p>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'transactions' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <ArrowRightLeft size={18} /> General Ledger
          </button>

          <p className="px-4 py-2 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Reports</p>
          <button onClick={() => setActiveTab('trial-balance')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'trial-balance' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Table size={18} /> Trial Balance
          </button>
          <button onClick={() => setActiveTab('income')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <FileText size={18} /> Income Statement
          </button>
          <button onClick={() => setActiveTab('balance-sheet')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'balance-sheet' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Scale size={18} /> Balance Sheet
          </button>
          <button onClick={() => setActiveTab('cashflow')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'cashflow' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Activity size={18} /> Cash Flow
          </button>

          <p className="px-4 py-2 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-widest">Analysis & Tools</p>
          <button onClick={() => setActiveTab('reconciliation')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'reconciliation' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <RotateCcw size={18} /> Bank Reconciliation
          </button>
          <button onClick={() => setActiveTab('variance')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'variance' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <BarChart3 size={18} /> Variance Analysis
          </button>
          <button onClick={() => setActiveTab('trend')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'trend' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <TrendingUp size={18} /> Trend Analysis
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <button onClick={handleGenerateAI} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-slate-800'}`}>
              <BrainCircuit size={20} /> AI CFO Insights
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white h-16 border-b flex items-center justify-between px-8 sticky top-0 z-10 shrink-0">
          <h2 className="text-xl font-semibold text-slate-800 capitalize">
            {activeTab.replace('-', ' ')}
          </h2>
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium border">
              <Upload size={16} /> Import
            </button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-medium border shadow-sm">
              <FileSpreadsheet size={16} className="text-emerald-600" /> Export Excel
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm">
              <Download size={16} /> Export PDF
            </button>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Income</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(statements.incomeStatement.netIncome)}</p>
                  <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${statements.incomeStatement.netIncome > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <TrendingUp size={12} /> {(statements.incomeStatement.netIncome / statements.incomeStatement.totalRevenue * 100).toFixed(1)}% Net Margin
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Assets</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(statements.balanceSheet.totalAssets)}</p>
                  <div className="text-[10px] text-slate-400 mt-2">Inventory & Liquid Cash</div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Cash Position</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{formatCurrency(statements.balanceSheet.assets.find(a => a.label === 'Cash')?.amount || 0)}</p>
                  <div className="text-[10px] text-emerald-500 mt-2">High Liquidity</div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Trend Strength</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">Strong</p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
                  <h3 className="text-md font-bold text-slate-800 mb-6">Revenue Performance (Budget vs Actual)</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Revenue', actual: statements.variance.revenueActual, budget: statements.variance.revenueBudget },
                        { name: 'Expenses', actual: statements.variance.expenseActual, budget: statements.variance.expenseBudget }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                   <h3 className="text-md font-bold text-slate-800 mb-6">Asset Composition</h3>
                   <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={statements.balanceSheet.assets} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={5} 
                          dataKey="amount" 
                          nameKey="label"
                          labelLine={true}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {statements.balanceSheet.assets.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions */}
          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
               <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search entries..." className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-emerald-500 outline-none w-64" />
                  </div>
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Account</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500 font-mono">{tx.date}</td>
                        <td className="px-6 py-4 font-medium">{tx.description}</td>
                        <td className="px-6 py-4">{tx.accountName}</td>
                        <td className="px-6 py-4 font-bold">{formatCurrency(tx.amount)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${tx.type === TransactionType.DEBIT ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
                            {tx.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
          )}

          {/* Balance Sheet */}
          {activeTab === 'balance-sheet' && (
            <div className="max-w-4xl mx-auto bg-white p-12 rounded-xl border shadow-lg space-y-10">
              <div className="text-center">
                <h1 className="text-3xl font-extrabold text-slate-900">Statement of Financial Position</h1>
                <p className="text-slate-500 font-medium mt-1">As of October 31, 2023</p>
              </div>

              <div className="grid grid-cols-1 gap-10">
                {/* Assets */}
                <section>
                  <h2 className="text-lg font-black text-slate-900 border-b-2 border-slate-900 pb-2 mb-4 uppercase tracking-tighter">Assets</h2>
                  <div className="space-y-3">
                    {statements.balanceSheet.assets.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="font-medium">{item.label}</span>
                        <span className="font-mono text-sm border-b border-dotted grow mx-4 h-4"></span>
                        <span className="font-bold">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 text-slate-900">
                      <span className="font-black uppercase tracking-tight">Total Assets</span>
                      <span className="text-xl font-black border-t-2 border-slate-900 pt-1 border-double decoration-4 underline">
                        {formatCurrency(statements.balanceSheet.totalAssets)}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-10">
                  {/* Liabilities */}
                  <section>
                    <h2 className="text-lg font-black text-slate-900 border-b-2 border-slate-900 pb-2 mb-4 uppercase tracking-tighter">Liabilities</h2>
                    <div className="space-y-2">
                      {statements.balanceSheet.liabilities.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-slate-700">
                          <span>{item.label}</span>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      {statements.balanceSheet.liabilities.length === 0 && <p className="text-xs text-slate-400 italic">No recorded liabilities.</p>}
                      <div className="flex justify-between items-center pt-4 text-slate-900 border-t border-slate-200 mt-2">
                        <span className="font-bold">Total Liabilities</span>
                        <span className="font-black">{formatCurrency(statements.balanceSheet.totalLiabilities)}</span>
                      </div>
                    </div>
                  </section>

                  {/* Equity */}
                  <section>
                    <h2 className="text-lg font-black text-slate-900 border-b-2 border-slate-900 pb-2 mb-4 uppercase tracking-tighter">Equity</h2>
                    <div className="space-y-2">
                      {statements.balanceSheet.equity.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-slate-700">
                          <span>{item.label}</span>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-4 text-slate-900 border-t border-slate-200 mt-2">
                        <span className="font-bold">Total Equity</span>
                        <span className="font-black">{formatCurrency(statements.balanceSheet.totalEquity)}</span>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="bg-slate-50 p-6 rounded-lg border-2 border-slate-200">
                   <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 uppercase">Total Liabilities & Equity</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatCurrency(statements.balanceSheet.totalLiabilities + statements.balanceSheet.totalEquity)}
                      </span>
                   </div>
                   {Math.abs(statements.balanceSheet.totalAssets - (statements.balanceSheet.totalLiabilities + statements.balanceSheet.totalEquity)) < 0.01 && (
                     <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-bold mt-2 uppercase">
                        <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse"></div>
                        Statement is Balanced
                     </div>
                   )}
                </section>
              </div>
            </div>
          )}

          {/* Bank Reconciliation */}
          {activeTab === 'reconciliation' && (
            <div className="space-y-6">
               <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex items-start gap-4">
                  <RotateCcw className="text-blue-500 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">Monthly Bank Reconciliation</h3>
                    <p className="text-sm text-blue-700">Matching internal ledger (Book) against bank statement records. Unmatched items require investigation.</p>
                  </div>
               </div>

               <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                      <tr>
                        <th className="px-6 py-4">Book Records</th>
                        <th className="px-6 py-4">Statement Records</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {reconMatches.map((match, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            {match.bookEntry ? (
                              <div>
                                <p className="font-medium">{match.bookEntry.description}</p>
                                <p className="text-xs text-slate-400">{match.bookEntry.date} • {formatCurrency(match.bookEntry.amount)}</p>
                              </div>
                            ) : <span className="text-slate-300 italic">Not in books</span>}
                          </td>
                          <td className="px-6 py-4">
                            {match.statementEntry ? (
                              <div>
                                <p className="font-medium">{match.statementEntry.description}</p>
                                <p className="text-xs text-slate-400">{match.statementEntry.date} • {formatCurrency(Math.abs(match.statementEntry.amount))}</p>
                              </div>
                            ) : <span className="text-slate-300 italic">Not in statement</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              match.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {match.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* Variance Analysis */}
          {activeTab === 'variance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Revenue Variance */}
                <div className="bg-white p-8 rounded-2xl border shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-emerald-500" size={20} /> Revenue Variance
                  </h3>
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Actual</p>
                      <p className="text-3xl font-black text-slate-900">{formatCurrency(statements.variance.revenueActual)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Budget</p>
                      <p className="text-xl font-bold text-slate-400">{formatCurrency(statements.variance.revenueBudget)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-500">Dollar Variance</span>
                        <span className={statements.variance.revenueActual >= statements.variance.revenueBudget ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(statements.variance.revenueActual - statements.variance.revenueBudget)}
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-500">Percentage</span>
                        <span className={statements.variance.revenueActual >= statements.variance.revenueBudget ? 'text-emerald-600' : 'text-rose-600'}>
                          {((statements.variance.revenueActual / statements.variance.revenueBudget - 1) * 100).toFixed(1)}%
                        </span>
                     </div>
                     <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-6">
                        <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (statements.variance.revenueActual / statements.variance.revenueBudget) * 100)}%` }}></div>
                     </div>
                  </div>
                </div>

                {/* Expense Variance */}
                <div className="bg-white p-8 rounded-2xl border shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="text-rose-500" size={20} /> Expense Variance
                  </h3>
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Actual</p>
                      <p className="text-3xl font-black text-slate-900">{formatCurrency(statements.variance.expenseActual)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Budget</p>
                      <p className="text-xl font-bold text-slate-400">{formatCurrency(statements.variance.expenseBudget)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-500">Dollar Variance</span>
                        <span className={statements.variance.expenseActual <= statements.variance.expenseBudget ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(statements.variance.expenseBudget - statements.variance.expenseActual)}
                        </span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-500">Percentage Savings</span>
                        <span className={statements.variance.expenseActual <= statements.variance.expenseBudget ? 'text-emerald-600' : 'text-rose-600'}>
                          {((1 - statements.variance.expenseActual / statements.variance.expenseBudget) * 100).toFixed(1)}%
                        </span>
                     </div>
                     <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-6">
                        <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, (statements.variance.expenseActual / statements.variance.expenseBudget) * 100)}%` }}></div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trend Analysis */}
          {activeTab === 'trend' && (
            <div className="space-y-8">
               <div className="bg-white p-8 rounded-2xl border shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-10">Historical Performance Trend</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                        <Legend />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                     <p className="text-emerald-800 text-xs font-bold uppercase">Peak Revenue Month</p>
                     <p className="text-2xl font-black text-emerald-900 mt-2">September</p>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                     <p className="text-blue-800 text-xs font-bold uppercase">Avg. Monthly Profit</p>
                     <p className="text-2xl font-black text-blue-900 mt-2">{formatCurrency(trendData.reduce((s, i) => s + i.profit, 0) / 12)}</p>
                  </div>
                  <div className="bg-violet-50 p-6 rounded-xl border border-violet-100">
                     <p className="text-violet-800 text-xs font-bold uppercase">CAGR Estimation</p>
                     <p className="text-2xl font-black text-violet-900 mt-2">+15.2%</p>
                  </div>
               </div>
            </div>
          )}

          {/* AI Insights */}
          {activeTab === 'ai' && (
             <div className="max-w-4xl mx-auto space-y-6">
             <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-10 rounded-3xl text-white shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-10">
                 <BrainCircuit size={200} />
               </div>
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                     <BrainCircuit size={40} className="text-indigo-400" />
                   </div>
                   <div>
                     <h3 className="text-3xl font-black tracking-tight">AI CFO Assistant</h3>
                     <p className="text-indigo-200 font-medium">Hyper-intelligent Analysis by Gemini 3.0</p>
                   </div>
                 </div>
                 {!aiAnalysis && !isAnalyzing && (
                   <button 
                     onClick={handleGenerateAI}
                     className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-400 transition-all flex items-center gap-3 shadow-lg shadow-indigo-500/50 group"
                   >
                     Initialize Market Intelligence <ArrowRightLeft className="group-hover:translate-x-1 transition-transform" />
                   </button>
                 )}
                 {isAnalyzing && (
                   <div className="flex items-center gap-4 text-xl font-bold italic animate-pulse">
                     <div className="h-6 w-6 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
                     Parsing ledger patterns & calculating risk vectors...
                   </div>
                 )}
               </div>
             </div>

             {aiAnalysis && (
               <div className="bg-white p-12 rounded-3xl border shadow-xl leading-relaxed max-w-none relative">
                 <div className="flex items-center gap-3 text-slate-400 mb-8 border-b border-slate-100 pb-6 uppercase text-[10px] font-black tracking-widest">
                   <AlertCircle size={16} />
                   <span>Financial Intelligence Briefing • Confidential</span>
                 </div>
                 <div className="whitespace-pre-wrap text-slate-800 text-lg font-medium selection:bg-indigo-100">
                   {aiAnalysis}
                 </div>
               </div>
             )}
           </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-2xl font-black text-slate-900">Import Ledger Data</h3>
              <button onClick={() => setShowImportModal(false)} className="bg-white p-2 rounded-full border shadow-sm hover:text-rose-500 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-2xl flex gap-4">
                <AlertCircle className="text-emerald-600 shrink-0" size={24} />
                <div className="text-xs text-emerald-900">
                  <p className="font-black mb-1">CSV INGESTION FORMAT</p>
                  <code className="bg-white/60 px-2 py-1 rounded block mt-2 border border-emerald-200 font-mono">Date, Description, Account, Category, Amount, Type</code>
                  <p className="mt-3 opacity-70 italic font-medium">Ensure accounts for "Cash" or "Bank" are mapped for Reconciliation features.</p>
                </div>
              </div>
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your records here..."
                className="w-full h-72 p-6 border-2 rounded-2xl font-mono text-sm focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all bg-slate-50"
              />
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => setShowImportModal(false)} className="px-8 py-3 rounded-xl text-slate-500 hover:bg-slate-100 font-bold transition-all">Cancel</button>
                <button onClick={handleImport} className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-black shadow-xl transition-all active:scale-95">Verify & Commit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
