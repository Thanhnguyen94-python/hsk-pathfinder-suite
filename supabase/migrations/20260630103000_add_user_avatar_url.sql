-- Migration: add account avatar image URL to users
-- Stores the public URL for the image uploaded when creating an account.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.users.avatar_url IS 'Public URL for the user account image/avatar';

CREATE INDEX IF NOT EXISTS idx_users_avatar_url
  ON public.users (avatar_url)
  WHERE avatar_url IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hsk-account-images',
  'hsk-account-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'hsk account images public read'
  ) THEN
    CREATE POLICY "hsk account images public read"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'hsk-account-images');
  END IF;
END $$;
