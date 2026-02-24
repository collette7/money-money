/**
 * Merchant logo utilities — maps merchant names to domains for Logo.dev API.
 * Mirrors the bank logo pattern in account-utils.ts.
 */

// Keys: lowercase merchant/brand name fragments.
// Values: canonical domain for logo lookup.
const MERCHANT_DOMAINS: Record<string, string> = {
  // E-commerce
  amazon: "amazon.com",
  "amazon prime": "amazon.com",
  "amazon web services": "aws.amazon.com",
  ebay: "ebay.com",
  etsy: "etsy.com",
  shopify: "shopify.com",
  walmart: "walmart.com",
  target: "target.com",
  costco: "costco.com",
  "sam's club": "samsclub.com",
  bestbuy: "bestbuy.com",
  "best buy": "bestbuy.com",
  "home depot": "homedepot.com",
  lowes: "lowes.com",
  "lowe's": "lowes.com",
  ikea: "ikea.com",
  macys: "macys.com",
  "macy's": "macys.com",
  nordstrom: "nordstrom.com",
  // Streaming & entertainment
  netflix: "netflix.com",
  spotify: "spotify.com",
  hulu: "hulu.com",
  disney: "disneyplus.com",
  "disney+": "disneyplus.com",
  hbo: "hbomax.com",
  "max ": "hbomax.com",
  "apple tv": "apple.com",
  "apple music": "apple.com",
  youtube: "youtube.com",
  "youtube premium": "youtube.com",
  peacock: "peacocktv.com",
  paramount: "paramountplus.com",
  "prime video": "primevideo.com",
  // Software & cloud
  dropbox: "dropbox.com",
  adobe: "adobe.com",
  microsoft: "microsoft.com",
  google: "google.com",
  apple: "apple.com",
  icloud: "apple.com",
  zoom: "zoom.us",
  slack: "slack.com",
  notion: "notion.so",
  github: "github.com",
  openai: "openai.com",
  chatgpt: "openai.com",
  "are.na": "are.na",
  "noun project": "thenounproject.com",
  thenounproject: "thenounproject.com",
  // Food & delivery
  doordash: "doordash.com",
  "uber eats": "ubereats.com",
  ubereats: "ubereats.com",
  grubhub: "grubhub.com",
  instacart: "instacart.com",
  starbucks: "starbucks.com",
  "chick-fil-a": "chick-fil-a.com",
  chipotle: "chipotle.com",
  mcdonalds: "mcdonalds.com",
  "mcdonald's": "mcdonalds.com",
  "dunkin": "dunkindonuts.com",
  "panera": "panerabread.com",
  "subway": "subway.com",
  "domino": "dominos.com",
  "pizza hut": "pizzahut.com",
  // Transportation
  uber: "uber.com",
  lyft: "lyft.com",
  // Grocery
  "whole foods": "wholefoodsmarket.com",
  trader: "traderjoes.com",
  "trader joe": "traderjoes.com",
  kroger: "kroger.com",
  publix: "publix.com",
  aldi: "aldi.us",
  safeway: "safeway.com",
  iherb: "iherb.com",
  // Utilities & telecom
  "at&t": "att.com",
  att: "att.com",
  verizon: "verizon.com",
  tmobile: "t-mobile.com",
  "t-mobile": "t-mobile.com",
  comcast: "xfinity.com",
  xfinity: "xfinity.com",
  spectrum: "spectrum.com",
  // Fitness & health
  peloton: "onepeloton.com",
  "planet fitness": "planetfitness.com",
  // Gas
  shell: "shell.com",
  chevron: "chevron.com",
  exxon: "exxon.com",
  "bp ": "bp.com",
  // Payments
  venmo: "venmo.com",
  paypal: "paypal.com",
  cashapp: "cash.app",
  zelle: "zellepay.com",
  sezzle: "sezzle.com",
  synchrony: "synchrony.com",
  "syf-": "synchrony.com",
  "amex ": "americanexpress.com",
  "american express": "americanexpress.com",
  // Insurance
  geico: "geico.com",
  progressive: "progressive.com",
  "state farm": "statefarm.com",
  allstate: "allstate.com",
  lemonade: "lemonade.com",
  // Finance & fintech
  simplefin: "simplefin.org",
  // Photography
  "obs services": "obscura.com",
  // Books & media
  taschen: "taschen.com",
}

