
CREATE TABLE public.creator_storefronts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  bio_short TEXT,
  location TEXT,
  location_flag TEXT,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_display JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  has_unpublished_changes BOOLEAN NOT NULL DEFAULT false,
  last_published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_storefronts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published storefronts"
ON public.creator_storefronts FOR SELECT
USING (is_published = true);

CREATE POLICY "Mentors can view their own storefront"
ON public.creator_storefronts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.mentor_profiles mp
  WHERE mp.id = creator_storefronts.mentor_id AND mp.user_id = auth.uid()
));

CREATE POLICY "Mentors can insert their own storefront"
ON public.creator_storefronts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mentor_profiles mp
  WHERE mp.id = creator_storefronts.mentor_id AND mp.user_id = auth.uid()
));

CREATE POLICY "Mentors can update their own storefront"
ON public.creator_storefronts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.mentor_profiles mp
  WHERE mp.id = creator_storefronts.mentor_id AND mp.user_id = auth.uid()
));

CREATE TRIGGER update_creator_storefronts_updated_at
BEFORE UPDATE ON public.creator_storefronts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
