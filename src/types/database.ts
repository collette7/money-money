export type AccountType = "checking" | "savings" | "credit" | "investment" | "loan";
export type CategoryType = "income" | "expense" | "transfer";
export type SyncMethod = "simplefin" | "manual";
export type CategorizedBy = "rule" | "learned" | "default" | "manual" | "ai";
export type TransactionStatus = "pending" | "cleared";
export type AssetLiabilityType = "asset" | "liability";
export type SplitType = "equal" | "custom" | "percentage";
export type SplitDirection = "owed_to_me" | "i_owe";
export type SettledMethod = "cash" | "venmo" | "zelle" | "other";
export type ContributionFrequency = "weekly" | "biweekly" | "monthly" | "custom";
export type GoalStatus = "active" | "paused" | "completed";
export type ContributionType = "scheduled" | "manual" | "extra";
export type SubscriptionFrequency = "monthly" | "yearly" | "weekly";
export type HoldingType =
  | "stock" | "etf" | "crypto" | "option" | "mutual_fund"
  | "real_estate" | "private_equity" | "vehicle" | "alternative" | "other";

export type MarketHoldingType = "stock" | "etf" | "crypto" | "option" | "mutual_fund";
export type ManualHoldingType = "real_estate" | "private_equity" | "vehicle" | "alternative" | "other";

export type HoldingSource = "manual" | "csv";
export type DocumentType = "will" | "trust" | "poa" | "healthcare_directive";
export type DocumentStatus = "draft" | "complete";
export type PartnerStatus = "pending" | "accepted" | "rejected";
export type RuleField = "merchant_name" | "description" | "amount" | "account_id";
export type RuleOperator = "contains" | "equals" | "starts_with" | "greater_than" | "less_than" | "between";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  institution_name: string;
  account_type: AccountType;
  asset_type: AssetLiabilityType | null;
  name: string;
  balance: number;
  opening_balance: number;
  currency: string;
  last_synced: string | null;
  sync_method: SyncMethod;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  type: CategoryType;
  created_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string;
  category_id: string | null;
  type: CategoryType | null;
  status: TransactionStatus;
  ignored: boolean;
  category_confirmed: boolean;
  review_flagged: boolean;
  category_confidence: number | null;
  recurring_id: string | null;
  to_account_id: string | null;
  tags: string[];
  is_recurring: boolean;
  merchant_name: string | null;
  original_description: string | null;
  notes: string | null;
  is_split: boolean;
  user_share_amount: number | null;
  categorized_by: CategorizedBy | null;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  person_id: string;
  amount: number;
  split_type: SplitType;
  direction: SplitDirection;
  is_settled: boolean;
  settled_date: string | null;
  settled_method: SettledMethod | null;
  notes: string | null;
  created_at: string;
}

export type BudgetMode = "independent" | "pooled" | "strict_pooled";
export type BudgetPeriod = "weekly" | "monthly" | "annual";

export interface Budget {
  id: string;
  user_id: string;
  month: number;
  year: number;
  mode: BudgetMode;
  period: BudgetPeriod;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  category_id: string;
  limit_amount: number;
  spent_amount: number;
  rollover_amount: number;
  is_override: boolean;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  contribution_amount: number;
  contribution_frequency: ContributionFrequency;
  custom_interval_days: number | null;
  linked_account_id: string | null;
  priority: number;
  status: GoalStatus;
  created_at: string;
  completed_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  next_charge_date: string;
  category_id: string | null;
  cancel_url: string | null;
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  account_id: string | null;
  asset_type: HoldingType;
  is_manual: boolean;
  symbol: string | null;
  name: string;
  shares: number | null;
  avg_cost: number | null;
  total_cost: number | null;
  purchase_value: number | null;
  current_value: number | null;
  current_value_updated_at: string | null;
  purchase_date: string;
  sale_date: string | null;
  sale_price: number | null;
  sale_value: number | null;
  notes: string | null;
  source: HoldingSource;
  created_at: string;
  updated_at: string;
}

export interface HoldingLot {
  id: string;
  holding_id: string;
  shares: number;
  price_per_share: number;
  purchase_date: string;
  notes: string | null;
  created_at: string;
}

export interface PriceCacheEntry {
  symbol: string;
  price: number;
  prev_close: number | null;
  change_pct: number | null;
  currency: string;
  fetched_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  date: string;
  total_value: number;
  total_cost: number;
  created_at: string;
}

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

export type RecurringSource = "detected" | "manual";

export interface RecurringRule {
  id: string;
  user_id: string;
  merchant_pattern: string;
  merchant_name: string | null;
  category_id: string | null;
  expected_amount: number | null;
  frequency: RecurringFrequency;
  expected_day: number | null;
  next_expected: string | null;
  is_active: boolean;
  confirmed: boolean | null;
  dismissed_at: string | null;
  amount_tolerance: number;
  interval_days: number | null;
  end_date: string | null;
  stop_after: number | null;
  occurrence_count: number;
  source: RecurringSource;
  last_matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at: string;
}
