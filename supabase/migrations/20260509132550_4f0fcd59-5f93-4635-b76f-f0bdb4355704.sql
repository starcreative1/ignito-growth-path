
-- Deduplicate mentor_avatars: keep only the latest row per mentor_id
DELETE FROM public.mentor_avatars a
USING public.mentor_avatars b
WHERE a.mentor_id = b.mentor_id
  AND a.created_at < b.created_at;

-- Enforce one avatar per mentor going forward
ALTER TABLE public.mentor_avatars
  ADD CONSTRAINT mentor_avatars_mentor_id_key UNIQUE (mentor_id);
