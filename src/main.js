import './style.css';
import { FinanceEngine } from './engine/FinanceEngine.js';
import { Income } from './engine/Income.js';
import { Expense } from './engine/Expense.js';
import { Debt } from './engine/Debt.js';

/* ==================== 1. STATE & STORAGE ==================== */
let activeChart = null;
let selectedDebtId = null;
let editingDebtId = null; // Track debt being edited
let editingPaymentIdx = null;
let editingIncomeIdx = null;
let editingExpenseIdx = null;

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);
const val = (id) => document.getElementById(id).value;
const num = (id) => Number(val(id));

const ICONS = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  debts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`,
  income: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
  expenses: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h18v16l-3-2-3 2-3-2-3 2-3-2-3 2V4z"></path><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="14" y2="14"></line></svg>`,
  payments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
};

const STORAGE_KEY = 'finance-engine-v1';
let engine = loadEngine();

function loadEngine() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return new FinanceEngine();
  try {
    return FinanceEngine.fromJSON(JSON.parse(raw));
  } catch {
    return new FinanceEngine();
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(engine.toJSON()));
}

/* ==================== 2. UI TEMPLATE ==================== */
document.querySelector('#app').innerHTML = `
<div class="app">
<header style="padding: 20px 0; text-align: center; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); margin-bottom: 20px; border-radius: 0 0 24px 24px;">
<h1 style="margin: 0; font-size: 24px; color: #f8fafc; font-weight: 800;">
  Equi<span style="color: #38bdf8;">Balance</span>
</h1>

<p style="
  margin: 6px 0 0;
  font-size: 13px;
  color: #c7d2fe;
  opacity: 0.9;
  font-weight: 500;
">
  Balance your debts. Control your future.
</p>
</header>


  <main>
    <section id="dashboard" class="tab-content">
       <div class="card primary"><p style="opacity:0.8; margin:0; font-size:11px; font-weight:700;">TOTAL DEBT</p><h2 id="dashTotal" style="margin:5px 0 0; font-size:32px;">₹0</h2></div>
       <div class="grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="card">
            <p style="color:var(--text-muted); margin:0; font-size:10px;">INCOME</p>
            <h3 id="dashInc" style="color:#10b981; font-size:16px;">₹0</h3>
          </div>

          <div class="card">
            <p style="color:var(--text-muted); margin:0; font-size:10px;">EXPENSES</p>
            <h3 id="dashExp" style="color:#f59e0b; font-size:16px;">₹0</h3>
          </div>

          <div class="card">
            <p style="color:var(--text-muted); margin:0; font-size:10px;">MONTHLY EMIs</p>
            <h3 id="dashEmi" style="color:#ef4444; font-size:16px;">₹0</h3>
          </div>

          <div class="card">
            <p style="color:var(--text-muted); margin:0; font-size:10px;">SURPLUS</p>
            <h3 id="dashSurplus" style="color:#10b981; font-size:16px;">₹0</h3>
          </div>
        </div>

       <div class="card">
         <div style="height: 220px; width: 100%; position: relative;"><canvas id="ctxChart"></canvas></div>
       </div>
    </section>

    <section id="debts" class="tab-content">
      <div class="card">
        <h2 id="debtFormTitle" style="font-size:1.1rem; margin-top:0;">
          Add Debt
        </h2>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <input id="debtName" placeholder="Debt Name" />
          <input id="debtAmount" type="number" placeholder="Principal ₹" />
        </div>


        <!-- INTEREST TYPE ROW -->
        <div
          id="interestRow"
          style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;"
        >
          <select id="interestType">
            <option value="">Select Interest Type</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="oneTime">One-Time</option>
            <option value="friendly">Friendly (No Interest)</option>
          </select>

          <!-- DAILY: interest mode -->
          <select id="dailyInterestMode" style="display:none;">
            <option value="">Interest Mode</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹ / day)</option>
          </select>

          <!-- ONE-TIME: interest amount -->
          <input
            id="oneTimeInterestValue"
            type="number"
            placeholder="Interest Amount ₹"
            style="display:none;"
          />
        </div>

        <!-- DAILY interest value (full width) -->
        <input
          id="dailyInterestValue"
          type="number"
          placeholder="Interest value"
          style="margin-top:8px; display:none;"
        />

        <!-- RATE % (monthly/yearly) -->
        <input
          id="debtRate"
          type="number"
          placeholder="Interest Rate %"
          style="margin-top:10px; display:none;"
        />

        <!-- EMI -->
        <input
          id="minEmi"
          type="number"
          placeholder="EMI Amount ₹"
          style="margin-top:10px; display:none;"
        />

        <!-- DATE RANGE -->
        <div
          id="dateRange"
          style="
            display:none;
            margin-top:10px;
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:10px;
          "
        >
          <div>
            <label style="font-size:11px;">Start Date</label>
            <input id="startDate" type="date" />
          </div>

          <div>
            <label style="font-size:11px;">End Date</label>
            <input id="endDate" type="date" />
          </div>
        </div>


        <!-- ACTIONS -->
        <button id="saveDebtBtn" style="margin-top:14px;">
          Save Debt Account
        </button>

        <button
          id="cancelDebtEdit"
          style="display:none; background:#ccc; margin-top:10px;"
        >
          Cancel Edit
        </button>
      </div>

      <!-- DEBT LIST -->
      <div id="debtList"></div>
    </section>


    <section id="income" class="tab-content">
       <div class="card">
         <h2 style="font-size:1.1rem; margin-top:0;">Income Sources</h2>
         <input id="incName" placeholder="Employer Name"><input id="incAmt" type="number" placeholder="Monthly ₹">
         <button id="saveIncBtn">Add Income</button>
       </div>
       <div id="incomeList"></div>
    </section>

    <section id="expenses" class="tab-content">
      <div class="card">
        <h2 style="font-size:1.1rem; margin-top:0;">Monthly Expenses</h2>

        <input id="expName" placeholder="Expense name (Rent, Grocery)">
        <input id="expAmt" type="number" placeholder="Amount ₹">

        <select id="expFreq">
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="daily">Daily</option>
        </select>

        <button id="saveExpBtn">Add Expense</button>
      </div>

      <div id="expenseList"></div>
    </section>

    <section id="payments" class="tab-content">
      <div class="card">
        <h2 id="payFormTitle" style="font-size:1.1rem; margin-top:0;">Record Payment</h2>
        <select id="payDebtSelect"></select>
        <input id="payAmt" type="number" placeholder="Amount Paid ₹">
        <input id="payDate" type="date" style="margin-top:10px;">
        <button id="payBtn">Submit Payment</button>
        <button id="cancelPayEdit" style="display:none; background:#ccc; margin-top:10px;">Cancel Edit</button>
      </div>
    </section>

    <section id="debtDetail" class="tab-content">
      <div class="card">
        <label style="font-size:11px; font-weight:700;">Select Account</label>
        <select id="detailSelect" style="width:100%; border:none; background:transparent; font-size:16px; font-weight:bold; outline:none;"></select>
      </div>
      <div class="card" style="padding:0; overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; font-size:10px; border-bottom:1px solid #eee;">
               <th style="padding:12px;">DATE</th>
               <th style="padding:12px;">PAID</th>
               <th style="padding:12px;">BAL.</th>
               <th style="padding:12px; text-align:right;">ACTION</th>
            </tr>
          </thead>
          <div id="historyBody"></div>
        </table>
      </div>
    </section>
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

/* ==================== 3. FUNCTIONS ==================== */

initDebtFormHelpers();

function switchTab(tabId) {
  document
    .querySelectorAll('.tab')
    .forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.tab === tabId)
    );
  document
    .querySelectorAll('.tab-content')
    .forEach((sec) => sec.classList.toggle('active', sec.id === tabId));
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'debts') renderDebts();
  if (tabId === 'income') renderIncome();
  if (tabId === 'expenses') renderExpenses();
  if (tabId === 'payments') renderPayments();
  if (tabId === 'debtDetail') renderDebtDetailTab();
}

document
  .querySelectorAll('.tab')
  .forEach((btn) => (btn.onclick = () => switchTab(btn.dataset.tab)));

  function renderDebts() {
    document.getElementById('debtList').innerHTML = engine.debts
      .map((d) => {
        const s = d.summary();
  
        const interestPayable =
          Math.max(0, s.repaymentAtEnd - s.initialPrincipal);
  
        const overdue = s.overdue;
  
        const overdueBadge = overdue
          ? `<span style="
              color:#dc2626;
              font-size:11px;
              font-weight:700;
              margin-left:6px;
            ">⚠ Overdue</span>`
          : '';
  
        const endDateText = s.endDate
          ? new Date(s.endDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—';
  
        return `
          <div class="card" style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:${overdue ? '#fee2e2' : 'var(--card)'};
            border:${overdue ? '1px solid #fca5a5' : '1px solid var(--border)'};
          ">
            <div>
              <b style="font-size:15px;">${d.name}</b>
              ${overdueBadge}
  
              <p style="margin:4px 0 0; font-size:11px; color:#475569;">
                End Date: <b>${endDateText}</b>
              </p>
  
              <p style="margin:2px 0 0; font-size:11px;">
                Interest:
                <b style="color:#dc2626;">
                  ₹${fmt(interestPayable)}
                </b>
              </p>
  
              <p style="margin:2px 0 0; font-size:11px; color:#475569;">
                Total Payable:
                <b>₹${fmt(s.repaymentAtEnd)}</b>
              </p>
            </div>
  
            <div style="display:flex; align-items:center; gap:12px;">
              <b style="
                font-size:15px;
                color:${overdue ? '#dc2626' : 'var(--brand)'};
              ">
                ₹${fmt(s.pendingPrincipal)}
              </b>
  
              <span
                onclick="editDebt(${d.id})"
                style="cursor:pointer; color:#4f46e5;">
                ✎
              </span>
  
              <span
                onclick="deleteDebt(${d.id})"
                style="cursor:pointer; color:#ef4444;">
                ✖
              </span>
            </div>
          </div>
        `;
      })
      .join('');
  }
  
  

  window.editDebt = (id) => {
    const debtId = Number(id);
    const d = engine.debts.find((x) => x.id === debtId);
    if (!d) return;
    if (d.interestType === 'oneTime') {
      document.getElementById('oneTimeInterestValue').value =
        d.interestValue || '';
    }
    
    editingDebtId = debtId;
  
    // Title + buttons
    document.getElementById('debtFormTitle').innerText = 'Edit Debt Account';
    document.getElementById('cancelDebtEdit').style.display = 'block';
  
    // Basic fields
    document.getElementById('debtName').value = d.name;
    document.getElementById('debtAmount').value = d.initialPrincipal;
  
    // 🔑 Interest Type FIRST
    const interestTypeEl = document.getElementById('interestType');
    interestTypeEl.value = d.interestType || '';
  
    // 🔑 FORCE helper to run (this is the missing piece)
    interestTypeEl.dispatchEvent(new Event('change'));
  
    // Daily interest
    if (d.interestType === 'daily') {
      document.getElementById('dailyInterestMode').value =
        d.interestMode || '';
      document.getElementById('dailyInterestValue').value =
        d.interestValue || '';
    }
  
    // Monthly / yearly
    if (d.interestType === 'monthly' || d.interestType === 'yearly') {
      document.getElementById('debtRate').value =
        d.interestRate ? d.interestRate * 100 : '';
      document.getElementById('minEmi').value = d.emiAmount || '';
    }
  
    // Dates
    if (d.startDate) {
      document.getElementById('startDate').value =
        new Date(d.startDate).toISOString().slice(0, 10);
    }
  
    if (d.endDate) {
      document.getElementById('endDate').value =
        new Date(d.endDate).toISOString().slice(0, 10);
    }
  
    // Scroll into view
    document.getElementById('debtFormTitle').scrollIntoView({
      behavior: 'smooth',
    });
  
    console.log('EDIT MODE ACTIVE:', editingDebtId);
  };
  

