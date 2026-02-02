import { Debt } from './Debt.js';
import { Income } from './Income.js';
import { Expense } from './Expense.js';

export class FinanceEngine {
  constructor() {
    this.debts = [];
    this.incomes = [];
    this.expenses = [];
    this.idSeq = 1;
  }

  addDebt(data) {
    const d = new Debt({ id: this.idSeq++, ...data });
    this.debts.push(d);
    return d;
  }

  addIncome(inc) {
    this.incomes.push(inc);
  }

  addExpense(exp) {
    this.expenses.push(exp);
  }

  monthlyIncome() {
    return this.incomes.reduce((s, i) => s + i.monthlyValue(), 0);
  }

  monthlyExpense() {
    return this.expenses.reduce((s, e) => s + e.monthlyValue(), 0);
  }

  monthlyDebtPayment() {
    return this.debts.reduce((total, d) => {
      // Get the current summary which includes recent payments
      const s = d.summary();

      if (d.plan === 'oneTime') {
        // If it's a one-time payment, show the CURRENT amount needed
        // to close the debt (Remaining Principal + Projected Interest)
        return total + s.repaymentAtEnd;
      }

      // For standard EMI, return the monthly amount
      return total + (d.emiAmount || 0);
    }, 0);
  }

  totalDebt() {
    return this.debts.reduce((s, d) => s + d.principal, 0);
  }

  surplus() {
    return (
      this.monthlyIncome() - this.monthlyExpense() - this.monthlyDebtPayment()
    );
  }

  debtFreeDate() {
    const dates = this.debts
      .map((d) => d.predictPayoff().payoffDate)
      .filter(Boolean);
    return dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null;
  }

  dashboard() {
    return {
      totalDebt: Math.round(this.totalDebt()),
      monthlyIncome: Math.round(this.monthlyIncome()),
      monthlyExpense: Math.round(this.monthlyExpense()),
      monthlyDebtPayment: Math.round(this.monthlyDebtPayment()),
      surplus: Math.round(this.surplus()),
      debtFreeDate: this.debtFreeDate(),
      debtBreakdown: this.debts.map((d) => d.summary()),
    };
  }

  toJSON() {
    return {
      idSeq: this.idSeq,
      debts: this.debts.map((d) => d.toJSON()),
      incomes: this.incomes.map((i) => i.toJSON()),
      expenses: this.expenses.map((e) => e.toJSON()),
    };
  }

  static fromJSON(raw) {
    const engine = new FinanceEngine();
    engine.idSeq = raw.idSeq;

    raw.debts.forEach((d) => engine.debts.push(Debt.fromJSON(d)));
    raw.incomes.forEach((i) => engine.incomes.push(Income.fromJSON(i)));
    raw.expenses.forEach((e) => engine.expenses.push(Expense.fromJSON(e)));

    return engine;
  }

  getPayoffSuggestions() {
    if (this.debts.length === 0) return null;

    // Clone debts to avoid modifying the original list
    const activeDebts = this.debts.filter((d) => d.principal > 0);

    if (activeDebts.length === 0) return null;

    // 1. Avalanche: Highest Interest Rate first (Saves the most money)
    const avalanche = [...activeDebts].sort(
      (a, b) => b.interestRate - a.interestRate
    )[0];

    // 2. Snowball: Smallest Balance first (Quickest EMI reduction/win)
    const snowball = [...activeDebts].sort(
      (a, b) => a.principal - b.principal
    )[0];

    return { avalanche, snowball };
  }
}
