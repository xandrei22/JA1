-- 005_example_jwt_policies_public_branches.sql
-- Example JWT-based policies for `public.branches` tailored for PostgREST.
-- These are templates — review and adapt claim paths, column names, and
-- role mappings to your application's schema and JWT structure before use.

-- NOTE: PostgREST exposes JWT claims to the DB via GUCs. Commonly used
-- keys are `request.jwt.claims.<claim>` or `jwt.claims.<claim>`. Adjust the
-- `current_setting(...)` calls below to match your PostgREST configuration.

-- Example policies added as `example_*` so you can enable, test, and then
-- replace or rename them when ready.

BEGIN;

-- Safety: only create policies if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches') THEN

    -- Example: allow SELECT for users with claim `role = 'admin'` or the
    -- row owner (assumes a column `owner_id` storing user id that matches
    -- a JWT claim `user_id`). Replace column/claim names as needed.
    IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='example_branches_select_jwt') THEN
      EXECUTE $$
      CREATE POLICY example_branches_select_jwt ON public.branches FOR SELECT
      USING (
        (current_setting('request.jwt.claims.role', true) = 'admin')
        OR (current_setting('request.jwt.claims.user_id', true) IS NOT NULL AND owner_id::text = current_setting('request.jwt.claims.user_id', true))
      );
      $$;
    END IF;

    -- Example: allow INSERT if JWT has `role = 'editor'` or `role = 'admin'`
    IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='example_branches_insert_jwt') THEN
      EXECUTE $$
      CREATE POLICY example_branches_insert_jwt ON public.branches FOR INSERT
      WITH CHECK (
        current_setting('request.jwt.claims.role', true) IN ('editor', 'admin')
      );
      $$;
    END IF;

    -- Example: allow UPDATE for owner or admin/editor roles
    IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='example_branches_update_jwt') THEN
      EXECUTE $$
      CREATE POLICY example_branches_update_jwt ON public.branches FOR UPDATE
      USING (
        current_setting('request.jwt.claims.role', true) = 'admin' OR (current_setting('request.jwt.claims.user_id', true) IS NOT NULL AND owner_id::text = current_setting('request.jwt.claims.user_id', true))
      ) WITH CHECK (
        current_setting('request.jwt.claims.role', true) IN ('editor', 'admin') OR (current_setting('request.jwt.claims.user_id', true) IS NOT NULL AND owner_id::text = current_setting('request.jwt.claims.user_id', true))
      );
      $$;
    END IF;

    -- Example: allow DELETE for admins only
    IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname='public' AND c.relname='branches' AND p.polname='example_branches_delete_jwt') THEN
      EXECUTE $$
      CREATE POLICY example_branches_delete_jwt ON public.branches FOR DELETE
      USING (current_setting('request.jwt.claims.role', true) = 'admin');
      $$;
    END IF;

  END IF;
END$$;

COMMIT;

-- After creating and testing these `example_*` policies, you may:
-- - DROP the previous privilege-based policies
-- - RENAME `example_*` to production names, and/or refine them
-- - Ensure PostgREST is configured to set JWT claim GUCs (see PostgREST docs)
