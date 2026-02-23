"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBatchQuotes,
  getMarketStatus,
  MARKET_HOLDING_TYPES,
  STALE_THRESHOLD_MS,
  type QuoteResult,
  type MarketStatus,
} from "@/lib/finnhub/client";
import type { HoldingType, HoldingSource } from "@/types/database";
import { holdingInputSchema, saleInputSchema } from "@/lib/validation";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export type HoldingRow = {
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
};

export type PriceCacheRow = {
  symbol: string;
  price: number;
  prev_close: number | null;
  change_pct: number | null;
  fetched_at: string;
};

export type PortfolioData = {
  holdings: HoldingRow[];
  prices: Map<string, PriceCacheRow>;
  marketStatus: MarketStatus;
  totalValue: number;
  totalCost: number;
  dayChange: number;
  dayChangePct: number;
};

export async function getPortfolioData(): Promise<PortfolioData> {
  const { supabase, user } = await getUser();

  const [{ data: holdings }, { data: priceRows }, marketStatus] = await Promise.all([
    supabase
      .from("holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("price_cache").select("*"),
    getMarketStatus(),
  ]);

  const priceMap = new Map<string, PriceCacheRow>();
  for (const row of priceRows ?? []) {
    priceMap.set(row.symbol, row as PriceCacheRow);
  }

  const allHoldings = (holdings ?? []) as HoldingRow[];

  const openHoldings = allHoldings.filter((h) => !h.sale_date);
  let totalValue = 0;
  let totalCost = 0;
  let dayChange = 0;

  for (const h of openHoldings) {
    if (h.is_manual) {
      totalValue += h.current_value ?? h.purchase_value ?? 0;
      totalCost += h.purchase_value ?? 0;
    } else if (h.symbol && h.shares) {
      const cached = priceMap.get(h.symbol);
      const price = cached?.price ?? 0;
      const prevClose = cached?.prev_close ?? price;
      const costBasis = h.total_cost ?? 0;
      const holdingValue = price > 0 ? h.shares * price : costBasis;
      totalValue += holdingValue;
      totalCost += costBasis;
      dayChange += price > 0 ? h.shares * (price - prevClose) : 0;
    }
  }

  const dayChangePct = totalValue - dayChange !== 0
    ? (dayChange / (totalValue - dayChange)) * 100
    : 0;

  return {
    holdings: allHoldings,
    prices: priceMap,
    marketStatus,
    totalValue,
    totalCost,
    dayChange,
    dayChangePct,
  };
}

export async function getPortfolioSnapshots() {
  const { supabase, user } = await getUser();

  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("date, total_value, total_cost")
    .eq("user_id", user.id)
    .order("date", { ascending: true })
    .limit(365);

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Price refresh
// ---------------------------------------------------------------------------

export async function refreshPrices(): Promise<{ refreshed: number; cached: number }> {
  const { supabase, user } = await getUser();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("symbol")
    .eq("user_id", user.id)
    .eq("is_manual", false)
    .is("sale_date", null)
    .not("symbol", "is", null);

  if (!holdings || holdings.length === 0) return { refreshed: 0, cached: 0 };

  const symbols = [...new Set(holdings.map((h) => h.symbol as string))];

  const { data: cachedPrices } = await supabase
    .from("price_cache")
    .select("symbol, fetched_at")
    .in("symbol", symbols);

  const now = Date.now();
  const staleSymbols: string[] = [];
  let cached = 0;

  for (const sym of symbols) {
    const entry = cachedPrices?.find((p) => p.symbol === sym);
    if (entry && now - new Date(entry.fetched_at).getTime() < STALE_THRESHOLD_MS) {
      cached++;
    } else {
      staleSymbols.push(sym);
    }
  }

  if (staleSymbols.length === 0) return { refreshed: 0, cached };

  const quotes = await getBatchQuotes(staleSymbols);
  const fetchedAt = new Date().toISOString();

  for (const [symbol, quote] of quotes) {
    await supabase.from("price_cache").upsert(
      {
        symbol,
        price: quote.price,
        prev_close: quote.prevClose,
        change_pct: quote.changePct,
        fetched_at: fetchedAt,
      },
      { onConflict: "symbol" }
    );
  }

  revalidatePath("/portfolio");
  return { refreshed: quotes.size, cached };
}

// ---------------------------------------------------------------------------
// Portfolio snapshot (daily)
// ---------------------------------------------------------------------------

export async function recordPortfolioSnapshot(totalValue: number, totalCost: number) {
  const { supabase, user } = await getUser();
  const today = new Date().toISOString().split("T")[0];

  await supabase.from("portfolio_snapshots").upsert(
    {
      user_id: user.id,
      date: today,
      total_value: totalValue,
      total_cost: totalCost,
    },
    { onConflict: "user_id,date" }
  );
}

// ---------------------------------------------------------------------------
// Create holding
// ---------------------------------------------------------------------------

export type CreateHoldingInput = {
  assetType: HoldingType;
  isManual: boolean;
  symbol?: string | null;
  name: string;
  shares?: number | null;
  pricePerShare?: number | null;
  purchaseValue?: number | null;
  currentValue?: number | null;
  purchaseDate: string;
  accountId?: string | null;
  notes?: string | null;
  source?: HoldingSource;
};

export async function createHolding(input: CreateHoldingInput) {
  const { supabase, user } = await getUser();

  const validated = holdingInputSchema.safeParse({
    symbol: input.symbol ?? undefined,
    name: input.name,
    shares: input.shares ?? 0,
    pricePerShare: input.pricePerShare ?? 0,
    purchaseValue: input.purchaseValue ?? undefined,
    currentValue: input.currentValue ?? undefined,
  });
  if (!validated.success) {
    throw new Error("Invalid holding input");
  }

  const isManual = input.isManual;
  const avgCost = input.pricePerShare ?? null;
  const totalCost = input.shares && input.pricePerShare
    ? input.shares * input.pricePerShare
    : null;

  const { data: holding, error } = await supabase
    .from("holdings")
    .insert({
      user_id: user.id,
      account_id: input.accountId ?? null,
      asset_type: input.assetType,
      is_manual: isManual,
      symbol: isManual ? null : (input.symbol ?? null),
      name: input.name,
      shares: isManual ? null : (input.shares ?? null),
      avg_cost: isManual ? null : avgCost,
      total_cost: isManual ? null : totalCost,
      purchase_value: isManual ? (input.purchaseValue ?? null) : null,
      current_value: isManual ? (input.currentValue ?? input.purchaseValue ?? null) : null,
      current_value_updated_at: isManual ? new Date().toISOString() : null,
      purchase_date: input.purchaseDate,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
    })
     .select("id")
     .single();

   if (error) {
     console.error("[addHolding]", error.message);
     throw new Error("Failed to create record");
   }

   if (!isManual && input.shares && input.pricePerShare) {
     await supabase.from("holding_lots").insert({
      holding_id: holding.id,
      shares: input.shares,
      price_per_share: input.pricePerShare,
      purchase_date: input.purchaseDate,
    });
  }

  revalidatePath("/portfolio");
  return holding;
}

// ---------------------------------------------------------------------------
// Add lot to existing holding
// ---------------------------------------------------------------------------

export async function addLot(holdingId: string, shares: number, pricePerShare: number, purchaseDate: string) {
  if (!Number.isFinite(shares) || shares < 0 || shares > 1_000_000_000) {
    throw new Error("Invalid shares");
  }
  if (!Number.isFinite(pricePerShare) || pricePerShare < 0 || pricePerShare > 1_000_000_000) {
    throw new Error("Invalid price per share");
  }

  const { supabase, user } = await getUser();

  const { data: holding } = await supabase
    .from("holdings")
    .select("id, user_id, is_manual")
    .eq("id", holdingId)
    .eq("user_id", user.id)
    .single();

  if (!holding || holding.is_manual) throw new Error("Invalid holding");

  await supabase.from("holding_lots").insert({
    holding_id: holdingId,
    shares,
    price_per_share: pricePerShare,
    purchase_date: purchaseDate,
  });

  await recalculateAvgCost(holdingId, user.id);
  revalidatePath("/portfolio");
}

async function recalculateAvgCost(holdingId: string, userId?: string) {
  const supabase = await createClient();

  const { data: lots } = await supabase
    .from("holding_lots")
    .select("shares, price_per_share")
    .eq("holding_id", holdingId);

  if (!lots || lots.length === 0) return;

  let totalShares = 0;
  let totalInvested = 0;

  for (const lot of lots) {
    totalShares += Number(lot.shares);
    totalInvested += Number(lot.shares) * Number(lot.price_per_share);
  }

  const avgCost = totalShares > 0 ? totalInvested / totalShares : 0;

  let query = supabase
    .from("holdings")
    .update({
      shares: totalShares,
      avg_cost: Math.round(avgCost * 10000) / 10000,
      total_cost: Math.round(totalInvested * 100) / 100,
    })
    .eq("id", holdingId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  await query;
}

// ---------------------------------------------------------------------------
// Update holding
// ---------------------------------------------------------------------------

export async function updateHolding(
  holdingId: string,
  updates: {
    name?: string;
    currentValue?: number;
    notes?: string | null;
  }
) {
  const { supabase, user } = await getUser();

  if (updates.currentValue !== undefined && (!Number.isFinite(updates.currentValue) || updates.currentValue < 0 || updates.currentValue > 100_000_000_000)) {
    throw new Error("Invalid current value");
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.currentValue !== undefined) {
    updateData.current_value = updates.currentValue;
    updateData.current_value_updated_at = new Date().toISOString();
  }

  if (Object.keys(updateData).length === 0) return;

   const { error } = await supabase
     .from("holdings")
     .update(updateData)
     .eq("id", holdingId)
     .eq("user_id", user.id);

   if (error) {
     console.error("[updateHolding]", error.message);
     throw new Error("Failed to update record");
   }
   revalidatePath("/portfolio");
}

// ---------------------------------------------------------------------------
// Record sale
// ---------------------------------------------------------------------------

export async function recordSale(
  holdingId: string,
  salePrice: number,
  saleDate: string
) {
  const validatedSale = saleInputSchema.safeParse({ salePrice });
  if (!validatedSale.success) {
    throw new Error("Invalid sale price");
  }

  const { supabase, user } = await getUser();

  const { data: holding } = await supabase
    .from("holdings")
    .select("id, is_manual, shares, purchase_value")
    .eq("id", holdingId)
    .eq("user_id", user.id)
    .single();

  if (!holding) throw new Error("Holding not found");

  const saleValue = holding.is_manual
    ? salePrice
    : (holding.shares ?? 0) * salePrice;

   const { error } = await supabase
     .from("holdings")
     .update({
       sale_date: saleDate,
       sale_price: salePrice,
       sale_value: Math.round(saleValue * 100) / 100,
     })
     .eq("id", holdingId)
     .eq("user_id", user.id);

   if (error) {
     console.error("[recordSale]", error.message);
     throw new Error("Failed to update record");
   }
   revalidatePath("/portfolio");
}

// ---------------------------------------------------------------------------
// Delete holding
// ---------------------------------------------------------------------------

export async function deleteHolding(holdingId: string) {
  const { supabase, user } = await getUser();

   const { error } = await supabase
     .from("holdings")
     .delete()
     .eq("id", holdingId)
     .eq("user_id", user.id);

   if (error) {
     console.error("[deleteHolding]", error.message);
     throw new Error("Failed to delete record");
   }
   revalidatePath("/portfolio");
}

// ---------------------------------------------------------------------------
// Symbol search (thin wrapper for client components)
// ---------------------------------------------------------------------------

export async function searchHoldingSymbol(query: string) {
  const { searchSymbol } = await import("@/lib/finnhub/client");
  return searchSymbol(query);
}

// ---------------------------------------------------------------------------
// Net worth integration — update investment account balance
// ---------------------------------------------------------------------------

export async function syncPortfolioToNetWorth(totalValue: number) {
  const { supabase, user } = await getUser();

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("account_type", "investment")
    .eq("name", "Portfolio")
    .eq("sync_method", "manual")
    .limit(1);

  let accountId: string;

  if (existing && existing.length > 0) {
    accountId = existing[0].id;
  } else {
    const { data: created, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        institution_name: "Portfolio",
        account_type: "investment",
        name: "Portfolio",
        balance: totalValue,
        opening_balance: 0,
        currency: "USD",
        sync_method: "manual",
      })
       .select("id")
       .single();

     if (error) {
       console.error("[ensurePortfolioAccount]", error.message);
       throw new Error("Failed to create record");
     }
     accountId = created.id;
   }

   await supabase
     .from("accounts")
     .update({ balance: totalValue })
     .eq("id", accountId)
     .eq("user_id", user.id);
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

export type ImportRow = {
  symbol: string;
  name: string;
  assetType: HoldingType;
  shares: number;
  pricePerShare: number;
  purchaseDate: string;
};

export async function importHoldingsFromCSV(rows: ImportRow[]): Promise<{ imported: number; errors: string[] }> {
  const { supabase, user } = await getUser();

  const errors: string[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Number.isFinite(row.shares) || row.shares < 0 || row.shares > 1_000_000_000) {
      errors.push(`Row ${i + 1}: Invalid shares value`);
      continue;
    }
    if (!Number.isFinite(row.pricePerShare) || row.pricePerShare < 0 || row.pricePerShare > 1_000_000_000) {
      errors.push(`Row ${i + 1}: Invalid price per share`);
      continue;
    }
    try {
      const avgCost = row.pricePerShare;
      const totalCost = row.shares * row.pricePerShare;

      const { data: holding, error } = await supabase
        .from("holdings")
        .insert({
          user_id: user.id,
          account_id: null,
          asset_type: row.assetType,
          is_manual: false,
          symbol: row.symbol,
          name: row.name || row.symbol,
          shares: row.shares,
          avg_cost: avgCost,
          total_cost: totalCost,
          purchase_value: null,
          current_value: null,
          current_value_updated_at: null,
          purchase_date: row.purchaseDate,
          notes: null,
          source: "csv_import",
        })
        .select("id")
        .single();

      if (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
        continue;
      }

      await supabase.from("holding_lots").insert({
        holding_id: holding.id,
        shares: row.shares,
        price_per_share: row.pricePerShare,
        purchase_date: row.purchaseDate,
      });

      imported++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }

  revalidatePath("/portfolio");
  return { imported, errors };
}
