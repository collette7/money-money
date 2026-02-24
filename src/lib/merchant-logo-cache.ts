import { createClient } from "@/lib/supabase/server"
import { normalizeMerchantName, getMerchantLogoUrls } from "@/lib/merchant-utils"

const LOG_PREFIX = "[MerchantLogoCache]"

/** How long before a cached result is considered stale */
const CACHE_TTL_DAYS = 30

/** Result returned from domain validation */
export type MerchantDomainResult = {
  domain: string | null
  logoUrl: string | null
  isValid: boolean
}

// Access the static MERCHANT_DOMAINS via getMerchantLogoUrls — if it returns a logo.dev URL
// with a known domain, we can extract the domain from that URL.
function getStaticDomain(merchantName: string): string | null {
  const urls = getMerchantLogoUrls(merchantName)
  if (urls.length === 0) return null
  const logoDevUrl = urls.find((u) => u.includes("img.logo.dev/"))
  if (!logoDevUrl) return null
  const match = logoDevUrl.match(/img\.logo\.dev\/([^?]+)/)
  return match?.[1] ?? null
}

/**
 * Validates a merchant name against Logo.dev and caches the result.
 * Checks cache first; if fresh enough, returns cached result.
 */
export async function validateMerchantDomain(
  merchantName: string
): Promise<MerchantDomainResult> {
  const normalized = normalizeMerchantName(merchantName).toLowerCase()
  if (!normalized) {
    return { domain: null, logoUrl: null, isValid: false }
  }

  const supabase = await createClient()

  // Check cache first
  const { data: cached } = await supabase
    .from("merchant_logo_cache")
    .select("domain, logo_url, is_valid, checked_at")
    .eq("merchant_name", normalized)
    .single()

  if (cached) {
    const checkedAt = new Date(cached.checked_at)
    const ageMs = Date.now() - checkedAt.getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)

    if (ageDays < CACHE_TTL_DAYS) {
      return {
        domain: cached.domain,
        logoUrl: cached.logo_url,
        isValid: cached.is_valid,
      }
    }
  }

  // Not cached or stale — resolve domain
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  let domain = getStaticDomain(merchantName)

  // If no static match, guess domain from normalized name
  if (!domain) {
    const guessed = normalized.replace(/[^a-z0-9]/g, "").slice(0, 30)
    if (guessed.length >= 3) {
      domain = `${guessed}.com`
    }
  }

  if (!domain || !logoDevToken) {
    // Can't validate without a domain or token — cache as invalid
    await upsertCache(supabase, normalized, null, null, false)
    return { domain: null, logoUrl: null, isValid: false }
  }

  // Validate via HEAD request to Logo.dev
  const logoUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}&size=64&format=png`
  let isValid = false

  try {
    const response = await fetch(logoUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })
    isValid = response.ok
  } catch {
    // Network error or timeout — treat as invalid
    isValid = false
  }

  const finalLogoUrl = isValid ? logoUrl : null
  const finalDomain = isValid ? domain : null

  await upsertCache(supabase, normalized, finalDomain, finalLogoUrl, isValid)

  console.log(
    LOG_PREFIX,
    `Validated "${normalized}" → domain=${finalDomain ?? "none"}, valid=${isValid}`
  )

  return { domain: finalDomain, logoUrl: finalLogoUrl, isValid }
}

/**
 * Batch-validates multiple merchant names. Dedupes and validates all.
 */
export async function batchValidateMerchants(
  merchantNames: string[]
): Promise<Map<string, MerchantDomainResult>> {
  // Dedupe by normalized name
  const uniqueNames = [
    ...new Set(
      merchantNames
        .map((n) => normalizeMerchantName(n).toLowerCase())
        .filter(Boolean)
    ),
  ]

  const results = new Map<string, MerchantDomainResult>()

  // Validate in parallel with concurrency limit
  const BATCH_SIZE = 10
  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    const batch = uniqueNames.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.allSettled(
      batch.map((name) => validateMerchantDomain(name))
    )

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j]
      if (result.status === "fulfilled") {
        results.set(batch[j], result.value)
      } else {
        results.set(batch[j], { domain: null, logoUrl: null, isValid: false })
      }
    }
  }

  console.log(
    LOG_PREFIX,
    `Batch validated ${uniqueNames.length} merchant(s): ${[...results.values()].filter((r) => r.isValid).length} valid`
  )

  return results
}

async function upsertCache(
  supabase: Awaited<ReturnType<typeof createClient>>,
  merchantName: string,
  domain: string | null,
  logoUrl: string | null,
  isValid: boolean
) {
  const { error } = await supabase.from("merchant_logo_cache").upsert(
    {
      merchant_name: merchantName,
      domain,
      logo_url: logoUrl,
      is_valid: isValid,
      checked_at: new Date().toISOString(),
    },
    { onConflict: "merchant_name" }
  )

  if (error) {
    console.error(LOG_PREFIX, `Failed to upsert cache for "${merchantName}":`, error.message)
  }
}
