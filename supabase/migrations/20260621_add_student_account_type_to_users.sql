-- Migration: add student account type for student users
-- Stores whether a student account is online or offline.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS student_account_type text;

COMMENT ON COLUMN public.users.student_account_type IS 'Student account type: online or offline';

DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_student_account_type_check
    CHECK (
      (role = 'student' AND student_account_type IN ('online', 'offline'))
      OR (COALESCE(role, '') <> 'student' AND student_account_type IS NULL)
    ) NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_student_account_type ON public.users (student_account_type);
