-- Disable RLS on events table so all authenticated users can query events
alter table public.events disable row level security;

-- Note: attendance_logs RLS was also disabled in a previous migration