window.deleteDebt = (id) => {
  if (confirm('Delete this debt and all associated history?')) {
    engine.debts = engine.debts.filter((d) => d.id !== id);
    save();
    renderDebts();
  }
};

document.getElementById('cancelDebtEdit').onclick = () => {
  editingDebtId = null;
  document.getElementById('debtFormTitle').innerText = 'Add Debt';
  document.getElementById('cancelDebtEdit').style.display = 'none';
  ['debtName', 'debtAmount', 'debtRate', 'minEmi'].forEach(
    (id) => (document.getElementById(id).value = '')
  );
};

document.getElementById('saveDebtBtn').onclick = () => {
  const interestType = val('interestType');

  let interestMode = null;
  let interestValue = 0;
  let interestRate = 0;

  // DAILY
  if (interestType === 'daily') {
    interestMode = val('dailyInterestMode');
    interestValue = num('dailyInterestValue');
  }

  // ONE-TIME ✅ FIX
  if (interestType === 'oneTime') {
    interestValue = num('oneTimeInterestValue');
  }

  // MONTHLY / YEARLY
  if (interestType === 'monthly' || interestType === 'yearly') {
    interestRate = num('debtRate') / 100;
  }

  const debtData = {
    name: val('debtName'),
    principal: num('debtAmount'),

    interestType,
    interestMode,
    interestValue,
    interestRate,

    emiAmount: num('minEmi'),
    startDate: val('startDate'),
    endDate: val('endDate'),

    plan: 'custom',
  };

  if (editingDebtId !== null) {
    const idx = engine.debts.findIndex(d => d.id === editingDebtId);
    engine.debts[idx] = new Debt({ id: editingDebtId, ...debtData });
    editingDebtId = null;
  } else {
    engine.addDebt(debtData);
  }

  save();
  clearDebtForm();
  renderDebts();
  renderDashboard();
};

