GRANT SELECT ON public.mentor_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mentor_profiles TO authenticated;
GRANT ALL ON public.mentor_profiles TO service_role;