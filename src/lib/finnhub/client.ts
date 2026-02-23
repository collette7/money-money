const BASE_URL = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY not configured");
  return key;
}

async function finnhubFetch<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = 300
): Promise<T | null> {
  const token = getApiKey();
  const qs = new URLSearchParams({ ...Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ), token });

  const res = await fetch(`${BASE_URL}${path}?${qs}`, {
    next: { revalidate },
  });

  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change (absolute)
  dp: number;  // change percent
  h: number;   // day high
  l: number;   // day low
  o: number;   // day open
  pc: number;  // previous close
  t: number;   // timestamp
}

export interface QuoteResult {
  symbol: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
}

export async function getQuote(symbol: string): Promise<QuoteResult | null> {
  const data = await finnhubFetch<FinnhubQuote>("/quote", { symbol }, 60);
  if (!data || (data.c === 0 && data.h === 0 && data.l === 0)) return null;

  return {
    symbol,
    price: data.c,
    prevClose: data.pc,
    change: data.d ?? 0,
    changePct: data.dp ?? 0,
  };
}

export async function getBatchQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();
  if (symbols.length === 0) return results;

  const settled = await Promise.allSettled(
    symbols.map((s) => getQuote(s))
  );

  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      results.set(result.value.symbol, result.value);
    }
  }

  return results;
}

export interface SymbolSearchResult {
  symbol: string;
  displaySymbol: string;
  name: string;
  type: string;
}

export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  const data = await finnhubFetch<{
    count: number;
    result: Array<{
      description: string;
      displaySymbol: string;
      symbol: string;
      type: string;
    }>;
  }>("/search", { q: query }, 60);

  if (!data?.result) return [];

  return data.result
    .filter((r) => !r.symbol.includes(".") || r.symbol.endsWith(".TO"))
    .slice(0, 12)
    .map((r) => ({
      symbol: r.symbol,
      displaySymbol: r.displaySymbol,
      name: r.description,
      type: r.type,
    }));
}

export interface MarketStatus {
  isOpen: boolean;
  session: "pre-market" | "regular" | "post-market" | null;
  holiday: string | null;
}

export async function getMarketStatus(): Promise<MarketStatus> {
  const data = await finnhubFetch<{
    exchange: string;
    holiday: string | null;
    isOpen: boolean;
    session: string | null;
    t: number;
  }>("/stock/market-status", { exchange: "US" }, 120);

  if (!data) return { isOpen: false, session: null, holiday: null };

  return {
    isOpen: data.isOpen,
    session: data.session as MarketStatus["session"],
    holiday: data.holiday,
  };
}

export const MARKET_HOLDING_TYPES = new Set([
  "stock", "etf", "crypto", "option", "mutual_fund",
]);

export const MANUAL_HOLDING_TYPES = new Set([
  "real_estate", "private_equity", "vehicle", "alternative", "other",
]);

export const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
