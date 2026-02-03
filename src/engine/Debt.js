export class Debt {
  constructor({
    id,
    name,
    principal,

    interestType,   // daily | weekly | monthly | yearly | oneTime | friendly
    interestMode,   // fixed | percentage (daily only)
    interestValue,  // ₹ per day OR % per day OR ₹ one-time
    interestRate,   // monthly/yearly %

    plan,
    emiAmount,

    startDate,
    endDate,
  }) {
    this.id = id;
    this.name = name;

    this.initialPrincipal = Number(principal || 0);
    this.principal = Number(principal || 0);

    this.interestType = interestType || 'monthly';
    this.interestMode = interestMode || null;
    this.interestValue = Number(interestValue || 0);
    this.interestRate = Number(interestRate || 0);

    this.plan = plan || 'custom';
    this.emiAmount = Number(emiAmount || 0);

    this.startDate = startDate ? new Date(startDate) : new Date();
    this.endDate = endDate ? new Date(endDate) : null;
    this.lastPaymentDate = new Date(this.startDate);

    this.interestPaid = 0;
    this.payments = [];
  }

  /* ==================== HELPERS ==================== */

  _daysInclusive(d1, d2) {
    const ONE_DAY = 1000 * 60 * 60 * 24;
    const start = new Date(d1);
    const end = new Date(d2);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.floor((end - start) / ONE_DAY) + 1;
  }

  _daysBetween(d1, d2) {
    return Math.max(
      0,
      Math.floor((new Date(d2) - new Date(d1)) / 86400000)
    );
  }

  isOverdue() {
    if (!this.endDate || this.principal <= 0) return false;
  
    const today = new Date();
    today.setHours(0,0,0,0);
  
    const end = new Date(this.endDate);
    end.setHours(23,59,59,999); // inclusive end day
  
    return today > end;
  }  

  /* ==================== CORE CALCULATIONS ==================== */

  calculateRepaymentAtEnd() {
    // ONE-TIME INTEREST (flat amount)
    if (this.interestType === 'oneTime') {
      return Math.round(
        this.initialPrincipal + Math.max(0, this.interestValue)
      );
    }
  
    // FRIENDLY (no interest)
    if (this.interestType === 'friendly') {
      return Math.round(this.initialPrincipal);
    }
  
    if (!this.endDate || this.endDate <= this.startDate) {
      return Math.round(this.initialPrincipal);
    }
  
    const days = this._daysInclusive(this.startDate, this.endDate);
    let interest = 0;
  
    // DAILY
    if (this.interestType === 'daily') {
      if (this.interestMode === 'fixed') {
        interest = this.interestValue * days;
      } else if (this.interestMode === 'percentage') {
        interest =
          (this.initialPrincipal * this.interestValue * days) / 100;
      }
    }
  
    // MONTHLY
    else if (this.interestType === 'monthly') {
      interest =
        this.initialPrincipal *
        this.interestRate *
        (days / 30.44);
    }
  
    // YEARLY
    else if (this.interestType === 'yearly') {
      interest =
        this.initialPrincipal *
        (this.interestRate / 365) *
        days;
    }
  
    return Math.round(this.initialPrincipal + Math.max(0, interest));
  }
  

  _interestForPeriod(periods = 1) {
    if (this.interestType === 'daily') {
      if (this.interestMode === 'percentage') {
        return (this.principal * this.interestValue * periods) / 100;
      }
      if (this.interestMode === 'fixed') {
        return this.interestValue * periods;
      }
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
    if (!amount || amount <= 0) return;

    const payDate = new Date(date);

    const periods =
      this.interestType === 'daily'
        ? this._daysBetween(this.lastPaymentDate, payDate)
        : Math.max(
            1,
            this._daysBetween(this.lastPaymentDate, payDate) / 30.44
          );

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

  expectedIntervalDays() {
    if (this.interestType === 'daily') return 1;
    if (this.plan === 'emiWeekly') return 7;
    return 30;
  }

  predictPayoff(fromDate = new Date()) {
    let tempPrincipal = this.principal;
    let date = new Date(fromDate);
    let totalInterest = this.interestPaid;
    let guard = 0;
    const interval = this.expectedIntervalDays();

    while (tempPrincipal > 0.01 && guard++ < 1200) {
      const interest = this._interestForPeriod(interval);

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
        tempPrincipal -= Math.max(0, this.emiAmount - interest);
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
    const repaymentAtEnd = this.calculateRepaymentAtEnd();

    return {
      id: this.id,
      name: this.name,

      startDate: this.startDate,
      endDate: this.endDate,

      initialPrincipal: this.initialPrincipal,
      pendingPrincipal: Math.round(this.principal),

      repaymentAtEnd,
      interestPayable: Math.max(
        0,
        repaymentAtEnd - this.initialPrincipal
      ),

      interestType: this.interestType,
      interestMode: this.interestMode,
      interestValue: this.interestValue,

      payoffDate: payoff.payoffDate,
      neverCloses: payoff.neverCloses || false,
      overdue: this.isOverdue(),
    };
  }

  /* ==================== PERSISTENCE ==================== */

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      principal: this.principal,
      initialPrincipal: this.initialPrincipal,

      interestType: this.interestType,
      interestMode: this.interestMode,
      interestValue: this.interestValue,
      interestRate: this.interestRate,

      plan: this.plan,
      emiAmount: this.emiAmount,

      startDate: this.startDate.toISOString(),
      endDate: this.endDate ? this.endDate.toISOString() : null,
      lastPaymentDate: this.lastPaymentDate.toISOString(),

      interestPaid: this.interestPaid,
      payments: this.payments.map((p) => ({
        amount: p.amount,
        date: p.date.toISOString(),
      })),
    };
  }

  static fromJSON(raw) {
    const d = new Debt(raw);
    d.lastPaymentDate = new Date(raw.lastPaymentDate);
    d.interestPaid = raw.interestPaid || 0;

    if (raw.payments) {
      raw.payments.forEach((p) =>
        d.payments.push({
          amount: p.amount,
          date: new Date(p.date),
        })
      );
    }

    return d;
  }
}
