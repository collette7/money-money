import { createClient } from "@/lib/supabase/server";

interface CategorizeResult {
  categoryId: string;
  method: "rule" | "learned" | "default" | "manual";
  confidence?: number;
  setIgnored?: boolean | null;
  setMerchantName?: string | null;
  setTags?: string[] | null;
}

type TransactionInput = {
  merchant_name: string | null;
  description: string;
  amount: number;
  account_id: string;
};

type RuleCondition = {
  field: string;
  operator: string;
  value: string;
  value_end?: string | null;
};

type RuleRow = {
  id: string;
  category_id: string;
  field: string;
  operator: string;
  value: string;
  value_end: string | null;
  conditions: RuleCondition[];
  set_ignored: boolean | null;
  set_merchant_name: string | null;
  set_tags: string[] | null;
};

type MappingRow = {
  merchant_pattern: string;
  category_id: string;
  confidence: number;
};

type DefaultCategoryRow = {
  id: string;
  name: string;
};

export interface PrefetchedData {
  rules: RuleRow[];
  mappings: MappingRow[];
  defaultCategories: DefaultCategoryRow[];
  categoryTypes: Map<string, string>;
}

/**
 * Prefetch all data needed for categorization in a single batch.
 * Call once before processing multiple transactions.
 * 4 parallel queries → cached in memory for all subsequent matches.
 */
export async function prefetchCategorizationData(
  userId: string
): Promise<PrefetchedData> {
  const supabase = await createClient();

  const [rulesResult, mappingsResult, defaultCatsResult, allCatsResult] =
    await Promise.all([
      supabase
        .from("category_rules")
        .select("id, category_id, field, operator, value, value_end, conditions, set_ignored, set_merchant_name, set_tags")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("priority", { ascending: true }),
      supabase
        .from("merchant_mappings")
        .select("merchant_pattern, category_id, confidence")
        .eq("user_id", userId)
        .gte("confidence", 0.8)
        .order("confidence", { ascending: false }),
      supabase
        .from("categories")
        .select("id, name")
        .is("user_id", null),
      supabase
        .from("categories")
        .select("id, type")
        .or(`user_id.eq.${userId},user_id.is.null`),
    ]);

  const categoryTypes = new Map<string, string>();
  for (const cat of allCatsResult.data ?? []) {
    if (cat.type) categoryTypes.set(cat.id, cat.type);
  }

  return {
    rules: rulesResult.data ?? [],
    mappings: mappingsResult.data ?? [],
    defaultCategories: defaultCatsResult.data ?? [],
    categoryTypes,
  };
}

/**
 * Categorize a single transaction using prefetched data (zero DB calls).
 */
export function categorizeTransactionWithCache(
  transaction: TransactionInput,
  cache: PrefetchedData
): CategorizeResult | null {
  const byRule = matchUserRuleCached(transaction, cache.rules);
  if (byRule) {
    return {
      categoryId: byRule.categoryId,
      method: byRule.method,
      confidence: byRule.confidence,
      setIgnored: byRule.rule.set_ignored,
      setMerchantName: byRule.rule.set_merchant_name,
      setTags: byRule.rule.set_tags,
    };
  }

  const byLearned = matchLearnedPatternCached(transaction, cache.mappings);
  if (byLearned) return byLearned;

  const byDefault = matchDefaultCategoryCached(
    transaction,
    cache.defaultCategories
  );
  if (byDefault) return byDefault;

  return null;
}

/**
 * Original per-transaction categorize (backward-compatible).
 * Prefetches on each call — use categorizeTransactionWithCache for batches.
 */
export async function categorizeTransaction(
  userId: string,
  transaction: TransactionInput
): Promise<CategorizeResult | null> {
  const cache = await prefetchCategorizationData(userId);
  return categorizeTransactionWithCache(transaction, cache);
}

export type { RuleRow, RuleCondition };

