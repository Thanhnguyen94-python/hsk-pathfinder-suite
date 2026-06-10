-- Migration: add current_students column to classes and maintain via triggers

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS current_students integer NOT NULL DEFAULT 0;

-- Populate current_students from existing enrollments
UPDATE public.classes c
SET current_students = coalesce(sub.cnt, 0)
FROM (
  SELECT class_id, count(*) as cnt
  FROM public.class_enrollments
  GROUP BY class_id
) sub
WHERE c.class_id = sub.class_id;

-- Create function to adjust current_students on insert/delete/update of class_enrollments
CREATE OR REPLACE FUNCTION public.fn_class_enrollments_update_counts()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

-- Attach triggers to class_enrollments
DROP TRIGGER IF EXISTS trg_class_enrollments_counts ON public.class_enrollments;
CREATE TRIGGER trg_class_enrollments_counts
AFTER INSERT OR DELETE OR UPDATE ON public.class_enrollments
FOR EACH ROW EXECUTE FUNCTION public.fn_class_enrollments_update_counts();
