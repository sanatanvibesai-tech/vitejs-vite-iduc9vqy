// ------------------ DATA MODELS ------------------

export class Debt {
  constructor(opts) {
    this.id = opts.id;
    this.name = opts.name;
    this.principal = opts.principal;
    this.interestType = opts.interestType; // daily | monthly | yearly | none
    this.interestRate = opts.interestRate;
    this.plan = opts.plan; // interestOnly | emiWeekly | emiDaily | emiMonthly | oneTime
    this.emiAmount = opts.emiAmount;
    this.startDate = new Date(opts.startDate);
    this.endDate = opts.endDate ? new Date(opts.endDate) : null;
    this.payments = [];
  }

  calculateInterest(amount, diffDays) {
    switch (this.interestType) {
      case 'daily':
        return amount * this.interestRate * diffDays;
      case 'monthly':
        return amount * this.interestRate * (diffDays / 30);
      case 'yearly':
        return amount * this.interestRate * (diffDays / 365);
      default:
        return 0;
    }
  }

  diffSinceStartInDays(date) {
    return Math.floor(
      (date.getTime() - this.startDate.getTime()) / (1000 * 3600 * 24)
    );
  }

  getTotalPaid() {
    return this.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getPendingPrincipal() {
    let paidPrincipal = 0;

    for (const p of this.payments) {
      const interest = this.calculateInterest(
        this.principal - paidPrincipal,
        this.diffSinceStartInDays(p.date)
      );
      const principalPaid = Math.max(0, p.amount - interest);
      paidPrincipal += principalPaid;
    }

    return Math.max(0, this.principal - paidPrincipal);
  }

  payEMI(amount, date = new Date()) {
    this.payments.push({ amount, date: new Date(date) });
  }

  getNextEMIDate() {
    if (this.plan === 'oneTime') return null;
    if (this.payments.length === 0) return this.startDate;

    const last = this.payments[this.payments.length - 1].date;

    if (this.plan === 'emiMonthly' || this.plan === 'interestOnly') {
      return new Date(last.getFullYear(), last.getMonth() + 1, last.getDate());
    }
    if (this.plan === 'emiWeekly') {
      return new Date(last.getTime() + 7 * 86400000);
    }
    if (this.plan === 'emiDaily') {
      return new Date(last.getTime() + 86400000);
    }
    return null;
  }

  predictPayoff(fromDate = new Date()) {
    let principalLeft = this.getPendingPrincipal();
    let date = new Date(fromDate);
    let schedule = [];
    let guard = 0;

    if (this.plan === 'oneTime') {
      const interest = this.calculateInterest(
        principalLeft,
        this.diffSinceStartInDays(fromDate)
      );
      return {
        debtFreeDate: fromDate,
        schedule: [{ date, principalLeft: 0, interest }],
      };
    }

    while (principalLeft > 0 && guard++ < 1000) {
      let interest = 0;
      let principalPaid = 0;

      if (this.plan === 'emiMonthly') {
        interest = this.calculateInterest(principalLeft, 30);
        principalPaid = Math.max(0, this.emiAmount - interest);
        principalLeft -= principalPaid;
        date.setMonth(date.getMonth() + 1);
      }

      if (this.plan === 'emiWeekly') {
        interest = this.calculateInterest(principalLeft, 7);
        principalPaid = Math.max(0, this.emiAmount - interest);
        principalLeft -= principalPaid;
        date = new Date(date.getTime() + 7 * 86400000);
      }

      if (this.plan === 'emiDaily') {
        interest = this.calculateInterest(principalLeft, 1);
        principalPaid = Math.max(0, this.emiAmount - interest);
        principalLeft -= principalPaid;
        date = new Date(date.getTime() + 86400000);
      }

      if (this.plan === 'interestOnly') {
        interest = this.calculateInterest(principalLeft, 30);
        principalPaid = Math.max(0, this.emiAmount - interest);
        if (principalPaid <= 0) return { debtFreeDate: null, schedule };
        principalLeft -= principalPaid;
        date.setMonth(date.getMonth() + 1);
      }

      schedule.push({
        date: new Date(date),
        principalLeft: Math.max(0, principalLeft),
        interest,
      });
    }

    return {
      debtFreeDate: principalLeft <= 0 ? date : null,
      schedule,
    };
  }

  getSummary() {
    return {
      id: this.id,
      name: this.name,
      principal: this.principal,
      interestType: this.interestType,
      interestRate: this.interestRate,
      plan: this.plan,
      emiAmount: this.emiAmount,
      pendingPrincipal: this.getPendingPrincipal(),
      nextEMIDate: this.getNextEMIDate(),
      totalPaid: this.getTotalPaid(),
    };
  }
}

// ------------------ MANAGER ------------------

export class DebtManagementApp {
  constructor() {
    this.debts = [];
    this.idSeq = 1;
  }

  toJSON() {
    return {
      idSeq: this.idSeq,
      debts: this.debts.map((d) => ({
        ...d,
        startDate: d.startDate.toISOString(),
        endDate: d.endDate ? d.endDate.toISOString() : null,
        payments: d.payments.map((p) => ({
          amount: p.amount,
          date: p.date.toISOString(),
        })),
      })),
    };
  }

  static fromJSON(data) {
    const app = new DebtManagementApp();
    app.idSeq = data.idSeq;

    data.debts.forEach((raw) => {
      const debt = new Debt({
        id: raw.id,
        name: raw.name,
        principal: raw.principal,
        interestType: raw.interestType,
        interestRate: raw.interestRate,
        plan: raw.plan,
        emiAmount: raw.emiAmount,
        startDate: raw.startDate,
        endDate: raw.endDate,
      });

      raw.payments.forEach((p) =>
        debt.payments.push({ amount: p.amount, date: new Date(p.date) })
      );

      app.debts.push(debt);
    });

    return app;
  }

  addDebt(data) {
    const debt = new Debt({ id: this.idSeq++, ...data });
    this.debts.push(debt);
    return debt;
  }

  payDebtEMI(id, amount, date = new Date()) {
    const d = this.debts.find((x) => x.id === id);
    if (d) d.payEMI(amount, date);
  }

  getDashboard(months = [3, 6, 12]) {
    const now = new Date();
    const totalDebts = this.debts.reduce(
      (s, d) => s + d.getPendingPrincipal(),
      0
    );

    let debtFreeDates = this.debts
      .map((d) => d.predictPayoff(now).debtFreeDate)
      .filter(Boolean);

    return {
      totalDebts,
      overallDebtFreeDate:
        debtFreeDates.length > 0
          ? new Date(Math.max(...debtFreeDates.map((d) => d.getTime())))
          : null,
    };
  }

  listDebts() {
    return this.debts.map((d) => d.getSummary());
  }
}
