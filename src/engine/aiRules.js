/* ============================================================
   RULE-BASED FINANCE INTELLIGENCE
   ============================================================ */

   export function runFinanceRules(engine) {
    const debts = engine.debts.map(d => d.summary());
    const totalIncome = engine.incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = engine.expenses.reduce((s, e) => s + e.monthlyValue(), 0);
    const totalEmi = engine.debts.reduce((s, d) => s + (d.emiAmount || 0), 0);
  
    // Calculate Total Principal for the Debt Timeline logic
    const totalDebt = engine.debts.reduce((s, d) => s + Math.max(0, d.principal), 0);
    const surplus = totalIncome - totalExpenses - totalEmi;
  
    const overdueDebts = debts.filter(d => d.overdue);
    const highInterestDebts = debts
      .filter(d => d.interestPayable > d.initialPrincipal * 0.3)
      .sort((a, b) => b.interestPayable - a.interestPayable);
  
    const riskLevel = overdueDebts.length > 0 ? 'HIGH' : surplus < 0 ? 'MEDIUM' : 'LOW';
  
    return {
      summary: {
        totalIncome,
        totalExpenses,
        totalEmi,
        totalDebt, 
        surplus,
        riskLevel,
      },
      alerts: {
        overdueDebts: overdueDebts.map(d => ({
          name: d.name,
          amount: d.pendingPrincipal,
          endDate: d.endDate,
        })),
      },
      recommendations: {
        priorityDebt: highInterestDebts.length > 0 ? highInterestDebts[0].name : null,
        canTakeNewEmi: surplus > 0,
        safeEmiAmount: Math.max(0, surplus * 0.6),
      },
    };
  }
  
  /* ============================================================
     AI ADVISOR (WITH SAFE FALLBACK)
     ============================================================ */
  
  const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;
  
  export async function askAIFinanceAdvisor(question, rulesSummary) {
    if (!OPENAI_KEY) {
      return generateRuleOnlyAdvice(question, rulesSummary);
    }
  
    try {
      const systemPrompt = `
          You are a personal finance assistant.
          You MUST base all advice strictly on the provided financial snapshot.
          Use HTML tags like <b> and <br> for structure.
          Do NOT invent numbers.
      `;
  
      const userPrompt = `USER QUESTION: ${question} \n SNAPSHOT: ${JSON.stringify(rulesSummary, null, 2)}`;
  
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
  
      if (!res.ok) throw new Error('OpenAI request failed');
      const data = await res.json();
      return data.choices[0].message.content;
  
    } catch (err) {
      console.warn('AI failed, using rule-only fallback:', err);
      return generateRuleOnlyAdvice(question, rulesSummary);
    }
  }
  
  /* ============================================================
     RULE-ONLY ADVICE GENERATOR (HTML FORMAT)
     ============================================================ */
  
     function generateRuleOnlyAdvice(question, rules) {
      const { summary, alerts, recommendations } = rules;
      const q = question.toLowerCase();
      const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n || 0));
    
      let html = `<div style="text-align: left; line-height: 1.6;">`;
    
      // --- NEW LOGIC: Handle "Surplus over time" ---
      const monthMatch = q.match(/(\d+)\s*months?/); // Detects numbers like "4 months"
      if (q.includes('surplus') && monthMatch) {
        const months = parseInt(monthMatch[1]);
        const totalProjectedSurplus = summary.surplus * months;
        
        html += `
          <div style="margin-bottom: 12px; border-left: 4px solid #3498db; padding-left: 10px;">
            <strong>💰 Surplus Projection</strong><br>
            • In <b>${months} months</b>, your total accumulated surplus will be:<br>
            <span style="font-size: 1.2em; color: #2ecc71;"><b>₹${fmt(totalProjectedSurplus)}</b></span>
          </div>`;
      }
    
      // --- EXISTING LOGIC: Handle "Debt Timeline" ---
      if (q.includes('debt') && (q.includes('when') || q.includes('how long'))) {
        const months = summary.surplus > 0 
          ? Math.ceil(summary.totalDebt / summary.surplus) 
          : 'infinite';
        
        html += `
          <div style="margin-bottom: 12px;">
            <strong>📅 Debt Timeline</strong><br>
            • Total Debt: ₹${fmt(summary.totalDebt)}<br>
            • Debt-free in: <b>${months} months</b>
          </div>`;
      }
    
      // --- STANDARD OVERVIEW (The fallback you are currently seeing) ---
      html += `
        <div style="margin-bottom: 12px;">
          <strong>📊 Financial Snapshot</strong><br>
          • Risk Level: <span style="color: ${summary.riskLevel === 'HIGH' ? '#ff4d4d' : '#2ecc71'}">${summary.riskLevel}</span><br>
          • Monthly Surplus: ₹${fmt(summary.surplus)}
        </div>`;
    
      // ... (rest of your existing alerts and footer code)
      html += `</div>`;
      return html;
    }