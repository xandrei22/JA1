-- 004_rollback_rls_public_branches.sql
-- Rollback: disable RLS on public.branches and remove the privilege-based policies
-- created by migration 002_enable_rls_public_branches.sql.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'branches' AND c.relkind = 'r'
  ) THEN

    -- Drop policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='branches_select_by_priv') THEN
      DROP POLICY IF EXISTS branches_select_by_priv ON public.branches;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='branches_insert_by_priv') THEN
      DROP POLICY IF EXISTS branches_insert_by_priv ON public.branches;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='branches_update_by_priv') THEN
      DROP POLICY IF EXISTS branches_update_by_priv ON public.branches;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='branches_delete_by_priv') THEN
      DROP POLICY IF EXISTS branches_delete_by_priv ON public.branches;
    END IF;

    -- Disable RLS (this will remove row-level enforcement)
    ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;

  END IF;
END$$;

COMMIT;

-- Warning: Disabling RLS removes row-level protection. Only run if you
-- intentionally need to revert and have considered security implications.
