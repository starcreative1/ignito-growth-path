GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_signups TO authenticated;
GRANT INSERT ON public.waitlist_signups TO anon;
GRANT ALL ON public.waitlist_signups TO service_role;