-- This script ensures moonshot is a valid value in the app_ai_provider enum

-- First, check if moonshot already exists in the enum
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
    -- Add moonshot to the enum if it doesn't exist
    ALTER TYPE public.app_ai_provider ADD VALUE 'moonshot';
    RAISE NOTICE 'Added moonshot to app_ai_provider enum';
  ELSE
    RAISE NOTICE 'moonshot already exists in app_ai_provider enum';
  END IF;
END $$;

-- Also add other providers if missing
DO $$
BEGIN
  -- Add gemini if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'gemini' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_ai_provider')
  ) THEN
    ALTER TYPE public.app_ai_provider ADD VALUE 'gemini';
    RAISE NOTICE 'Added gemini to app_ai_provider enum';
  END IF;
  
  -- Add minimax if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'minimax' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_ai_provider')
  ) THEN
    ALTER TYPE public.app_ai_provider ADD VALUE 'minimax';
    RAISE NOTICE 'Added minimax to app_ai_provider enum';
  END IF;
END $$;

-- Show current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'app_ai_provider'
)
ORDER BY enumsortorder;