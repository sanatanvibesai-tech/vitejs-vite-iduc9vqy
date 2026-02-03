export const ICONS = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    debts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
    income: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>`,
    expenses: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h18v16l-3-2-3 2-3-2-3 2-3-2-3 2V4z"></path></svg>`,
    payments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect></svg>`,
    history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`,
  };
  
  export function renderLayout() {
    document.querySelector('#app').innerHTML = `
    <div class="app">
      <header style="padding:20px;text-align:center;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:0 0 24px 24px;">
        <h1 style="color:#f8fafc;font-weight:800;">
          Equi<span style="color:#38bdf8;">Balance</span>
        </h1>
        <p style="color:#c7d2fe;font-size:13px;">Balance your debts. Control your future.</p>
      </header>
  
      <main>
        <section id="dashboard" class="tab-content"></section>
        <section id="debts" class="tab-content"></section>
        <section id="income" class="tab-content"></section>
        <section id="expenses" class="tab-content"></section>
        <section id="payments" class="tab-content"></section>
        <section id="debtDetail" class="tab-content"></section>
      </main>
  
      <nav class="tabs">
        <button class="tab" data-tab="dashboard">${ICONS.dashboard}Home</button>
        <button class="tab" data-tab="debts">${ICONS.debts}Debt</button>
        <button class="tab" data-tab="income">${ICONS.income}Income</button>
        <button class="tab" data-tab="expenses">${ICONS.expenses}Expense</button>
        <button class="tab" data-tab="payments">${ICONS.payments}Pay</button>
        <button class="tab" data-tab="debtDetail">${ICONS.history}History</button>
      </nav>
    </div>
    `;
  }
  