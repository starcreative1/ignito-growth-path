GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT INSERT ON public.waitlist_signups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_signups TO authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

DROP POLICY IF EXISTS "Admins can delete waitlist" ON public.waitlist_signups;
CREATE POLICY "Admins can delete waitlist"
ON public.waitlist_signups
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update waitlist" ON public.waitlist_signups;
CREATE POLICY "Admins can update waitlist"
ON public.waitlist_signups
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);