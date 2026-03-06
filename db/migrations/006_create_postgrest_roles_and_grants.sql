-- 006_create_postgrest_roles_and_grants.sql (Supabase-adapted)
-- Grants conservative privileges to Supabase roles (`anon`, `authenticated`)
-- and ensures sequences in `public` are usable. Do NOT create new roles in
-- Supabase-managed databases; use the provided `anon`, `authenticated`, and
-- `service_role` roles instead.

BEGIN;

DO $$
DECLARE
  r RECORD;
  s RECORD;
BEGIN
  -- Ensure schema usage for Supabase roles
  GRANT USAGE ON SCHEMA public TO anon, authenticated;

  -- For each table in public, grant conservative privileges to Supabase roles.
  -- Note: Be conservative with rights to `anon` — typically only `SELECT`.
  FOR r IN
    SELECT n.nspname AS schema, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT ON TABLE %I.%I TO anon', r.schema, r.table_name);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE %I.%I TO authenticated', r.schema, r.table_name);
    -- Grant full CRUD to service_role (used by Supabase server-side operations)
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO service_role', r.schema, r.table_name);
  END LOOP;

  -- Grant USAGE on sequences in public so inserts that use serials work
  FOR s IN
    SELECT sequence_schema AS schema, sequence_name AS seq_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('GRANT USAGE ON SEQUENCE %I.%I TO anon, authenticated, service_role', s.schema, s.seq_name);
  END LOOP;

END$$;

COMMIT;

-- Notes:
-- - Supabase provides three important roles: `anon` (client unauthenticated),
--   `authenticated` (signed-in client), and `service_role` (secret key with
--   elevated privileges). Prefer granting minimal rights to `anon`.
-- - Prefer RLS policies that reference `auth.uid()` and `auth.role()` (Supabase
--   helpers) rather than broad table grants. Use the example JWT policies in
--   `005_example_jwt_policies_public_branches.sql` and then remove wide grants
--   if you lock down by policy.
