
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_conversation_participant(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_time_slots_from_weekly(uuid, date, date) FROM authenticated;
