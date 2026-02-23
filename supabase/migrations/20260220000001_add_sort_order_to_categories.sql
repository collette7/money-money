ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE public.categories SET sort_order = 0 WHERE sort_order IS NULL;
