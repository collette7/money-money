-- Fix normalize_merchant_name: stacked prefix bug, greedy location stripping, trailing punctuation
CREATE OR REPLACE FUNCTION public.normalize_merchant_name(raw_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  name text;
  prev text;
BEGIN
  IF raw_name IS NULL OR raw_name = '' THEN
    RETURN raw_name;
  END IF;

  name := trim(both from raw_name);

  -- Step 1a: Strip POS/payment processor prefixes (loop until stable for stacked prefixes)
  LOOP
    prev := name;
    name := regexp_replace(name, '^(SQ \*|SP |DD \*|TST\*\s?|AplPay |CHECKCARD |POS |ACH |DEBIT |PURCHASE )', '', 'i');
    EXIT WHEN name = prev;
  END LOOP;

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

  -- Step 6: Strip trailing "CITY STATE" or "CITY CITY STATE" (max 2 words before state code)
  name := regexp_replace(
    name,
    '\s+[A-Za-z]+(\s+[A-Za-z]+)?\s+(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s*$',
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

  -- Step 9: Strip trailing punctuation artifacts
  name := regexp_replace(name, '[\s\-*#/]+$', '');

  -- Collapse multiple spaces and trim
  name := regexp_replace(trim(both from name), '\s{2,}', ' ', 'g');

  RETURN name;
END;
$$;
