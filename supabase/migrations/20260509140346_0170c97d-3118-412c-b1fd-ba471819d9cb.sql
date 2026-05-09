
CREATE OR REPLACE FUNCTION public.get_conversation_participant(_user_id uuid)
RETURNS TABLE(full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (
          (c.user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.mentor_profiles mp
            WHERE mp.id::text = c.mentor_id AND mp.user_id = _user_id
          ))
          OR
          (c.user_id = _user_id AND EXISTS (
            SELECT 1 FROM public.mentor_profiles mp
            WHERE mp.id::text = c.mentor_id AND mp.user_id = auth.uid()
          ))
        )
      )
    )
$$;