function clearDebtForm() {
  [
    'debtName',
    'debtAmount',
    'debtRate',
    'minEmi',
    'dailyInterestValue',
    'startDate',
    'endDate',
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('interestType').value = '';
  document.getElementById('dailyInterestMode').value = '';

  // 🔑 hide dynamic fields
  document.getElementById('dailyInterestMode').style.display = 'none';
  document.getElementById('dailyInterestValue').style.display = 'none';
  document.getElementById('dateRange').style.display = 'none';
  document.getElementById('minEmi').style.display = 'none';
  document.getElementById('debtRate').style.display = 'none';

  editingDebtId = null;
  document.getElementById('debtFormTitle').innerText = 'Add Debt';
  document.getElementById('cancelDebtEdit').style.display = 'none';
}



function initDebtFormHelpers() {
  const interestTypeEl = document.getElementById('interestType');
  const dailyModeEl = document.getElementById('dailyInterestMode');
  const dailyValueEl = document.getElementById('dailyInterestValue');
  const oneTimeValueEl = document.getElementById('oneTimeInterestValue');

  const dateRangeEl = document.getElementById('dateRange');
  const emiEl = document.getElementById('minEmi');
  const rateEl = document.getElementById('debtRate');

  interestTypeEl.onchange = () => {
    const type = interestTypeEl.value;

    // 🔁 RESET ALL
    dailyModeEl.style.display = 'none';
    dailyValueEl.style.display = 'none';
    oneTimeValueEl.style.display = 'none';
    dateRangeEl.style.display = 'none';
    emiEl.style.display = 'none';
    rateEl.style.display = 'none';

    dailyModeEl.value = '';
    dailyValueEl.value = '';
    oneTimeValueEl.value = '';

    // ✅ DAILY
    if (type === 'daily') {
      dailyModeEl.style.display = 'block';
      dailyValueEl.style.display = 'block';
      dateRangeEl.style.display = 'grid';
    }

    // ✅ ONE-TIME
    if (type === 'oneTime') {
      oneTimeValueEl.style.display = 'block';
      dateRangeEl.style.display = 'grid';
    }

    // ✅ MONTHLY / YEARLY / WEEKLY
    if (type === 'monthly' || type === 'yearly' || type === 'weekly') {
      rateEl.style.display = 'block';
      emiEl.style.display = 'block';
    }

    // ✅ FRIENDLY
    if (type === 'friendly') {
      dateRangeEl.style.display = 'grid';
    }
  };
}



function renderDashboard() {
  const income = engine.incomes.reduce((sum, i) => sum + (i.amount || 0), 0);

  const expenses = engine.expenses
    ? engine.expenses.reduce((sum, e) => sum + e.monthlyValue(), 0)
    : 0;

  const totalEmi = engine.debts.reduce((sum, d) => sum + (d.emiAmount || 0), 0);

  const surplus = income - expenses - totalEmi;

  const totalDebt = engine.debts.reduce(
    (sum, d) => sum + Math.max(0, d.principal),
    0
  );

  document.getElementById('dashTotal').innerText = `₹${fmt(totalDebt)}`;
  document.getElementById('dashInc').innerText = `₹${fmt(income)}`;
  document.getElementById('dashExp').innerText = `₹${fmt(expenses)}`;
  document.getElementById('dashEmi').innerText = `₹${fmt(totalEmi)}`;
  const surplusEl = document.getElementById('dashSurplus');
  surplusEl.innerText = `₹${fmt(surplus)}`;

  if (surplus > 0) {
    surplusEl.style.color = '#10b981'; // green
  } else if (surplus < 0) {
    surplusEl.style.color = '#ef4444'; // red
  } else {
    surplusEl.style.color = '#64748b'; // neutral gray
  }

  if (activeChart) activeChart.destroy();

  const ctx = document.getElementById('ctxChart').getContext('2d');
  activeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['EMI', 'Expenses', 'Surplus'],
      datasets: [
        {
          data: [totalEmi, expenses, Math.max(0, surplus)],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12 },
        },
      },
    },
  });
}

