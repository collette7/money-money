import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const simpleFinTokenSchema = z.object({
  token: z.string().min(1, "Token is required").trim(),
  lookback: z.coerce.number().min(1).max(365).default(90),
});

export const transactionSchema = z.object({
  date: z.string().datetime(),
  amount: z.number().finite(),
  description: z.string().min(1).max(500),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid(),
  note: z.string().max(1000).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const budgetSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive().finite(),
  period: z.enum(["monthly", "quarterly", "yearly"]),
});

export const goalSchema = z.object({
  name: z.string().min(1).max(100),
  target_amount: z.number().positive().finite(),
  target_date: z.string().datetime(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export const accountSchema = z.object({
  name: z.string().min(1).max(100),
  institution_name: z.string().min(1).max(100),
  account_type: z.enum(["checking", "savings", "credit", "investment", "loan", "other"]),
  balance: z.number().finite(),
  currency: z.string().length(3).default("USD"),
});

export const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini", "moonshot", "kimi", "minimax", "ollama"]),
  model: z.string().min(1).max(100),
  api_key: z.string().min(1).max(500).optional(),
  base_url: z.string().url().optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const importFileSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= MAX_FILE_SIZE,
    "File size must be less than 5MB"
  ).refine(
    (file) => ["text/csv", "application/x-ofx", "text/plain"].includes(file.type),
    "Only CSV and OFX files are supported"
  ),
});

export const searchParamsSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().uuid().optional(),
  account: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(
    z.number().min(1).max(100)
  ).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per_page: z.coerce.number().min(1).max(100).default(50),
});

// Portfolio
export const holdingInputSchema = z.object({
  symbol: z.string().max(20).optional(),
  name: z.string().min(1).max(200),
  shares: z.number().min(0).max(1_000_000_000),
  pricePerShare: z.number().min(0).max(1_000_000_000),
  purchaseValue: z.number().min(0).max(100_000_000_000).optional(),
  currentValue: z.number().min(0).max(100_000_000_000).optional(),
});

export const saleInputSchema = z.object({
  salePrice: z.number().min(0).max(1_000_000_000),
});

export const monthYearSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10_000),
});

export const limitSchema = z.number().int().min(1).max(1000);

export const monthsRangeSchema = z.number().int().min(1).max(120);

export const paymentDueDaySchema = z.number().int().min(1).max(31).nullable();

export const recurringRuleInputSchema = z.object({
  expectedAmount: z.number().min(0).max(1_000_000).optional(),
  expectedDay: z.number().int().min(1).max(31).optional(),
});

export const notesSchema = z.string().max(5000);
export const tagsSchema = z.array(z.string().max(100)).max(50);
export const merchantNameSchema = z.string().min(1).max(200);

export const ruleConditionInputSchema = z.object({
  field: z.enum(["amount", "description", "merchant_name"]),
  operator: z.enum(["equals", "contains", "starts_with", "greater_than", "less_than", "between"]),
  value: z.string().min(1).max(500),
  value_end: z.string().max(500).optional(),
});

export const categoryTypeEnum = z.enum(["expense", "income", "transfer"]);