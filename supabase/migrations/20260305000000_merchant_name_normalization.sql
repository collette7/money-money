-- ============================================================================
-- Merchant Name Normalization for Recurring Transaction Detection
-- ============================================================================
-- Problem: detect_recurring_transactions groups by exact merchant_name,
-- so "NETFLIX.COM", "Netflix Inc", "NETFLIX *MONTHLY" form separate groups
-- that never reach the occurrence threshold.
--
-- Solution: 3-layer normalization stack:
--   1. normalize_merchant_name()  — strip POS junk, URLs, phone#s, locations
--   2. merchant_aliases table     — map normalized fragments → canonical names
--   3. resolve_merchant_name()    — compose normalize + alias lookup
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. SQL normalization function
--    Mirrors TypeScript normalizeMerchantName() in src/lib/merchant-utils.ts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_merchant_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  name text;
BEGIN
  IF raw_name IS NULL OR raw_name = '' THEN
    RETURN raw_name;
  END IF;

  name := trim(both from raw_name);

  -- Step 1a: Strip POS/payment processor prefixes
  name := regexp_replace(name, '^(SQ \*|SP |DD \*|TST\*\s?|AplPay |CHECKCARD |POS |ACH |DEBIT |PURCHASE )', '', 'i');

  -- Step 1b: Strip embedded URLs
  name := regexp_replace(name, 'HTTPS?://\S+', '', 'gi');

  -- Step 2: Strip trailing phone numbers (dashed: 855-280-0278)
  name := regexp_replace(name, '\s+\d{3}-\d{3}-\d{4}\s*$', '');

  -- Step 2b: Strip trailing continuous phone numbers (10+ digits like 8447354370)
  name := regexp_replace(name, '\s+\d{10,}\s*$', '');

  -- Step 3: Strip reference numbers after asterisk (*XXXXXXX patterns)
  name := regexp_replace(name, '\*[A-Z0-9][A-Z0-9.*\/]+', '', 'gi');

  -- Step 4: Strip domain-like suffixes (.COM, .com/cc, etc.)
  name := regexp_replace(name, '[./]\S*\.COM\S*', '', 'gi');

  -- Step 5: Strip trailing " -- XX" state pattern
  name := regexp_replace(name, '\s+--\s+[A-Z]{2}\s*$', '', 'i');

  -- Step 6: Strip trailing "CITY STATE" patterns (US 2-letter state codes)
  name := regexp_replace(
    name,
    '\s+[A-Za-z]+(\s+[A-Za-z]+)*\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*$',
    '', 'i'
  );

  -- Step 7: Strip standalone trailing state code (" CA", " TX")
  name := regexp_replace(
    name,
    '\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*$',
    '', 'i'
  );

  -- Step 8: Strip trailing " Inc", " LLC", " Corp", " Ltd" suffixes
  name := regexp_replace(name, '\s+(Inc|LLC|Corp|Ltd|Co|Limited|Corporation)\.?\s*$', '', 'i');

  -- Collapse multiple spaces and trim
  name := regexp_replace(trim(both from name), '\s{2,}', ' ', 'g');

  RETURN name;
END;
$$;

COMMENT ON FUNCTION public.normalize_merchant_name(text) IS
  'Strips POS prefixes, URLs, phone numbers, reference numbers, locations, and corporate suffixes from raw merchant names';


-- ---------------------------------------------------------------------------
-- 2. Merchant aliases table — maps patterns to canonical names
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.merchant_aliases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system-wide
  match_pattern   text NOT NULL,     -- lowercase substring to match against normalized name
  canonical_name  text NOT NULL,     -- resolved display name
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_aliases_unique UNIQUE (user_id, match_pattern)
);

COMMENT ON TABLE public.merchant_aliases IS
  'Maps normalized merchant name patterns to canonical names for grouping. user_id NULL = system-wide.';

CREATE INDEX IF NOT EXISTS idx_merchant_aliases_pattern
  ON public.merchant_aliases(match_pattern);