function matchUserRuleCached(
  transaction: TransactionInput,
  rules: RuleRow[]
): (CategorizeResult & { rule: RuleRow }) | null {
  if (!rules.length) return null;

  for (const rule of rules) {
    const rawConditions = typeof rule.conditions === "string"
      ? JSON.parse(rule.conditions)
      : rule.conditions;
    const conditions: RuleCondition[] =
      Array.isArray(rawConditions) && rawConditions.length > 0
        ? rawConditions
        : [{ field: rule.field, operator: rule.operator, value: rule.value, value_end: rule.value_end }];

    const allMatch = conditions.every((cond) => {
      const fieldValue = getFieldValue(transaction, cond.field);
      if (fieldValue === null) return false;
      return matchesRule(fieldValue, cond.operator, cond.value, cond.value_end ?? null);
    });

    if (allMatch) {
      return { categoryId: rule.category_id, method: "rule", rule };
    }
  }

  return null;
}

function matchLearnedPatternCached(
  transaction: TransactionInput,
  mappings: MappingRow[]
): CategorizeResult | null {
  if (!transaction.merchant_name || !mappings.length) return null;

  const normalized = transaction.merchant_name.toLowerCase().trim();

  for (const mapping of mappings) {
    const pattern = mapping.merchant_pattern.toLowerCase();
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return {
        categoryId: mapping.category_id,
        method: "learned",
        confidence: mapping.confidence,
      };
    }
  }

  return null;
}

function amountMatchesHint(amount: number, hint: AmountHint | undefined): boolean {
  if (!hint || hint === "any") return true;
  if (hint === "positive") return amount >= 0;
  return amount < 0;
}

function matchDefaultCategoryCached(
  transaction: TransactionInput,
  defaultCategories: DefaultCategoryRow[]
): CategorizeResult | null {
  const text = (
    transaction.merchant_name ?? transaction.description ?? ""
  ).toLowerCase();

  if (!defaultCategories.length) return null;

  const match = DEFAULT_PATTERNS.find(
    (p) =>
      p.patterns.some((pattern) => text.includes(pattern)) &&
      amountMatchesHint(transaction.amount, p.amountHint)
  );

  if (match) {
    const category = defaultCategories.find(
      (c) => c.name.toLowerCase() === match.category.toLowerCase()
    );
    if (category) {
      return { categoryId: category.id, method: "default" };
    }
  }

  if (transaction.amount > 0) {
    const fallback = defaultCategories.find(
      (c) => c.name.toLowerCase() === POSITIVE_AMOUNT_FALLBACK.toLowerCase()
    );
    if (fallback) {
      return { categoryId: fallback.id, method: "default", confidence: 0.5 };
    }
  }

  return null;
}

function getFieldValue(
  transaction: TransactionInput,
  field: string
): string | null {
  switch (field) {
    case "merchant_name":
      return transaction.merchant_name ?? transaction.description;
    case "description":
      return transaction.description ?? transaction.merchant_name;
    case "amount":
      return Math.abs(transaction.amount).toString();
    case "account_id":
      return transaction.account_id;
    default:
      return null;
  }
}

function matchesRule(
  fieldValue: string,
  operator: string,
  value: string,
  valueEnd: string | null
): boolean {
  const lower = fieldValue.toLowerCase();
  const target = value.toLowerCase();

  switch (operator) {
    case "contains":
      return lower.includes(target);
    case "equals":
      return lower === target;
    case "starts_with":
      return lower.startsWith(target);
    case "greater_than":
      return parseFloat(fieldValue) > parseFloat(value);
    case "less_than":
      return parseFloat(fieldValue) < parseFloat(value);
    case "between": {
      const num = parseFloat(fieldValue);
      return num >= parseFloat(value) && num <= parseFloat(valueEnd ?? value);
    }
    default:
      return false;
  }
}

