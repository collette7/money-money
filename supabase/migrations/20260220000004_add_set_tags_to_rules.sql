ALTER TABLE category_rules ADD COLUMN IF NOT EXISTS set_tags text[] DEFAULT NULL;
