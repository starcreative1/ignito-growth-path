ALTER TABLE public.mentor_products
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'digital_download',
  ADD COLUMN IF NOT EXISTS category_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mentor_products_mentor_category
  ON public.mentor_products (mentor_id, category);