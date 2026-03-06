-- 002_enable_rls_public_branches.sql
-- Safe example migration: enable RLS on public.branches while preserving
-- existing GRANT-based access by creating policies that defer to table
-- privileges. Review policies and adjust to your PostgREST JWT/role setup.

BEGIN;

-- Only run if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'branches' AND c.relkind = 'r'
  ) THEN

    -- Enable RLS if not already enabled
    IF NOT (
      SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'branches'
    ) THEN
      ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Create safe policies that allow operations only when the calling role
    -- has the corresponding table privilege. This preserves existing access
    -- granted via GRANT statements and avoids accidentally locking out
    -- PostgREST's DB role. Adjust or replace these with stricter policies
    -- that reference JWT claims when ready.

    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'branches' AND p.polname = 'branches_select_by_priv'
    ) THEN
      EXECUTE $$CREATE POLICY branches_select_by_priv ON public.branches FOR SELECT USING (has_table_privilege(current_user, 'public.branches', 'SELECT'))$$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'branches' AND p.polname = 'branches_insert_by_priv'
    ) THEN
      EXECUTE $$CREATE POLICY branches_insert_by_priv ON public.branches FOR INSERT WITH CHECK (has_table_privilege(current_user, 'public.branches', 'INSERT'))$$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'branches' AND p.polname = 'branches_update_by_priv'
    ) THEN
      EXECUTE $$CREATE POLICY branches_update_by_priv ON public.branches FOR UPDATE USING (has_table_privilege(current_user, 'public.branches', 'UPDATE')) WITH CHECK (has_table_privilege(current_user, 'public.branches', 'UPDATE'))$$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'branches' AND p.polname = 'branches_delete_by_priv'
    ) THEN
      EXECUTE $$CREATE POLICY branches_delete_by_priv ON public.branches FOR DELETE USING (has_table_privilege(current_user, 'public.branches', 'DELETE'))$$;
    END IF;

  END IF;
END$$;

COMMIT;

-- Notes:
-- - These policies delegate decision to existing GRANTs via has_table_privilege().
-- - After enabling RLS, consider replacing these with policies based on JWT
--   claims (for PostgREST) such as `current_setting('request.jwt.claims.role', true)`
--   or by mapping JWT role to DB role and creating role-specific policies.
-- - Test carefully in a staging environment before applying to production.
