-- Make branch_id optional for events table
-- This allows events to be created even if branch lookup fails
-- (they still have a backup code and can be used for attendance)

alter table public.events 
  alter column branch_id drop not null;
