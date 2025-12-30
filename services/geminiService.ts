
import { GoogleGenAI } from "@google/genai";
import { FinancialStatements } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getFinancialAnalysis = async (statements: FinancialStatements) => {
  const prompt = `
    As a world-class CFO, analyze the following financial statements and provide a high-level strategic report.
    Highlight key performance indicators, cash flow health, equity movements, and critical risks.
    
    Data Summary:
    Income Statement: 
    - Net Income: ${statements.incomeStatement.netIncome}
    - Revenue: ${statements.incomeStatement.totalRevenue}
    - Expenses: ${statements.incomeStatement.totalExpenses}
    
    Balance Sheet & Equity:
    - Total Assets: ${statements.balanceSheet.totalAssets}
    - Total Equity: ${statements.balanceSheet.totalEquity}
    - Equity Components: ${JSON.stringify(statements.equityChanges)}
    
    Cash Flow: 
    - Operating Activities: ${statements.cashFlow.operating.reduce((s, i) => s + i.amount, 0)}
    - Net Change in Cash: ${statements.cashFlow.netCashFlow}
    
    Budget Variance:
    - Revenue Variance: ${statements.variance.revenueActual - statements.variance.revenueBudget}
    - Expense Variance: ${statements.variance.expenseBudget - statements.variance.expenseActual}
    
    Please structure your response with:
    1. Executive Summary (Strategic Outlook)
    2. Profitability & Growth Analysis
    3. Equity & Financial Position (Comment on capital adequacy based on Changes in Equity)
    4. Liquidity & Cash Sustainability
    5. Strategic Recommendations & Risk Mitigation
    
    Tone: Professional, authoritative, and forward-looking.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate AI analysis. Please verify your data and try again.";
  }
};
