-- Migration: create public.users table and insert admin row
-- Run this in Supabase SQL editor or apply with supabase CLI (`supabase db push`).

-- Enable required extensions if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create minimal users table expected by the app
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  specific_id uuid DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  birth_year int,
  role text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert admin row (replace id/email if needed)
INSERT INTO public.users (id, specific_id, full_name, email, role, status)
VALUES (
  '53b2512f-da4b-413b-8349-73ba0516accf', -- admin auth user id
  gen_random_uuid(),
  'Admin User',
  'nguyenvanthanh110394@gmail.com',
  'admin',
  'active'
)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status, updated_at = now();