function renderIncome() {
  document.getElementById('incomeList').innerHTML = engine.incomes
    .map(
      (inc, idx) => `
      <div class="card" style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <b>${inc.name}</b>
          <p style="margin:0; font-size:11px; color:gray;">
            Monthly
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:12px;">
          <b style="color:#10b981;">₹${fmt(inc.amount)}</b>

          <span
            onclick="editIncome(${idx})"
            style="cursor:pointer; color:#4f46e5;">
            ✎
          </span>

          <span
            onclick="deleteIncome(${idx})"
            style="cursor:pointer; color:#ef4444;">
            ✖
          </span>
        </div>
      </div>
    `
    )
    .join('');
}

window.deleteIncome = (idx) => {
  if (confirm('Remove income?')) {
    engine.incomes.splice(idx, 1);
    save();
    renderIncome();
  }
};

window.editIncome = (idx) => {
  const inc = engine.incomes[idx];
  if (!inc) return;

  editingIncomeIdx = idx;

  document.getElementById('incName').value = inc.name;
  document.getElementById('incAmt').value = inc.amount;

  document.getElementById('saveIncBtn').innerText = 'Update Income';
};

function renderExpenses() {
  const list = document.getElementById('expenseList');
  if (!list) return;

  list.innerHTML = engine.expenses
    .map(
      (e, idx) => `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b>${e.name}</b>
          <p style="margin:0; font-size:11px; color:gray;">
            ${e.frequency} • ₹${fmt(e.amount)} / 
            ${
              e.frequency === 'weekly'
                ? 'week'
                : e.frequency === 'daily'
                ? 'day'
                : 'month'
            } 
            ${
              e.frequency === 'monthly'
                ? ''
                : `≈ ₹${fmt(e.monthlyValue())} / month`
            }
          </p>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span
            onclick="editExpense(${idx})"
            style="cursor:pointer; color:#4f46e5;">
            ✎
          </span>
          <span
            onclick="deleteExpense(${idx})"
            style="cursor:pointer; color:#ef4444;">
            ✖
          </span>
        </div>
      </div>
    `
    )
    .join('');
}

