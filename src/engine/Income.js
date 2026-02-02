export class Income {
  constructor({ name, amount, frequency }) {
    this.name = name;
    this.amount = amount;
    this.frequency = frequency; // daily | weekly | monthly | oneTime
  }

  monthlyValue() {
    if (this.frequency === 'daily') return this.amount * 30;
    if (this.frequency === 'weekly') return this.amount * 4;
    if (this.frequency === 'monthly') return this.amount;
    return 0;
  }

  toJSON() {
    return {
      name: this.name,
      amount: this.amount,
      frequency: this.frequency,
    };
  }

  static fromJSON(raw) {
    return new Income(raw);
  }
}
