GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.waitlist_signups TO authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;