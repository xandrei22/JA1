-- 003_enable_rls_public_all_tables.sql
-- Migration: enable RLS on all tables in schema 'public' that don't have RLS enabled.
-- For each table this creates conservative policies that defer to existing
-- GRANT privileges via has_table_privilege(current_user, '<schema>.<table>', '<RIGHT>').
-- Review and replace these with JWT/role-aware policies for PostgREST after testing.

BEGIN;

DO $$
DECLARE
  r RECORD;
  tbl_text TEXT;
  pk_policy_name TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND NOT c.relrowsecurity
  LOOP
    tbl_text := r.schema || '.' || r.table_name;

    -- Enable RLS for the table
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema, r.table_name);

    -- SELECT policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = r.schema AND c.relname = r.table_name AND p.polname = r.table_name || '_select_by_priv'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR SELECT USING (has_table_privilege(current_user, %L, ''SELECT''))',
        r.table_name || '_select_by_priv', r.schema, r.table_name, tbl_text
      );
    END IF;

    -- INSERT policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = r.schema AND c.relname = r.table_name AND p.polname = r.table_name || '_insert_by_priv'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (has_table_privilege(current_user, %L, ''INSERT''))',
        r.table_name || '_insert_by_priv', r.schema, r.table_name, tbl_text
      );
    END IF;

    -- UPDATE policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = r.schema AND c.relname = r.table_name AND p.polname = r.table_name || '_update_by_priv'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR UPDATE USING (has_table_privilege(current_user, %L, ''UPDATE'')) WITH CHECK (has_table_privilege(current_user, %L, ''UPDATE''))',
        r.table_name || '_update_by_priv', r.schema, r.table_name, tbl_text, tbl_text
      );
    END IF;

    -- DELETE policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = r.schema AND c.relname = r.table_name AND p.polname = r.table_name || '_delete_by_priv'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR DELETE USING (has_table_privilege(current_user, %L, ''DELETE''))',
        r.table_name || '_delete_by_priv', r.schema, r.table_name, tbl_text
      );
    END IF;

  END LOOP;
END$$;

COMMIT;

-- Notes:
-- - This migration is intentionally conservative: policies check the caller's
--   table privileges to avoid accidentally removing access from service roles
--   (e.g. PostgREST DB role). After confirming PostgREST behavior, replace
--   these policies with stricter ones based on JWT claims or role mappings.
-- - Test in staging before applying to production.
