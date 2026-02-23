-- ============================================================================
-- Tighten RLS Policies for audit_logs and price_cache
-- ============================================================================
-- MEDIUM security: Restrict audit_logs INSERT to only own records
-- LOW security: Restrict price_cache writes to service role only
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. audit_logs: Enforce user_id check on INSERT
-- --------------------------------------------------------------------------
-- Drop the overly permissive service role policy and replace with user-specific policy
drop policy if exists "Service role can insert audit logs" on public.audit_logs;

create policy "Users can insert own audit logs" on public.audit_logs
  for insert with check (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 2. price_cache: Remove authenticated user write access
-- --------------------------------------------------------------------------
-- Drop policies that allow any authenticated user to write
drop policy if exists "price_cache: authenticated users can upsert" on public.price_cache;
drop policy if exists "price_cache: authenticated users can update" on public.price_cache;

-- Note: Service role can still write via bypass. Regular users can only read.
-- If service role writes are needed, they will work via the service role key.