window.deleteExpense = (idx) => {
  if (confirm('Delete this expense?')) {
    engine.expenses.splice(idx, 1);
    save();
    renderExpenses();
    renderDashboard();
  }
};

window.editExpense = (idx) => {
  const e = engine.expenses[idx];
  if (!e) return;

  editingExpenseIdx = idx;

  document.getElementById('expName').value = e.name;
  document.getElementById('expAmt').value = e.amount;
  document.getElementById('expFreq').value = e.frequency;

  document.getElementById('saveExpBtn').innerText = 'Update Expense';
};

document.getElementById('saveIncBtn').onclick = () => {
  const name = val('incName');
  const amount = num('incAmt');

  if (!name || !amount) {
    alert('Enter income name and amount');
    return;
  }

  if (editingIncomeIdx !== null) {
    // EDIT
    engine.incomes[editingIncomeIdx].name = name;
    engine.incomes[editingIncomeIdx].amount = amount;

    editingIncomeIdx = null;
    document.getElementById('saveIncBtn').innerText = 'Add Income';
  } else {
    // ADD
    engine.addIncome(
      new Income({
        name,
        amount,
        frequency: 'monthly',
      })
    );
  }

  save();

  document.getElementById('incName').value = '';
  document.getElementById('incAmt').value = '';

  renderIncome();
  renderDashboard();
};

