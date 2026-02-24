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
  // Insurance
  geico: "geico.com",
  progressive: "progressive.com",
  "state farm": "statefarm.com",
  allstate: "allstate.com",
}

/**
 * Resolves a merchant name to a Logo.dev URL (with Google favicon fallback).
 * Returns an array of URLs to try in order, or empty array if no match.
 */
export function getMerchantLogoUrls(merchantName: string): string[] {
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN
  const lower = merchantName.toLowerCase()

  // Try longest match first to avoid partial hits (e.g. "uber eats" before "uber")
  const sortedEntries = Object.entries(MERCHANT_DOMAINS).sort(
    (a, b) => b[0].length - a[0].length
  )

  for (const [key, domain] of sortedEntries) {
    if (lower.includes(key)) {
      return [
        ...(logoDevToken
          ? [`https://img.logo.dev/${domain}?token=${logoDevToken}&size=64&format=png`]
          : []),
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      ]
    }
  }

  // Fallback: try to guess domain from merchant name itself
  // e.g. "ACME Corp" → acmecorp.com
  const guessedDomain = lower
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