export async function learnFromOverride(
  userId: string,
  merchantName: string,
  categoryId: string
) {
  const supabase = await createClient();
  const normalized = merchantName.toLowerCase().trim();

  const { data: existing } = await supabase
    .from("merchant_mappings")
    .select("id, times_confirmed, confidence")
    .eq("user_id", userId)
    .eq("merchant_pattern", normalized)
    .single();

  if (existing) {
    const newConfidence = Math.min(
      1.0,
      existing.confidence + 0.1 * (1 - existing.confidence)
    );
    await supabase
      .from("merchant_mappings")
      .update({
        category_id: categoryId,
        confidence: newConfidence,
        times_confirmed: existing.times_confirmed + 1,
        last_updated: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
  } else {
    await supabase.from("merchant_mappings").insert({
      user_id: userId,
      merchant_pattern: normalized,
      category_id: categoryId,
      confidence: 0.6,
      times_confirmed: 1,
    });
  }
}

export async function bulkCategorize(userId: string, accountId?: string) {
  const supabase = await createClient();

  const { data: userAccounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId);
  const userAccountIds = (userAccounts ?? []).map((a) => a.id);
  if (userAccountIds.length === 0) return { categorized: 0 };

  let query = supabase
    .from("transactions")
    .select("id, merchant_name, description, amount, account_id")
    .in("account_id", userAccountIds)
    .is("category_id", null)
    .order("date", { ascending: false })
    .limit(500);

  if (accountId) {
    query = query.eq("account_id", accountId);
  }

  const { data: uncategorized } = await query;
  if (!uncategorized?.length) return { categorized: 0 };

  const cache = await prefetchCategorizationData(userId);

  const updates: Array<{
    id: string;
    category_id: string;
    categorized_by: string;
    type: string | null;
    set_ignored: boolean | null;
    set_merchant_name: string | null;
    set_tags: string[] | null;
  }> = [];

  for (const tx of uncategorized) {
    const result = categorizeTransactionWithCache(tx, cache);
    if (result) {
      updates.push({
        id: tx.id,
        category_id: result.categoryId,
        categorized_by: result.method,
        type: cache.categoryTypes.get(result.categoryId) ?? null,
        set_ignored: result.setIgnored ?? null,
        set_merchant_name: result.setMerchantName ?? null,
        set_tags: result.setTags ?? null,
      });
    }
  }

  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50);
    await Promise.all(
      chunk.map((u) => {
        const isRuleMatch = u.categorized_by === "rule";
        const payload: Record<string, unknown> = {
          category_id: u.category_id,
          categorized_by: u.categorized_by,
          type: u.type,
          category_confirmed: isRuleMatch,
          review_flagged: !isRuleMatch,
        };
        if (isRuleMatch) payload.review_flagged_reason = null;
        if (u.set_ignored !== null) payload.ignored = u.set_ignored;
        if (u.set_merchant_name !== null) payload.merchant_name = u.set_merchant_name;
        if (u.set_tags !== null) payload.tags = u.set_tags;
        return supabase.from("transactions").update(payload).eq("id", u.id).in("account_id", userAccountIds);
      })
    );
  }

  return { categorized: updates.length, total: uncategorized.length };
}

type AmountHint = "negative" | "positive" | "any";

