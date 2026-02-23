/**
 * Extracts the last 4 digits of an account number from various account name formats
 * Examples:
 * - "Checking Account 1234" -> "1234"
 * - "Savings (5678)" -> "5678"
 * - "Credit Card ...9012" -> "9012"
 * - "Account ending in 3456" -> "3456"
 * - "My Account" -> null (no digits found)
 */
export function extractAccountLastFour(accountName: string): string | null {
  // Try various patterns banks might use
  const patterns = [
    /\b(\d{4})\)?\s*$/,           // Matches "1234" or "1234)" at end
    /\.\.\.(\d{4})/,              // Matches "...1234"
    /ending in (\d{4})/i,         // Matches "ending in 1234"
    /\*+(\d{4})/,                 // Matches "****1234" or similar
    /x+(\d{4})/i,                 // Matches "xxxx1234" or similar
    /\b(\d{4})\b(?!.*\b\d{4}\b)/, // Last occurrence of 4 digits
  ]
  
  for (const pattern of patterns) {
    const match = accountName.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  // If no pattern matches, try to find any 4 consecutive digits
  const anyFourDigits = accountName.match(/(\d{4})/)
  if (anyFourDigits) {
    return anyFourDigits[1]
  }
  
  return null
}

// Keys: lowercase institution name with spaces/special chars stripped.
// Includes long-form variants for fuzzy matching SimpleFIN names (e.g. "Navy Federal Credit Union").
const BANK_DOMAIN_MAP: Record<string, string> = {
  // Big 4
  'chase': 'chase.com',
  'jpmorgan': 'chase.com',
  'jpmorganchase': 'chase.com',
  'wellsfargo': 'wellsfargo.com',
  'bankofamerica': 'bankofamerica.com',
  'bofa': 'bankofamerica.com',
  'citi': 'citi.com',
  'citibank': 'citi.com',
  'citigroup': 'citi.com',
  // Regional / national
  'usbank': 'usbank.com',
  'capitalone': 'capitalone.com',
  'pnc': 'pnc.com',
  'pncbank': 'pnc.com',
  'tdbank': 'td.com',
  'td': 'td.com',
  'fifththird': '53.com',
  'fifththirdbank': '53.com',
  'keybank': 'key.com',
  'regions': 'regions.com',
  'regionsbank': 'regions.com',
  'suntrust': 'truist.com',
  'bbt': 'truist.com',
  'truist': 'truist.com',
  'huntington': 'huntington.com',
  'huntingtonbank': 'huntington.com',
  'mandt': 'mtb.com',
  'mandtbank': 'mtb.com',
  'citizensbank': 'citizensbank.com',
  'citizens': 'citizensbank.com',
  'bmo': 'bmo.com',
  'bmoharris': 'bmo.com',
  // Credit unions
  'navyfederal': 'navyfederal.org',
  'navyfederalcreditunion': 'navyfederal.org',
  'penfed': 'penfed.org',
  'pentagonfederalcreditunion': 'penfed.org',
  'becu': 'becu.org',
  'alliant': 'alliantcreditunion.org',
  'alliantcreditunion': 'alliantcreditunion.org',
  // Online / neobanks
  'ally': 'ally.com',
  'allybank': 'ally.com',
  'allyfinancial': 'ally.com',
  'discover': 'discover.com',
  'discoverbank': 'discover.com',
  'marcus': 'marcus.com',
  'marcusbygoldmansachs': 'marcus.com',
  'goldmansachs': 'marcus.com',
  'sofi': 'sofi.com',
  'chime': 'chime.com',
  'synchrony': 'synchrony.com',
  'synchronybank': 'synchrony.com',
  // Cards / payments
  'americanexpress': 'americanexpress.com',
  'amex': 'americanexpress.com',
  'venmo': 'venmo.com',
  'paypal': 'paypal.com',
  'cashapp': 'cash.app',
  'apple': 'apple.com',
  'applecard': 'apple.com',
  // Brokerage / investing
  'schwab': 'schwab.com',
  'charlesschwab': 'schwab.com',
  'fidelity': 'fidelity.com',
  'fidelityinvestments': 'fidelity.com',
  'vanguard': 'vanguard.com',
  'etrade': 'etrade.com',
  'robinhood': 'robinhood.com',
  'wealthfront': 'wealthfront.com',
  'betterment': 'betterment.com',
  'interactivebrokers': 'interactivebrokers.com',
  'tdameritrade': 'tdameritrade.com',
  'merrilllynch': 'ml.com',
  'merrill': 'ml.com',
  // Insurance / military
  'usaa': 'usaa.com',
  'usaafederalsavingsbank': 'usaa.com',
  // Other
  'simple': 'simple.com',
  'current': 'current.com',
  'greenlight': 'greenlight.com',
}

// Fuzzy-matches institution name → domain: exact → longest prefix → reverse prefix → guess
function resolveInstitutionDomain(institutionName: string, institutionDomain?: string | null): string {
  if (institutionDomain) {
    const domain = institutionDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (domain.includes('.')) return domain
  }

  const cleanName = institutionName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')

  if (BANK_DOMAIN_MAP[cleanName]) {
    return BANK_DOMAIN_MAP[cleanName]
  }

  // Longest map key that cleanName starts with (e.g. "navyfederalcreditunion" → "navyfederal")
  let bestMatch = ''
  let bestDomain = ''
  for (const [key, domain] of Object.entries(BANK_DOMAIN_MAP)) {
    if (cleanName.startsWith(key) && key.length > bestMatch.length) {
      bestMatch = key
      bestDomain = domain
    }
  }
  if (bestDomain) return bestDomain

  // Reverse: map key starts with cleanName (e.g. "ally" → "allybank")
  for (const [key, domain] of Object.entries(BANK_DOMAIN_MAP)) {
    if (key.startsWith(cleanName) && cleanName.length >= 3) {
      return domain
    }
  }

  return `${cleanName}.com`
}

export function getBankLogoUrls(institutionName: string, institutionDomain?: string | null): string[] {
  const domain = resolveInstitutionDomain(institutionName, institutionDomain)
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN

  return [
    ...(logoDevToken
      ? [`https://img.logo.dev/${domain}?token=${logoDevToken}&size=64&format=png`]
      : []),
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ]
}

export function getBankLogoUrlWithFallback(institutionName: string, institutionDomain?: string | null): string {
  return getBankLogoUrls(institutionName, institutionDomain)[0]
}