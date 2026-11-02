-- Newer Supabase projects do not automatically grant table privileges to the API roles.
-- Without these grants the app gets "permission denied for table ..." (HTTP 403).
-- Row Level Security still restricts every user to their own rows. Safe to run more than once.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_runs TO authenticated;