const DEFAULT_PATTERNS: { category: string; patterns: string[]; amountHint?: AmountHint }[] = [
  // Expense categories — expect negative amounts (money going out)
  { category: "Groceries & Food Staples", amountHint: "negative", patterns: ["walmart", "kroger", "safeway", "wholefds", "whole foods", "trader joe", "aldi", "costco", "publix", "heb", "wegmans", "sprouts", "sams club"] },
  { category: "Entertainment & Going Out", amountHint: "negative", patterns: ["mcdonald", "starbucks", "chipotle", "domino", "pizza", "burger", "subway", "dunkin", "panera", "chick-fil", "taco bell", "wendy", "grubhub", "doordash", "uber eat", "postmates", "opentable", "resy", "tock", "ticketmaster", "stubhub", "fandango", "amc", "alamo drafthouse"] },
  { category: "Transport", amountHint: "negative", patterns: ["uber", "lyft", "parking", "toll", "transit", "metro", "taxi", "shell", "exxon", "chevron", "bp ", "speedway", "wawa", "circle k", "marathon", "valero", "sunoco", "gas", "geico", "progressive", "txtag", "ezpass", "sunpass"] },
  { category: "Subscriptions", amountHint: "negative", patterns: ["netflix", "hulu", "disney", "spotify", "apple music", "youtube", "hbo", "paramount", "peacock", "apple one", "icloud", "subscription", "membership", "amazon prime"] },
  { category: "Shopping & Indulgence", amountHint: "negative", patterns: ["amazon", "target", "bestbuy", "best buy", "ebay", "macys", "nordstrom", "zara", "h&m", "nike", "adidas", "wayfair", "crate and barrel", "west elm", "uniqlo", "asos"] },
  { category: "Housing", amountHint: "negative", patterns: ["rent", "mortgage", "lease", "property mgmt", "hoa", "electric", "power", "water", "gas co", "utility", "comcast", "xfinity", "att", "verizon", "t-mobile", "spectrum", "internet"] },
  { category: "Healthcare & Insurance", amountHint: "negative", patterns: ["pharmacy", "cvs", "walgreens", "rite aid", "doctor", "medical", "hospital", "dental", "clinic", "labcorp", "cigna", "aetna", "bcbs", "united health", "optum", "insurance", "state farm", "allstate", "usaa"] },
  { category: "Fitness & Wellness", amountHint: "negative", patterns: ["gym", "fitness", "planet fitness", "orange theory", "equinox", "la fitness", "peloton", "classpass", "lululemon"] },
  { category: "Personal Care & Beauty", amountHint: "negative", patterns: ["salon", "barber", "spa", "beauty", "nail", "haircut", "sephora", "ulta", "drybar"] },
  { category: "Education & Tools", amountHint: "negative", patterns: ["tuition", "university", "college", "school", "udemy", "coursera", "skillshare", "masterclass", "linkedin learning", "audible", "kindle"] },
  { category: "Travel & Experiences", amountHint: "negative", patterns: ["airline", "hotel", "airbnb", "vrbo", "expedia", "booking.com", "southwest", "delta", "united", "american air", "marriott", "hilton", "hyatt", "hertz", "enterprise", "turo", "kayak"] },
  { category: "Business Operations", amountHint: "negative", patterns: ["notion", "slack", "zoom", "google workspace", "gsuite", "dropbox", "aws", "digitalocean", "shopify", "stripe", "quickbooks", "freshbooks"] },
  { category: "Creative Work", amountHint: "negative", patterns: ["adobe", "figma", "sketch", "splice", "plugin boutique", "reverb", "sweetwater", "b&h", "adorama", "squarespace", "webflow"] },
  { category: "Hobbies", amountHint: "negative", patterns: ["michaels", "joann", "blick art", "guitar center", "musicians friend", "discogs", "steam", "gamestop"] },
  { category: "Gifts & Celebrations", amountHint: "negative", patterns: ["etsy", "1-800-flowers", "teleflora", "edible arrangements", "zola", "hallmark", "eventbrite"] },
  { category: "Donations & Giving", amountHint: "negative", patterns: ["gofundme", "givebutter", "network for good", "every.org", "church", "tithe", "charity"] },
  { category: "Debt & Loans", amountHint: "negative", patterns: ["sallie mae", "navient", "nelnet", "sofi", "epayment", "autopay", "payment thank you", "synchrony"] },
  { category: "Financial Health", amountHint: "negative", patterns: ["vanguard", "fidelity", "schwab", "robinhood", "coinbase", "etrade", "td ameri", "wealthfront", "betterment", "acorns"] },
  { category: "Legal & Admin", amountHint: "negative", patterns: ["legalzoom", "rocket lawyer", "notary", "irs", "dmv", "turbotax", "h&r block", "taxact"] },
  { category: "Family Support", amountHint: "negative", patterns: ["care.com", "brightwheel"] },
  { category: "Recreation", amountHint: "negative", patterns: ["national park", "state park", "alltrails", "golftec", "top golf"] },
  // Income categories — expect positive amounts (money coming in)
  { category: "Paycheck", amountHint: "positive", patterns: ["payroll", "direct dep", "salary", "wage", "ach credit", "paycheck"] },
  { category: "Income", amountHint: "positive", patterns: ["income", "revenue", "dividend", "royalty"] },
  { category: "Interest", amountHint: "positive", patterns: ["interest", "apy", "yield", "savings interest"] },
  { category: "Reimbursement", amountHint: "positive", patterns: ["reimbursement", "reimburse", "refund", "cashback", "rebate"] },
  // Transfer categories — can go either direction
  { category: "Transfer", amountHint: "any", patterns: ["transfer", "xfer", "wire", "zelle", "venmo", "cash app"] },
  { category: "Credit Card Payment", amountHint: "negative", patterns: ["card payment", "credit card"] },
  { category: "Savings Transfer", amountHint: "any", patterns: ["savings", "save", "deposit to savings", "round up"] },
];

const POSITIVE_AMOUNT_FALLBACK = "Income";