CREATE INDEX IF NOT EXISTS idx_merchant_aliases_user
  ON public.merchant_aliases(user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE public.merchant_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_aliases: view system and own aliases"
  ON public.merchant_aliases FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "merchant_aliases: users can create own aliases"
  ON public.merchant_aliases FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "merchant_aliases: users can update own aliases"
  ON public.merchant_aliases FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "merchant_aliases: users can delete own aliases"
  ON public.merchant_aliases FOR DELETE
  USING (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3. Seed well-known merchant aliases (system-wide, user_id = NULL)
-- ---------------------------------------------------------------------------
INSERT INTO public.merchant_aliases (user_id, match_pattern, canonical_name) VALUES
  -- Streaming & Entertainment
  (NULL, 'netflix',           'Netflix'),
  (NULL, 'spotify',           'Spotify'),
  (NULL, 'hulu',              'Hulu'),
  (NULL, 'disney',            'Disney+'),
  (NULL, 'hbo',               'HBO Max'),
  (NULL, 'peacock',           'Peacock'),
  (NULL, 'paramount',         'Paramount+'),
  (NULL, 'apple tv',          'Apple TV+'),
  (NULL, 'apple music',       'Apple Music'),
  (NULL, 'youtube',           'YouTube'),
  (NULL, 'prime video',       'Prime Video'),
  (NULL, 'audible',           'Audible'),
  -- Software & Cloud
  (NULL, 'adobe',             'Adobe'),
  (NULL, 'microsoft',         'Microsoft'),
  (NULL, 'google',            'Google'),
  (NULL, 'icloud',            'iCloud'),
  (NULL, 'dropbox',           'Dropbox'),
  (NULL, 'openai',            'OpenAI'),
  (NULL, 'chatgpt',           'OpenAI'),
  (NULL, 'notion',            'Notion'),
  (NULL, 'slack',             'Slack'),
  (NULL, 'zoom',              'Zoom'),
  (NULL, 'github',            'GitHub'),
  -- E-commerce
  (NULL, 'amazon prime',      'Amazon Prime'),
  (NULL, 'amazon',            'Amazon'),
  (NULL, 'walmart',           'Walmart'),
  (NULL, 'target',            'Target'),
  (NULL, 'costco',            'Costco'),
  (NULL, 'bestbuy',           'Best Buy'),
  (NULL, 'best buy',          'Best Buy'),
  (NULL, 'ebay',              'eBay'),
  (NULL, 'etsy',              'Etsy'),
  -- Food & Delivery
  (NULL, 'doordash',          'DoorDash'),
  (NULL, 'uber eat',          'Uber Eats'),
  (NULL, 'ubereats',          'Uber Eats'),
  (NULL, 'grubhub',           'Grubhub'),
  (NULL, 'instacart',         'Instacart'),
  (NULL, 'starbucks',         'Starbucks'),
  (NULL, 'chipotle',          'Chipotle'),
  (NULL, 'mcdonald',          'McDonald''s'),
  (NULL, 'chick-fil',         'Chick-fil-A'),
  (NULL, 'dunkin',            'Dunkin'''),
  -- Grocery
  (NULL, 'whole foods',       'Whole Foods'),
  (NULL, 'wholefds',          'Whole Foods'),
  (NULL, 'trader joe',        'Trader Joe''s'),
  (NULL, 'kroger',            'Kroger'),
  (NULL, 'safeway',           'Safeway'),
  (NULL, 'aldi',              'Aldi'),
  (NULL, 'publix',            'Publix'),
  -- Transport
  (NULL, 'uber',              'Uber'),
  (NULL, 'lyft',              'Lyft'),
  -- Telecom & Utilities
  (NULL, 'comcast',           'Xfinity'),
  (NULL, 'xfinity',           'Xfinity'),
  (NULL, 'verizon',           'Verizon'),
  (NULL, 't-mobile',          'T-Mobile'),
  (NULL, 'tmobile',           'T-Mobile'),
  (NULL, 'spectrum',          'Spectrum'),
  -- Fitness
  (NULL, 'peloton',           'Peloton'),
  (NULL, 'planet fitness',    'Planet Fitness'),
  -- Payments
  (NULL, 'venmo',             'Venmo'),
  (NULL, 'paypal',            'PayPal'),
  (NULL, 'zelle',             'Zelle'),
  (NULL, 'cashapp',           'Cash App'),
  -- Insurance
  (NULL, 'geico',             'GEICO'),
  (NULL, 'progressive',       'Progressive'),
  (NULL, 'state farm',        'State Farm')
ON CONFLICT (user_id, match_pattern) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4. Canonical resolution function (normalize + alias lookup)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_merchant_name(
  raw_name text,
  p_user_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
AS $$
DECLARE
  normalized text;
  normalized_lower text;
  result text;
BEGIN
  IF raw_name IS NULL OR raw_name = '' THEN
    RETURN raw_name;
  END IF;

  normalized := public.normalize_merchant_name(raw_name);
  normalized_lower := lower(normalized);

  -- Priority 1: User-specific alias (longest match first)
  IF p_user_id IS NOT NULL THEN
    SELECT a.canonical_name INTO result
    FROM public.merchant_aliases a
    WHERE a.user_id = p_user_id
      AND normalized_lower LIKE '%' || a.match_pattern || '%'
    ORDER BY length(a.match_pattern) DESC
    LIMIT 1;

    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;

  -- Priority 2: System-wide alias (longest match first)
  SELECT a.canonical_name INTO result
  FROM public.merchant_aliases a
  WHERE a.user_id IS NULL
    AND normalized_lower LIKE '%' || a.match_pattern || '%'
  ORDER BY length(a.match_pattern) DESC
  LIMIT 1;

  IF result IS NOT NULL THEN
    RETURN result;
  END IF;

  -- Priority 3: Normalized name as fallback
  RETURN normalized;
END;
$$;

COMMENT ON FUNCTION public.resolve_merchant_name(text, uuid) IS
  'Normalizes a merchant name and resolves it to a canonical name via alias lookup. Priority: user alias > system alias > normalized fallback.';


-- ---------------------------------------------------------------------------
-- 5. Updated RPC: detect_recurring_transactions with normalization
--    Replaces the version from 20260222100000_secure_rpc_functions.sql
-- ---------------------------------------------------------------------------
-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS public.detect_recurring_transactions(uuid, int);

CREATE OR REPLACE FUNCTION public.detect_recurring_transactions(
  p_user_id uuid,
  p_min_occurrences int DEFAULT 3
)
RETURNS TABLE (
  merchant_name text,
  normalized_name text,
  avg_amount numeric,
  occurrences bigint,
  avg_interval_days numeric,
  last_date date,
  estimated_frequency text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH merchant_txns AS (
    SELECT
      t.merchant_name,
      public.resolve_merchant_name(t.merchant_name, p_user_id) AS resolved_name,
      t.amount,
      t.date,
      lag(t.date) OVER (
        PARTITION BY public.resolve_merchant_name(t.merchant_name, p_user_id)
        ORDER BY t.date
      ) AS prev_date
    FROM public.transactions t
    JOIN public.accounts a ON a.id = t.account_id
    WHERE a.user_id = p_user_id
      AND p_user_id = auth.uid()
      AND t.merchant_name IS NOT NULL
      AND t.merchant_name != ''
      AND t.amount < 0
      AND t.date >= (current_date - interval '6 months')::date
  ),
  merchant_stats AS (
    SELECT
      resolved_name,
      -- Pick the most common raw merchant_name as representative for display
      mode() WITHIN GROUP (ORDER BY merchant_name) AS representative_name,
      round(avg(amount), 2) AS avg_amount,
      count(*) AS occurrences,
      round(avg(date - prev_date), 1) AS avg_interval_days,
      max(date) AS last_date
    FROM merchant_txns
    WHERE prev_date IS NOT NULL
    GROUP BY resolved_name
    HAVING count(*) >= p_min_occurrences
  )
  SELECT
    representative_name AS merchant_name,
    resolved_name AS normalized_name,
    avg_amount,
    occurrences,
    avg_interval_days,
    last_date,
    CASE
      WHEN avg_interval_days BETWEEN 5 AND 9 THEN 'weekly'
      WHEN avg_interval_days BETWEEN 12 AND 17 THEN 'biweekly'
      WHEN avg_interval_days BETWEEN 25 AND 35 THEN 'monthly'
      WHEN avg_interval_days BETWEEN 80 AND 100 THEN 'quarterly'
      WHEN avg_interval_days BETWEEN 350 AND 380 THEN 'yearly'
      ELSE 'irregular'
    END AS estimated_frequency
  FROM merchant_stats
  ORDER BY occurrences DESC;
$$;
