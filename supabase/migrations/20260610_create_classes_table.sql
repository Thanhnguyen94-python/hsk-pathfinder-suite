-- Migration: create classes table
-- Run this in Supabase SQL editor or apply via Supabase CLI

CREATE TABLE IF NOT EXISTS public.classes (
  class_id text PRIMARY KEY,
  class_name text NOT NULL,
  total_lessons integer NOT NULL DEFAULT 15,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  schedule_days smallint[] DEFAULT '{}'::smallint[],
  max_students integer NOT NULL DEFAULT 10,
  teacher_id text,
  room_link text,
  class_materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes (teacher_id);

-- optional: update updated_at on modification
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classes_set_updated_at ON public.classes;
CREATE TRIGGER trg_classes_set_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
