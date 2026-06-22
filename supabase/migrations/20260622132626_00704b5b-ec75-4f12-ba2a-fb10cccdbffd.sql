
-- 1. Hide stripe_account_id from anon/authenticated (only service_role can read)
REVOKE SELECT (stripe_account_id) ON public.mentor_profiles FROM anon, authenticated, PUBLIC;

-- 2. Hide voice_sample_url from anonymous users (owners are authenticated and can still read)
REVOKE SELECT (voice_sample_url) ON public.mentor_avatars FROM anon, PUBLIC;

-- 3. message_reactions: allow mentors to view & add reactions in their conversations
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON public.message_reactions;
CREATE POLICY "Participants can view reactions"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mentor_profiles mp
          WHERE mp.id::text = c.mentor_id AND mp.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Participants can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_reactions.message_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mentor_profiles mp
          WHERE mp.id::text = c.mentor_id AND mp.user_id = auth.uid()
        )
      )
  )
);

-- 4. message_read_receipts: allow mentors to view & create read receipts
DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON public.message_read_receipts;
CREATE POLICY "Participants can view read receipts"
ON public.message_read_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = message_read_receipts.conversation_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mentor_profiles mp
          WHERE mp.id::text = c.mentor_id AND mp.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can create read receipts in their conversations" ON public.message_read_receipts;
CREATE POLICY "Participants can create read receipts"
ON public.message_read_receipts
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = message_read_receipts.conversation_id
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mentor_profiles mp
          WHERE mp.id::text = c.mentor_id AND mp.user_id = auth.uid()
        )
      )
  )
);
