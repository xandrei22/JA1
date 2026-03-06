-- find_tables_without_rls.sql
--
-- Lists tables in specified schemas that do NOT have row level security (RLS) enabled.
-- Adjust the schema list in the WHERE clause to match schemas exposed to PostgREST.

-- Example: run with psql
-- psql "$DATABASE_URL" -f db/scripts/find_tables_without_rls.sql

SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COALESCE(string_agg(p.polname, ', '), '') AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relkind = 'r'
  -- List schemas exposed to PostgREST here (add any others as needed)
  AND n.nspname IN ('public')
  -- Only return tables that do NOT have RLS enabled
  AND NOT c.relrowsecurity
GROUP BY n.nspname, c.relname, c.relrowsecurity
ORDER BY n.nspname, c.relname;
