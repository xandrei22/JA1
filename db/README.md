DB scripts and migrations
=======================

This folder contains DB helper scripts and migrations.

find_tables_without_rls.sql
- Run this script to detect tables in schemas exposed to PostgREST that do NOT
  have Row Level Security (RLS) enabled.

Run example:

```bash
psql "$DATABASE_URL" -f db/scripts/find_tables_without_rls.sql
```

Notes:
- Update the schema list inside `find_tables_without_rls.sql` if PostgREST exposes
  schemas other than `public`.
- Enabling RLS is a deliberate action and may block access if appropriate
  policies are not created. Review access policies before enabling RLS in
  production.

PostgREST role & grants helper
--------------------------------

This repo includes helper migrations to create DB roles that PostgREST can
use and to grant conservative privileges on objects in the `public` schema.

- `db/migrations/006_create_postgrest_roles_and_grants.sql` — creates
  `postgrest_anon`, `postgrest_user`, `postgrest_editor`, and `postgrest_admin`
  roles and grants table/sequence privileges across `public`.
- `db/migrations/002_enable_rls_public_branches.sql` and
  `db/migrations/003_enable_rls_public_all_tables.sql` — enable RLS and create
  safe privilege-based policies.
- `db/migrations/005_example_jwt_policies_public_branches.sql` — example JWT
  claim-based policies for `public.branches` (adapt claim names and columns).

PostgREST configuration notes:

- Configure PostgREST so a JWT claim contains the DB role name (for example
  `role`) and set `role-claim-key = "role"` (or the appropriate key) in the
  PostgREST config. PostgREST will then set the DB role per-request to the
  claim's value and the DB role's grants will apply.
- Alternatively, if you prefer to use a single DB connection role and dispatch
  via JWT to row-level policies, keep a single PostgREST DB role and create
  RLS policies referencing `current_setting('request.jwt.claims.<claim>', true)`
  as shown in `005_example_jwt_policies_public_branches.sql`.

Testing and safety:

- Apply these migrations first in a staging environment and validate PostgREST
  access with representative JWTs.
- If you see unexpected access errors after enabling RLS, you can revert the
  branches-specific change with `db/migrations/004_rollback_rls_public_branches.sql`.

