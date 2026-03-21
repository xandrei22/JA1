-- Migration: create branch_requests table
-- Run this on your Postgres/Supabase DB as a privileged user (service role)

CREATE TABLE IF NOT EXISTS public.branch_requests (
  id BIGSERIAL PRIMARY KEY,
  branch_code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  leader TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_user_id TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by_user_id TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by_user_id TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Optional: prevent duplicate branch_code only while request is pending/approved
DROP INDEX IF EXISTS public.idx_branch_requests_branch_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_requests_branch_code_active
  ON public.branch_requests (branch_code)
  WHERE status IN ('pending', 'approved');

-- Helpful view: pending requests
CREATE OR REPLACE VIEW public.view_branch_requests_pending AS
SELECT id, branch_code, name, address, leader, status, requested_by_user_id, requested_at
FROM public.branch_requests
WHERE status = 'pending';
