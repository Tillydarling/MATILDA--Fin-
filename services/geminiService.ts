
import { GoogleGenAI } from "@google/genai";
import { FinancialStatements } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getFinancialAnalysis = async (statements: FinancialStatements) => {
  const prompt = `
    As a world-class CFO, analyze the following financial statements and provide a concise professional report.
    Highlight key performance indicators, cash flow health, and specific areas for improvement.
    
    Data:
    Income Statement: Net Income: ${statements.incomeStatement.netIncome}
    Total Revenue: ${statements.incomeStatement.revenue.reduce((s, i) => s + i.amount, 0)}
    Total Expenses: ${statements.incomeStatement.expenses.reduce((s, i) => s + i.amount, 0)}
    
    Cash Flow: Net Cash Flow: ${statements.cashFlow.netCashFlow}
    Operating: ${statements.cashFlow.operating.reduce((s, i) => s + i.amount, 0)}
    Investing: ${statements.cashFlow.investing.reduce((s, i) => s + i.amount, 0)}
    Financing: ${statements.cashFlow.financing.reduce((s, i) => s + i.amount, 0)}
    
    Please structure your response with:
    1. Executive Summary
    2. Profitability Analysis
    3. Liquidity & Cash Position
    4. Strategic Recommendations
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to generate AI analysis. Please check your network or API configuration.";
  }
};