// US state codes for trailing location stripping
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
])

/**
 * Strips POS junk, location info, reference numbers, phone numbers, and URLs
 * from raw transaction merchant names to produce a clean brand name.
 */
export function normalizeMerchantName(rawName: string): string {
  let name = rawName.trim()

  // Strip known POS/payment processor prefixes
  const prefixes = [
    /^SQ \*/i,
    /^SP /i,
    /^DD \*/i,
    /^TST\*\s?/i,
    /^AplPay /i,
    /^CHECKCARD /i,
    /^POS /i,
    /^ACH /i,
    /^DEBIT /i,
    /^PURCHASE /i,
  ]
  for (const prefix of prefixes) {
    name = name.replace(prefix, "")
  }

  // Strip embedded HTTPS:// URLs
  name = name.replace(/HTTPS?:\/\/\S+/gi, "")

  // Strip trailing phone numbers (e.g. 855-280-0278)
  name = name.replace(/\s+\d{3}-\d{3}-\d{4}\s*$/, "")

  // Strip reference/order numbers: *XXXXXXX patterns (asterisk + alphanumeric junk)
  name = name.replace(/\*[A-Z0-9][A-Z0-9.*\/]+/gi, "")

  // Strip domain-like patterns embedded in name (e.g. IHERB.COM)
  name = name.replace(/\s+\S+\.COM\b/gi, "")

  // Strip trailing location info: city + state, or just " -- XX" or " XX"
  // Match patterns like " DALLAS TX", " -- CA", " IRVINE CA", " SHERIDAN WY"
  name = name.replace(/\s+--\s+[A-Z]{2}\s*$/i, "")
  name = name.replace(/\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*\s+([A-Z]{2})\s*$/i, (match, state) => {
    return US_STATES.has(state.toUpperCase()) ? "" : match
  })
  // Standalone trailing state code (" CA", " TX")
  name = name.replace(/\s+([A-Z]{2})\s*$/i, (match, state) => {
    return US_STATES.has(state.toUpperCase()) ? "" : match
  })

  return name.trim()
}

/**
 * Resolves a merchant name to a Logo.dev URL (with Google favicon fallback).
 * Returns an array of URLs to try in order, or empty array if no match.
 */
export function getMerchantLogoUrls(merchantName: string, cachedDomain?: string | null): string[] {
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN

  // If a cached domain is provided, use it directly
  if (cachedDomain) {
    return [
      ...(logoDevToken
        ? [`https://img.logo.dev/${cachedDomain}?token=${logoDevToken}&size=64&format=png`]
        : []),
      `https://www.google.com/s2/favicons?domain=${cachedDomain}&sz=64`,
    ]
  }

  const rawLower = merchantName.toLowerCase()
  const normalizedLower = normalizeMerchantName(merchantName).toLowerCase()

  // Try longest match first to avoid partial hits (e.g. "uber eats" before "uber")
  const sortedEntries = Object.entries(MERCHANT_DOMAINS).sort(
    (a, b) => b[0].length - a[0].length
  )

  for (const [key, domain] of sortedEntries) {
    if (rawLower.includes(key) || normalizedLower.includes(key)) {
      return [
        ...(logoDevToken
          ? [`https://img.logo.dev/${domain}?token=${logoDevToken}&size=64&format=png`]
          : []),
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      ]
    }
  }

  // Fallback: try to guess domain from normalized merchant name
  const guessedDomain = normalizedLower
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30)

  if (guessedDomain.length >= 3) {
    return [
      ...(logoDevToken
        ? [`https://img.logo.dev/${guessedDomain}.com?token=${logoDevToken}&size=64&format=png`]
        : []),
      `https://www.google.com/s2/favicons?domain=${guessedDomain}.com&sz=64`,
    ]
  }

  return []
}

/**
 * Convenience: returns the best single URL for a merchant logo.
 */
export function getMerchantLogoUrl(merchantName: string): string | null {
  const urls = getMerchantLogoUrls(merchantName)
  return urls[0] ?? null
}