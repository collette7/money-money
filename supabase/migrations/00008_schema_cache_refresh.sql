-- This migration adds a schema cache refresh trigger
-- When columns are added to tables, PostgREST's schema cache doesn't automatically update,
-- causing "column not found" errors until the server is restarted or cache is refreshed

-- First, create the function to notify PostgREST of schema changes
CREATE OR REPLACE FUNCTION public.refresh_postgrest_schema_cache()
RETURNS event_trigger AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

-- Then create an event trigger that fires on DDL commands that modify table structure
DO $$
BEGIN
  -- Check if the event trigger already exists to avoid errors
  IF NOT EXISTS (
    SELECT 1 FROM pg_event_trigger WHERE evtname = 'refresh_postgrest_on_ddl'
  ) THEN
    -- Create the event trigger
    CREATE EVENT TRIGGER refresh_postgrest_on_ddl
      ON ddl_command_end
      WHEN TAG IN ('ALTER TABLE', 'CREATE TABLE', 'DROP TABLE', 'CREATE SCHEMA', 'DROP SCHEMA')
      EXECUTE FUNCTION public.refresh_postgrest_schema_cache();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a RPC function to manually refresh the schema cache
CREATE OR REPLACE FUNCTION public.refresh_schema_cache() 
RETURNS void AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
  RAISE NOTICE 'PostgREST schema cache refresh notification sent';
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission on the refresh function to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_schema_cache() TO authenticated;