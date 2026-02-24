# JA1 Supabase Query (RBAC + QR Attendance)

```sql
create extension if not exists pgcrypto;

create type public.user_role as enum (
  'vip_chairman',
  'supervising_pastor',
  'age_group_chairman',
  'age_group_leader'
);

create type public.attendance_method as enum ('qr', 'manual');

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  branch_code text not null unique,
  branch_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.age_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'age_group_leader',
  branch_id uuid references public.branches(id),
  age_group_id uuid references public.age_groups(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.central_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  first_name text,
  last_name text,
  birthday date,
  age integer,
  address text,
  branch_code text,
  age_group text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.central_users add column if not exists first_name text;
alter table public.central_users add column if not exists last_name text;
alter table public.central_users add column if not exists birthday date;
alter table public.central_users add column if not exists age integer;
alter table public.central_users add column if not exists address text;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_no text not null unique,
  full_name text not null,
  branch_id uuid not null references public.branches(id),
  age_group_id uuid not null references public.age_groups(id),
  is_first_timer boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  branch_id uuid not null references public.branches(id),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.member_credentials (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  branch_code text not null,
  qr_token text not null unique,
  qr_payload text not null,
  backup_code text not null unique,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_member_credentials_member_id
  on public.member_credentials(member_id);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  event_id uuid references public.events(id),
  event_code text not null,
  branch_code text not null,
  method public.attendance_method not null,
  source_code text not null,
  logged_by_user_id uuid references public.profiles(id),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_logs_member_event
  on public.attendance_logs(member_id, event_code);

create unique index if not exists uq_attendance_member_event_once
  on public.attendance_logs(member_id, event_code);

create table if not exists public.first_timer_records (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact_no text,
  branch_id uuid not null references public.branches(id),
  invited_by text,
  noted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_vip_or_pastor()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('vip_chairman', 'supervising_pastor')
      and p.is_active = true
  );
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.same_branch(target_branch uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.branch_id = target_branch
      and p.is_active = true
  );
$$;

create or replace function public.same_age_group(target_age_group uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.age_group_id = target_age_group
      and p.is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.member_credentials enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.first_timer_records enable row level security;

create policy profiles_select_self_or_higher
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_vip_or_pastor()
);

create policy members_select_by_scope
on public.members
for select
using (
  public.is_vip_or_pastor()
  or public.same_branch(branch_id)
  or public.same_age_group(age_group_id)
);

create policy members_write_by_role
on public.members
for all
using (
  public.is_vip_or_pastor()
  or public.current_role() = 'age_group_chairman'
)
with check (
  public.is_vip_or_pastor()
  or public.current_role() = 'age_group_chairman'
);

create policy credentials_select_by_scope
on public.member_credentials
for select
using (
  public.is_vip_or_pastor()
  or exists (
    select 1
    from public.members m
    where m.id = member_id
      and (public.same_branch(m.branch_id) or public.same_age_group(m.age_group_id))
  )
);

create policy credentials_insert_by_manage_roles
on public.member_credentials
for insert
with check (
  public.is_vip_or_pastor()
  or public.current_role() = 'age_group_chairman'
);

create policy attendance_select_by_scope
on public.attendance_logs
for select
using (
  public.is_vip_or_pastor()
  or exists (
    select 1
    from public.members m
    where m.id = member_id
      and (public.same_branch(m.branch_id) or public.same_age_group(m.age_group_id))
  )
);

create policy attendance_insert_by_scope
on public.attendance_logs
for insert
with check (
  public.is_vip_or_pastor()
  or public.current_role() in ('age_group_chairman', 'age_group_leader')
);

create policy first_timers_select_high_roles
on public.first_timer_records
for select
using (
  public.is_vip_or_pastor()
  or public.current_role() = 'age_group_chairman'
);

insert into public.branches (branch_code, branch_name)
values ('DUM', 'JA1 Dumantay')
on conflict (branch_code) do nothing;

insert into public.age_groups (code, display_name)
values
  ('AK', 'Age Group AK'),
  ('AY', 'Age Group AY'),
  ('AP', 'Age Group AP'),
  ('AYA', 'Age Group AYA'),
  ('AMW', 'Age Group AMW'),
  ('AS', 'Age Group AS')
on conflict (code) do nothing;
```

## Notes

- Run the SQL in Supabase SQL Editor as a privileged database role.
- `public.profiles.id` must match `auth.users.id`.
- `uq_attendance_member_event_once` enforces one attendance record per member per event for data integrity.
- Store service role keys only in server-side environment variables.
