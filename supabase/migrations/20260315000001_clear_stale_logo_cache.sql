-- Clear stale merchant_logo_cache entries that will re-resolve with the fixed normalization
DELETE FROM public.merchant_logo_cache
WHERE merchant_name IN ('ace', 'ace hotel -', 'tst*', 'tst', 'acehotelbrooklyn', 'acehotelbrobrooklyn', 'ace hotel');
