-- Migration: add staff_code to users for human-friendly staff IDs
-- Adds `staff_code` column and a lightweight check constraint enforcing prefix

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS staff_code text;

COMMENT ON COLUMN public.users.staff_code IS 'Human-friendly staff code like ST-1234, TC-1234, AD-123, LG-1234, CR-123';

-- Lightweight pattern check: allow prefixes ST,TC,AD,LG,CR followed by digits
-- Postgres does not support `ADD CONSTRAINT IF NOT EXISTS` — drop if exists then add
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_staff_code_pattern_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_staff_code_pattern_check CHECK (staff_code IS NULL OR staff_code ~ '^(ST|TC|AD|LG|CR)-[0-9]+$');

-- Add index to make lookups by staff_code fast
CREATE INDEX IF NOT EXISTS idx_users_staff_code ON public.users (staff_code);
