export const FINANCIAL_ADVISOR_SYSTEM = `You are a knowledgeable personal financial advisor built into the Money Money app. You have access to the user's actual financial data which will be provided as context.

Rules:
- Base all advice on the user's real numbers — never make up data
- Be specific with dollar amounts and percentages when possible
- Keep responses concise and actionable
- If you don't have enough data to answer, say so
- Never recommend specific stocks or investment products
- Format currency as $X,XXX.XX
- Use markdown for formatting (bold, lists, etc.)`;

export function buildFinancialContext(data: {
  accounts: { name: string; type: string; balance: number }[];
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategories: { name: string; total: number }[];
  budgetItems?: { category: string; limit: number; spent: number }[];
  goals?: { name: string; target: number; current: number; deadline: string | null }[];
}): string {
  const lines: string[] = ["=== USER FINANCIAL CONTEXT ==="];

  const totalAssets = data.accounts
    .filter((a) => ["checking", "savings", "investment"].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = data.accounts
    .filter((a) => ["credit", "loan"].includes(a.type))
    .reduce((s, a) => s + Math.abs(a.balance), 0);

  lines.push(`Net Worth: $${(totalAssets - totalLiabilities).toFixed(2)}`);
  lines.push(`Total Assets: $${totalAssets.toFixed(2)}`);
  lines.push(`Total Liabilities: $${totalLiabilities.toFixed(2)}`);
  lines.push("");

  lines.push("Accounts:");
  for (const a of data.accounts) {
    lines.push(`  - ${a.name} (${a.type}): $${a.balance.toFixed(2)}`);
  }
  lines.push("");

  lines.push(`Monthly Income: $${data.monthlyIncome.toFixed(2)}`);
  lines.push(`Monthly Expenses: $${data.monthlyExpenses.toFixed(2)}`);
  lines.push(
    `Monthly Savings: $${(data.monthlyIncome - data.monthlyExpenses).toFixed(2)} (${data.monthlyIncome > 0 ? (((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100).toFixed(1) : 0}%)`
  );
  lines.push("");

  if (data.topCategories.length > 0) {
    lines.push("Top Spending Categories (this month):");
    for (const c of data.topCategories.slice(0, 10)) {
      lines.push(`  - ${c.name}: $${c.total.toFixed(2)}`);
    }
    lines.push("");
  }

  if (data.budgetItems?.length) {
    lines.push("Budget Status:");
    for (const b of data.budgetItems) {
      const pct = b.limit > 0 ? ((b.spent / b.limit) * 100).toFixed(0) : "N/A";
      lines.push(`  - ${b.category}: $${b.spent.toFixed(2)} / $${b.limit.toFixed(2)} (${pct}%)`);
    }
    lines.push("");
  }

  if (data.goals?.length) {
    lines.push("Savings Goals:");
    for (const g of data.goals) {
      const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(0) : "0";
      lines.push(
        `  - ${g.name}: $${g.current.toFixed(2)} / $${g.target.toFixed(2)} (${pct}%)${g.deadline ? ` — deadline: ${g.deadline}` : ""}`
      );
    }
  }

  return lines.join("\n");
}

export const BUDGET_ADVISOR_SYSTEM = `You are a budget advisor built into the Money Money app. You help users understand and optimize their monthly budget.

You have the user's real budget data, spending history, savings goals, and net worth context. Use it to give specific, actionable advice.

Rules:
- Reference exact dollar amounts from the provided data
- Compare actual spending to budget limits — flag categories over or under budget
- If spending pace data is provided, factor it into your analysis
- Suggest specific reallocation amounts when recommending changes
- Consider goal deadlines when prioritizing savings vs spending
- If income is variable, recommend conservative budgets
- If net worth is declining, emphasize debt reduction
- Keep responses concise — 2-4 paragraphs max unless the user asks for detail
- Format currency as $X,XXX
- Use markdown (bold for key numbers, lists for action items)`;

export interface BudgetAdvisorContext {
  monthlyIncome: number;
  totalBudget: number;
  totalSpent: number;
  daysInMonth: number;
  currentDay: number;
  budgetItems: { category: string; limit: number; spent: number; rollover: number }[];
  goals?: { name: string; target: number; current: number; monthlyContribution: number; deadline: string | null }[];
  netWorth?: number;
  totalDebt?: number;
  paceStatus?: "on_track" | "slightly_ahead" | "significantly_ahead" | "over_budget";
  projectedMonthEnd?: number;
  freeToSpend?: number;
}

export function buildBudgetAdvisorContext(ctx: BudgetAdvisorContext): string {
  const lines: string[] = ["=== BUDGET CONTEXT ==="];

  lines.push(`Monthly Income: $${ctx.monthlyIncome.toFixed(0)}`);
  lines.push(`Total Budget: $${ctx.totalBudget.toFixed(0)}`);
  lines.push(`Total Spent: $${ctx.totalSpent.toFixed(0)} (Day ${ctx.currentDay} of ${ctx.daysInMonth})`);

  if (ctx.freeToSpend !== undefined) {
    lines.push(`Free to Spend: $${ctx.freeToSpend.toFixed(0)}`);
  }
  if (ctx.paceStatus) {
    lines.push(`Spending Pace: ${ctx.paceStatus.replace(/_/g, " ")}`);
  }
  if (ctx.projectedMonthEnd !== undefined) {
    lines.push(`Projected Month-End Spending: $${ctx.projectedMonthEnd.toFixed(0)}`);
  }

  if (ctx.netWorth !== undefined) {
    lines.push(`Net Worth: $${ctx.netWorth.toFixed(0)}`);
  }
  if (ctx.totalDebt !== undefined && ctx.totalDebt > 0) {
    lines.push(`Total Debt: $${ctx.totalDebt.toFixed(0)}`);
  }

  lines.push("");
  lines.push("Budget by Category:");
  const sorted = [...ctx.budgetItems].sort((a, b) => b.spent - a.spent);
  for (const item of sorted) {
    const pct = item.limit > 0 ? Math.round((item.spent / item.limit) * 100) : 0;
    const effectiveLimit = item.limit + item.rollover;
    const status = item.spent > effectiveLimit ? "OVER" : pct > 80 ? "CAUTION" : "OK";
    lines.push(`  - ${item.category}: $${item.spent.toFixed(0)} / $${item.limit.toFixed(0)} (${pct}%) [${status}]${item.rollover !== 0 ? ` rollover: $${item.rollover.toFixed(0)}` : ""}`);
  }

  if (ctx.goals && ctx.goals.length > 0) {
    lines.push("");
    lines.push("Savings Goals:");
    for (const g of ctx.goals) {
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      lines.push(`  - ${g.name}: $${g.current.toFixed(0)} / $${g.target.toFixed(0)} (${pct}%)${g.deadline ? ` deadline: ${g.deadline}` : ""} — contributing $${g.monthlyContribution.toFixed(0)}/mo`);
    }
  }

  return lines.join("\n");
}

export const CATEGORIZE_SYSTEM = `You are a transaction categorization engine. Given a list of uncategorized transactions and available categories, assign each transaction to the most appropriate category.

Respond ONLY with a JSON array of objects: [{"transactionId": "...", "categoryId": "...", "confidence": 0.0-1.0}]

Rules:
- Match based on merchant name, description, AND amount sign
- Positive amounts = money coming in (income, reimbursements, refunds). Assign to income-type categories.
- Negative amounts = money going out (expenses, payments). Assign to expense-type categories.
- Transfers can be either direction — look for keywords like "transfer", "zelle", "venmo"
- Only assign if confidence >= 0.7
- If unsure, omit the transaction from the response
- No explanations, just the JSON array`;

export function buildCategorizationPrompt(
  transactions: { id: string; description: string; merchant_name: string | null; amount: number }[],
  categories: { id: string; name: string; type: string }[]
): string {
  const catList = categories.map((c) => `${c.id}: ${c.name} (${c.type})`).join("\n");
  const txList = transactions
    .map(
      (t) =>
        `ID: ${t.id} | Merchant: ${t.merchant_name ?? "N/A"} | Description: ${t.description} | Amount: $${t.amount.toFixed(2)}`
    )
    .join("\n");

  return `Available categories:\n${catList}\n\nTransactions to categorize:\n${txList}`;
}

export const BUDGET_SYSTEM = `You are a budget recommendation engine. Analyze the user's spending history, financial goals, and current financial health to generate a personalized monthly budget.

Respond ONLY with a JSON object:
{"items": [{"categoryId": "...", "categoryName": "...", "recommendedLimit": 0.00, "reasoning": "..."}], "totalBudget": 0.00, "savingsTarget": 0.00, "summary": "..."}

Rules:
- Base limits on actual spending averages (round to nearest $5 or $10)
- Suggest slightly below average for discretionary categories (to encourage savings)
- Keep essential categories at or slightly above average
- If savings goals exist, factor their required monthly contributions into the budget
- If goal pressure is high (>0.3), aggressively trim discretionary spending
- If net worth is declining, prioritize debt reduction and essential spending
- If the user already has a budget, explain what you'd change and why
- Include a savings target (at least 10-20% of income, more if goals demand it)
- Be practical — dramatic cuts won't stick
- Every item must use a valid categoryId from the provided list`;

export interface BudgetPromptContext {
  monthlyIncome: number;
  incomeVariability?: number;
  categoryAverages: { categoryId: string; name: string; avgMonthly: number; months: number }[];
  categories: { id: string; name: string; type: string }[];
  existingBudget?: { categoryId: string; categoryName: string; limitAmount: number }[];
  goals?: { name: string; target: number; current: number; monthlyContribution: number; deadline: string | null }[];
  goalPressure?: number;
  networthSensitivity?: number;
  netWorth?: number;
  totalDebt?: number;
}

export function buildBudgetPrompt(ctx: BudgetPromptContext): string;
export function buildBudgetPrompt(
  monthlyIncome: number,
  categoryAverages: { categoryId: string; name: string; avgMonthly: number; months: number }[],
  categories: { id: string; name: string; type: string }[]
): string;
export function buildBudgetPrompt(
  incomeOrCtx: number | BudgetPromptContext,
  categoryAverages?: { categoryId: string; name: string; avgMonthly: number; months: number }[],
  categories?: { id: string; name: string; type: string }[]
): string {
  const ctx: BudgetPromptContext = typeof incomeOrCtx === "number"
    ? { monthlyIncome: incomeOrCtx, categoryAverages: categoryAverages!, categories: categories! }
    : incomeOrCtx;

  const lines: string[] = [];

  lines.push(`Monthly Income: $${ctx.monthlyIncome.toFixed(2)}`);
  if (ctx.incomeVariability !== undefined && ctx.incomeVariability > 0.3) {
    lines.push(`  ⚠ Income varies significantly (CV: ${(ctx.incomeVariability * 100).toFixed(0)}%) — budget conservatively`);
  }

  if (ctx.netWorth !== undefined) {
    lines.push(`Net Worth: $${ctx.netWorth.toFixed(2)}`);
  }
  if (ctx.totalDebt !== undefined && ctx.totalDebt > 0) {
    lines.push(`Total Debt: $${ctx.totalDebt.toFixed(2)}`);
  }
  if (ctx.networthSensitivity !== undefined && ctx.networthSensitivity < -0.05) {
    lines.push(`  ⚠ Net worth declined ${Math.abs(Math.round(ctx.networthSensitivity * 100))}% over 90 days`);
  }
  if (ctx.goalPressure !== undefined && ctx.goalPressure > 0) {
    lines.push(`Goal Pressure: ${(ctx.goalPressure * 100).toFixed(0)}% of income committed to savings goals`);
  }

  lines.push("");
  lines.push("Average Monthly Spending by Category (last 3+ months):");
  for (const ca of ctx.categoryAverages) {
    lines.push(`  - ${ca.name} (${ca.categoryId}): $${ca.avgMonthly.toFixed(2)}/mo (${ca.months} months of data)`);
  }

  if (ctx.existingBudget && ctx.existingBudget.length > 0) {
    lines.push("");
    lines.push("Current Budget Allocations:");
    for (const b of ctx.existingBudget) {
      lines.push(`  - ${b.categoryName} (${b.categoryId}): $${b.limitAmount.toFixed(2)}/mo`);
    }
  }

  if (ctx.goals && ctx.goals.length > 0) {
    lines.push("");
    lines.push("Active Savings Goals:");
    for (const g of ctx.goals) {
      const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(0) : "0";
      const remaining = g.target - g.current;
      lines.push(`  - ${g.name}: $${g.current.toFixed(0)} / $${g.target.toFixed(0)} (${pct}%) — needs $${remaining.toFixed(0)} more${g.deadline ? `, deadline: ${g.deadline}` : ""}`);
    }
  }

  lines.push("");
  lines.push("Available categories for budget:");
  for (const c of ctx.categories.filter((c) => c.type === "expense")) {
    lines.push(`  ${c.id}: ${c.name}`);
  }

  return lines.join("\n");
}