document.getElementById('saveExpBtn').onclick = () => {
  const name = val('expName');
  const amount = num('expAmt');
  const frequency = val('expFreq');

  if (!name || !amount) {
    alert('Enter expense name and amount');
    return;
  }

  if (editingExpenseIdx !== null) {
    // EDIT
    engine.expenses[editingExpenseIdx].name = name;
    engine.expenses[editingExpenseIdx].amount = amount;
    engine.expenses[editingExpenseIdx].frequency = frequency;

    editingExpenseIdx = null;
    document.getElementById('saveExpBtn').innerText = 'Add Expense';
  } else {
    // ADD
    engine.addExpense(new Expense({ name, amount, frequency }));
  }

  save();

  document.getElementById('expName').value = '';
  document.getElementById('expAmt').value = '';
  document.getElementById('expFreq').value = 'monthly';

  renderExpenses();
  renderDashboard();
};

function renderPayments() {
  document.getElementById('payDebtSelect').innerHTML = engine.debts
    .map((d) => `<option value="${d.id}">${d.name}</option>`)
    .join('');
}

document.getElementById('payBtn').onclick = () => {
  const debt = engine.debts.find((d) => d.id == val('payDebtSelect'));
  const amount = num('payAmt');
  const date = new Date(val('payDate') || new Date());

  if (!debt || !amount) return;

  debt.principal -= amount;

  if (!debt.payments) debt.payments = [];
  debt.payments.push({ id: Date.now(), date, amount });

  save();

  // 🔑 IMPORTANT
  selectedDebtId = debt.id;

  renderDashboard();
  switchTab('debtDetail');
};

function renderDebtDetailTab() {
  const sel = document.getElementById('detailSelect');
  sel.innerHTML =
    '<option value="">Choose Debt</option>' +
    engine.debts
      .map((d) => `<option value="${d.id}">${d.name}</option>`)
      .join('');
  if (selectedDebtId) {
    sel.value = selectedDebtId;
    updateHistoryTable();
  }
}

document.getElementById('detailSelect').onchange = (e) => {
  selectedDebtId = Number(e.target.value);
  updateHistoryTable();
};

function updateHistoryTable() {
  const debt = engine.debts.find((d) => d.id === selectedDebtId);
  if (!debt || !debt.payments) return;

  let runningBal =
    debt.principal + debt.payments.reduce((s, p) => s + p.amount, 0);

  document.getElementById('historyBody').innerHTML = debt.payments
    .map((p, idx) => {
      runningBal -= p.amount;

      return `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b>${new Date(p.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            })}</b>
            <p style="margin:0; font-size:11px; color:gray;">
              Paid ₹${fmt(p.amount)}
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:14px;">
            <b style="color:#2563eb;">₹${fmt(Math.max(0, runningBal))}</b>
            <span
              onclick="deletePayment(${debt.id}, ${idx})"
              style="cursor:pointer; color:#ef4444; font-size:18px;">
              ✖
            </span>
          </div>
        </div>
      `;
    })
    .join('');
}

window.deletePayment = (debtId, paymentIdx) => {
  if (!confirm('Remove payment record?')) return;

  const debt = engine.debts.find((d) => d.id === debtId);
  if (!debt || !debt.payments) return;

  const payment = debt.payments[paymentIdx];

  // 🔁 Restore principal
  debt.principal += payment.amount;

  // Remove payment
  debt.payments.splice(paymentIdx, 1);

  save();

  updateHistoryTable();
  renderDashboard();
};

switchTab('dashboard');
