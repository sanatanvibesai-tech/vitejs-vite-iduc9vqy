export class Debt {
  constructor({
    id,
    name,
    principal,
    interestRate,
    interestType, // daily | monthly | yearly
    plan, // emiDaily | emiWeekly | emiMonthly | interestOnly | oneTime
    emiAmount,
    startDate,
    endDate, // Added for Daily repayment calculation
  }) {
    this.id = id;
    this.name = name;
    this.initialPrincipal = principal;
    this.principal = principal;
    this.interestRate = interestRate;
    this.interestType = interestType || 'monthly'; // Default to monthly
    this.plan = plan;
    this.emiAmount = emiAmount || 0;
    this.startDate = new Date(startDate);
    this.endDate = endDate ? new Date(endDate) : null; // Store end date if provided
    this.lastPaymentDate = new Date(startDate);
    this.interestPaid = 0;
    this.payments = [];
  }

  // Helper to get exact days between two dates
  _daysBetween(d1, d2) {
    const diff = new Date(d2) - new Date(d1);
    return Math.max(0, Math.floor(diff / 86400000));
  }

  calculateRepaymentAtEnd() {
    // If no end date, there is no "end" to calculate for
    if (!this.endDate || this.endDate <= this.startDate)
      return this.initialPrincipal;

    const days = this._daysBetween(this.startDate, this.endDate);
    let interest = 0;

    // Logic for daily/monthly/yearly projection
    if (this.interestType === 'daily') {
      interest = this.principal * this.interestRate * days;
    } else if (this.interestType === 'monthly') {
      // Standardize month to 30.44 days
      interest = this.initialPrincipal * this.interestRate * (days / 30.44);
    } else if (this.interestType === 'yearly') {
      interest = this.initialPrincipal * (this.interestRate / 365) * days;
    }

    return this.initialPrincipal + interest;
  }

  // Calculates interest accrued based on the interest type for a given period
  _interestForPeriod(periods = 1) {
    if (this.interestType === 'daily') {
      return this.principal * this.interestRate * periods;
    }
    if (this.interestType === 'monthly') {
      return this.principal * this.interestRate * periods;
    }
    if (this.interestType === 'yearly') {
      return this.principal * (this.interestRate / 365) * periods;
    }
    return 0;
  }

  applyPayment(amount, date = new Date()) {
    if (this.principal <= 0 && amount <= 0) return;

    const payDate = new Date(date);
    let periods = 1;

    if (this.interestType === 'daily' || this.interestType === 'yearly') {
      periods = this._daysBetween(this.lastPaymentDate, payDate);
    } else {
      periods = Math.max(
        1,
        this._daysBetween(this.lastPaymentDate, payDate) / 30.44
      );
    }

    const interest = this._interestForPeriod(periods);
    this.interestPaid += interest;

    let remaining = amount;
    if (remaining >= interest) {
      remaining -= interest;
      this.principal = Math.max(0, this.principal - remaining);
    } else {
      this.principal += interest - remaining;
    }

    this.lastPaymentDate = payDate;
    this.payments.push({ amount, date: payDate });
  }

  // Inside your Debt class in engine/Debt.js
  expectedIntervalDays() {
    // If interestType is daily, we assume the plan is daily payments
    if (this.plan === 'emiDaily' || this.interestType === 'daily') return 1;
    if (this.plan === 'emiWeekly') return 7;
    return 30; // Default monthly
  }

  predictPayoff(fromDate = new Date()) {
    let tempPrincipal = this.principal;
    let date = new Date(fromDate);
    let totalInterest = this.interestPaid;
    let guard = 0;
    const interval = this.expectedIntervalDays();

    while (tempPrincipal > 0.01 && guard++ < 1200) {
      let interest = 0;
      if (this.interestType === 'daily') {
        interest = tempPrincipal * this.interestRate * interval;
      } else if (this.interestType === 'monthly') {
        interest = tempPrincipal * this.interestRate * (interval / 30.44);
      } else if (this.interestType === 'yearly') {
        interest = tempPrincipal * (this.interestRate / 365) * interval;
      }

      if (this.emiAmount <= interest && this.plan !== 'oneTime') {
        return {
          payoffDate: null,
          neverCloses: true,
          interestPaid: totalInterest,
        };
      }

      totalInterest += interest;

      if (this.plan === 'oneTime') {
        tempPrincipal += interest;
      } else {
        const principalPaid = Math.max(0, this.emiAmount - interest);
        tempPrincipal -= principalPaid;
      }
      date.setDate(date.getDate() + interval);
    }

    return {
      payoffDate: tempPrincipal <= 0.01 ? new Date(date) : null,
      interestPaid: totalInterest,
    };
  }

  summary() {
    const payoff = this.predictPayoff();

    // Use predicted interest if it's a standard EMI,
    // otherwise use the fixed maturity date calculation.
    const totalInterest =
      this.plan !== 'oneTime' && payoff.interestPaid > 0
        ? payoff.interestPaid
        : this.calculateRepaymentAtEnd() - this.initialPrincipal;

    return {
      id: this.id,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      repaymentAtEnd: this.initialPrincipal + totalInterest, // Dynamic total
      initialPrincipal: this.initialPrincipal,
      pendingPrincipal: Math.round(this.principal),
      interestPaid: Math.round(this.interestPaid),
      interestRate: this.interestRate,
      interestType: this.interestType,
      payoffDate: payoff.payoffDate,
      neverCloses: payoff.neverCloses || false,
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      initialPrincipal: this.initialPrincipal,
      principal: this.principal,
      interestRate: this.interestRate,
      interestType: this.interestType,
      plan: this.plan,
      emiAmount: this.emiAmount,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate ? this.endDate.toISOString() : null, // Added
      lastPaymentDate: this.lastPaymentDate.toISOString(),
      interestPaid: this.interestPaid,
      payments: this.payments.map((p) => ({
        amount: p.amount,
        date: p.date.toISOString(),
      })),
    };
  }

  static fromJSON(raw) {
    const d = new Debt({
      id: raw.id,
      name: raw.name,
      principal: raw.principal,
      interestRate: raw.interestRate,
      interestType: raw.interestType,
      plan: raw.plan,
      emiAmount: raw.emiAmount,
      startDate: raw.startDate,
      endDate: raw.endDate, // Added
    });

    d.initialPrincipal = raw.initialPrincipal;
    d.lastPaymentDate = new Date(raw.lastPaymentDate);
    d.interestPaid = raw.interestPaid;

    if (raw.payments) {
      raw.payments.forEach((p) =>
        d.payments.push({ amount: p.amount, date: new Date(p.date) })
      );
    }
    return d;
  }

  recalculateFromPayments() {
    this.principal = this.initialPrincipal;
    this.interestPaid = 0;
    this.lastPaymentDate = new Date(this.startDate);
    const savedPayments = [...this.payments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    this.payments = [];
    savedPayments.forEach((p) => this.applyPayment(p.amount, p.date));
  }

  deletePayment(index) {
    this.payments.splice(index, 1);
    this.recalculateFromPayments();
  }

  updatePayment(index, amount, date) {
    this.payments[index] = { amount, date: new Date(date) };
    this.recalculateFromPayments();
  }
}
