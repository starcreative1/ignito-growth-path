
-- 1) mentor_profiles: hide stripe_account_id from clients (anon + authenticated)
REVOKE SELECT ON public.mentor_profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, name, title, category, image_url, rating, review_count,
  price, bio, full_bio, expertise, languages, availability, experience,
  education, certifications, is_active, created_at, updated_at, username
) ON public.mentor_profiles TO anon, authenticated;
-- service_role keeps full access via GRANT ALL default
GRANT ALL ON public.mentor_profiles TO service_role;

-- 2) mentor_products: hide file_url / file_name from anonymous visitors
REVOKE SELECT ON public.mentor_products FROM anon;
GRANT SELECT (
  id, mentor_id, title, description, price, preview_image_url,
  sales_count, total_earnings, is_active, created_at, updated_at,
  average_rating, review_count, preview_image_fit, category,
  category_data, is_free, file_type
) ON public.mentor_products TO anon;
-- authenticated keeps full SELECT (mentor owners need file_url to edit)
GRANT SELECT ON public.mentor_products TO authenticated;
GRANT ALL ON public.mentor_products TO service_role;

-- 3) Revoke EXECUTE on internal SECURITY DEFINER trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_mentor_rating() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_product_rating() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Helper functions: keep authenticated only, revoke anon
REVOKE EXECUTE ON FUNCTION public.get_conversation_participant(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_time_slots_from_weekly(uuid, date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_time_slots_from_weekly(uuid, date, date) TO authenticated;

-- 4) Storage: drop overly-broad SELECT policies that enable listing
DROP POLICY IF EXISTS "Anyone can view avatar photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product previews" ON storage.objects;
-- Public-bucket URLs continue to work (CDN path bypasses RLS); listing is now blocked.

-- 5) avatar-photos: enforce ownership via auth.uid()/ prefix
DROP POLICY IF EXISTS "Mentors can upload avatar photos" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their avatar photos" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their avatar photos" ON storage.objects;

CREATE POLICY "Owners upload to avatar-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatar-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners update their avatar-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatar-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners delete their avatar-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatar-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 6) avatar-voices: enforce ownership via auth.uid()/ prefix (private bucket)
DROP POLICY IF EXISTS "Mentors can upload voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can access their voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their voice samples" ON storage.objects;

CREATE POLICY "Owners read their avatar-voices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatar-voices'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners upload to avatar-voices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatar-voices'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners update their avatar-voices"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatar-voices'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners delete their avatar-voices"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatar-voices'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 7) product-files: allow completed-purchase buyers to read their file
CREATE POLICY "Buyers can read purchased product files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-files'
  AND EXISTS (
    SELECT 1
    FROM public.product_purchases pp
    JOIN public.mentor_products mp ON mp.id = pp.product_id
    WHERE pp.buyer_id = auth.uid()
      AND pp.status = 'completed'
      AND mp.file_url LIKE '%' || storage.objects.name || '%'
  )
);

-- Owners still need SELECT on their own product files
CREATE POLICY "Owners read their product-files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 8) Realtime: lock Broadcast/Presence channel subscriptions by default.
-- Postgres Changes (replication) keep enforcing source-table RLS.
DROP POLICY IF EXISTS "Deny realtime broadcast and presence by default" ON realtime.messages;
CREATE POLICY "Deny realtime broadcast and presence by default"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
