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

export const BUDGET_SYSTEM = `You are a budget recommendation engine. Analyze the user's spending history and generate a recommended monthly budget.

Respond ONLY with a JSON object: {"items": [{"categoryId": "...", "categoryName": "...", "recommendedLimit": 0.00, "reasoning": "..."}], "totalBudget": 0.00, "savingsTarget": 0.00, "summary": "..."}

Rules:
- Base limits on actual spending averages (round to nearest $5 or $10)
- Suggest slightly below average for discretionary categories (to encourage savings)
- Keep essential categories at or slightly above average
- Include a savings target (at least 10-20% of income if possible)
- Be practical — dramatic cuts won't stick`;

export function buildBudgetPrompt(
  monthlyIncome: number,
  categoryAverages: { categoryId: string; name: string; avgMonthly: number; months: number }[],
  categories: { id: string; name: string; type: string }[]
): string {
  const lines = [`Monthly Income: $${monthlyIncome.toFixed(2)}`, "", "Average Monthly Spending by Category (last 3+ months):"];

  for (const ca of categoryAverages) {
    lines.push(`  - ${ca.name} (${ca.categoryId}): $${ca.avgMonthly.toFixed(2)}/mo (${ca.months} months of data)`);
  }

  lines.push("");
  lines.push("Available categories for budget:");
  for (const c of categories.filter((c) => c.type === "expense")) {
    lines.push(`  ${c.id}: ${c.name}`);
  }

  return lines.join("\n");
}
