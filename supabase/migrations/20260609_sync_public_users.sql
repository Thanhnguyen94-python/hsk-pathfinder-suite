-- Migration: sync missing public.users rows from auth.users
-- Inserts a public.users row for any auth.users that don't yet have one.
-- This migration checks whether `auth.users` uses `user_metadata` or `raw_user_meta_data`
-- and extracts `full_name`/`role` if available. Run in Supabase SQL editor or apply
-- with supabase CLI (`supabase db push`).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'user_metadata'
  ) THEN
    INSERT INTO public.users (id, specific_id, full_name, email, role, status, created_at, updated_at)
    SELECT
      u.id,
      gen_random_uuid(),
      (u.user_metadata->>'full_name')::text,
      u.email,
      COALESCE((u.user_metadata->>'role')::text, 'student'),
      'active',
      now(),
      now()
    FROM auth.users u
    LEFT JOIN public.users p ON p.id = u.id
    WHERE p.id IS NULL;

  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data'
  ) THEN
    INSERT INTO public.users (id, specific_id, full_name, email, role, status, created_at, updated_at)
    SELECT
      u.id,
      gen_random_uuid(),
      (u.raw_user_meta_data->>'full_name')::text,
      u.email,
      COALESCE((u.raw_user_meta_data->>'role')::text, 'student'),
      'active',
      now(),
      now()
    FROM auth.users u
    LEFT JOIN public.users p ON p.id = u.id
    WHERE p.id IS NULL;

  ELSE
    -- No metadata column present; insert rows with null full_name and default role 'student'
    INSERT INTO public.users (id, specific_id, full_name, email, role, status, created_at, updated_at)
    SELECT
      u.id,
      gen_random_uuid(),
      NULL,
      u.email,
      'student',
      'active',
      now(),
      now()
    FROM auth.users u
    LEFT JOIN public.users p ON p.id = u.id
    WHERE p.id IS NULL;

  END IF;
END$$;
