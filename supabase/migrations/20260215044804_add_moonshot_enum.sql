-- Add moonshot to app_ai_provider enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'moonshot' 
    AND enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'app_ai_provider'
    )
  ) THEN
    ALTER TYPE public.app_ai_provider ADD VALUE 'moonshot';
    RAISE NOTICE 'Added moonshot to app_ai_provider enum';
  ELSE
    RAISE NOTICE 'moonshot already exists in app_ai_provider enum';
  END IF;
END $$;
