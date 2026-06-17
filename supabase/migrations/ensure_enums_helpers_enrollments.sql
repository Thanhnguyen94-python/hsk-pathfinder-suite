-- Idempotent migration: ensure enums, helper functions, unique index, and class_enrollments
-- Run this as project owner in Supabase SQL Editor.

DO $$
DECLARE
  specific_type text;
  dup_count int;
  dup_sample text;
BEGIN
  -- 1) create enums if missing
  IF to_regtype('public.app_role') IS NULL THEN
    CREATE TYPE public.app_role AS ENUM ('admin','logistics','teacher','student','care');
  END IF;
  IF to_regtype('public.progress_status') IS NULL THEN
    CREATE TYPE public.progress_status AS ENUM ('active','frozen','expired');
  END IF;
  IF to_regtype('public.class_type') IS NULL THEN
    CREATE TYPE public.class_type AS ENUM ('online_1_1','offline_group');
  END IF;
  IF to_regtype('public.booking_status') IS NULL THEN
    CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled_valid','cancelled_late');
  END IF;

  -- end enums section
END$$;

-- 2) create helper functions (idempotent)
CREATE OR REPLACE FUNCTION public.current_user_specific_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT specific_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    CASE (role::text)
      WHEN 'admin' THEN 'admin'::public.app_role
      WHEN 'logistics' THEN 'logistics'::public.app_role
      WHEN 'teacher' THEN 'teacher'::public.app_role
      WHEN 'student' THEN 'student'::public.app_role
      WHEN 'care' THEN 'care'::public.app_role
      ELSE NULL
    END
  FROM public.users
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(public.current_user_role() = 'admin', false);
$$;

-- Start procedural block for the remaining idempotent steps
DO $$
DECLARE
  specific_type text;
  dup_count int;
  dup_sample text;
BEGIN

  -- 3) ensure specific_id has no duplicates and create unique index
  SELECT count(*) INTO dup_count FROM (
    SELECT specific_id FROM public.users GROUP BY specific_id HAVING COUNT(*) > 1
  ) x;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Found % duplicate specific_id values in public.users. Resolve duplicates before running this migration.', dup_count;
  END IF;

  PERFORM 1; -- continue
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_specific_id_unique ON public.users(specific_id)';

  -- 4) determine type of users.specific_id and create class_enrollments accordingly
  SELECT data_type INTO specific_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='specific_id';
  IF specific_type IS NULL THEN
    RAISE EXCEPTION 'Column public.users.specific_id not found; please ensure public.users exists and has specific_id column.';
  END IF;

  IF to_regclass('public.class_enrollments') IS NULL THEN
    IF specific_type = 'uuid' THEN
      EXECUTE $sql$
        CREATE TABLE public.class_enrollments (
          class_id text NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
          student_id uuid NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
          enrolled_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (class_id, student_id)
        );
      $sql$;
    ELSE
      -- default to text-compatible
      EXECUTE $sql$
        CREATE TABLE public.class_enrollments (
          class_id text NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
          student_id text NOT NULL REFERENCES public.users(specific_id) ON DELETE CASCADE,
          enrolled_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (class_id, student_id)
        );
      $sql$;
    END IF;

    EXECUTE 'ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY';

    BEGIN
      EXECUTE 'CREATE POLICY "enrollments read self/admin" ON public.class_enrollments FOR SELECT TO authenticated USING (student_id::text = public.current_user_specific_id() OR public.is_admin() OR public.current_user_role() IN (''teacher'',''logistics''))';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      EXECUTE 'CREATE POLICY "enrollments admin write" ON public.class_enrollments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- 5) ensure classes.current_students column
  EXECUTE 'ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS current_students integer NOT NULL DEFAULT 0';

  -- populate current_students if enrollments exist
  IF to_regclass('public.class_enrollments') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.classes c
      SET current_students = COALESCE(sub.cnt, 0)
      FROM (
        SELECT class_id, count(*) AS cnt
        FROM public.class_enrollments
        GROUP BY class_id
      ) sub
      WHERE c.class_id = sub.class_id;
    $sql$;
  END IF;

  -- 6) create or replace counts function and trigger attach
  EXECUTE $sql$
  CREATE OR REPLACE FUNCTION public.fn_class_enrollments_update_counts()
  RETURNS trigger LANGUAGE plpgsql AS $fn$
  BEGIN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.classes SET current_students = current_students + 1 WHERE class_id = NEW.class_id;
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.classes SET current_students = GREATEST(current_students - 1, 0) WHERE class_id = OLD.class_id;
      RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.class_id IS DISTINCT FROM NEW.class_id THEN
        UPDATE public.classes SET current_students = GREATEST(current_students - 1, 0) WHERE class_id = OLD.class_id;
        UPDATE public.classes SET current_students = current_students + 1 WHERE class_id = NEW.class_id;
      END IF;
      RETURN NEW;
    END IF;
    RETURN NULL;
  END;
  $fn$;
  $sql$;

  IF to_regclass('public.trg_class_enrollments_counts') IS NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_class_enrollments_counts ON public.class_enrollments';
    EXECUTE 'CREATE TRIGGER trg_class_enrollments_counts AFTER INSERT OR DELETE OR UPDATE ON public.class_enrollments FOR EACH ROW EXECUTE FUNCTION public.fn_class_enrollments_update_counts()';
  END IF;
END$$;

-- End of migration
