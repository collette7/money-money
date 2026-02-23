CREATE OR REPLACE FUNCTION public.update_ai_provider_enum(new_values text[])
RETURNS void AS $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY new_values
  LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.app_ai_provider ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'enum value % already exists', v;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;