-- Lesson library + session-to-lesson mapping for Admin material preparation

CREATE TABLE IF NOT EXISTS public.hsk_lessons (
  lesson_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_code text NOT NULL UNIQUE,
  hsk_level smallint NOT NULL CHECK (hsk_level BETWEEN 1 AND 9),
  lesson_no integer NOT NULL CHECK (lesson_no >= 1),
  lesson_title text NOT NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hsk_level, lesson_no)
);

CREATE INDEX IF NOT EXISTS idx_hsk_lessons_level_no ON public.hsk_lessons (hsk_level, lesson_no);

DROP TRIGGER IF EXISTS trg_hsk_lessons_set_updated_at ON public.hsk_lessons;
CREATE TRIGGER trg_hsk_lessons_set_updated_at
BEFORE UPDATE ON public.hsk_lessons
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS public.class_session_material_map (
  map_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
  session_date timestamptz NOT NULL,
  lesson_id uuid REFERENCES public.hsk_lessons(lesson_id) ON DELETE SET NULL,
  mapped_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_class_session_material_map_class_date
  ON public.class_session_material_map (class_id, session_date);

CREATE INDEX IF NOT EXISTS idx_class_session_material_map_lesson
  ON public.class_session_material_map (lesson_id);

DROP TRIGGER IF EXISTS trg_class_session_material_map_set_updated_at ON public.class_session_material_map;
CREATE TRIGGER trg_class_session_material_map_set_updated_at
BEFORE UPDATE ON public.class_session_material_map
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

ALTER TABLE public.hsk_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_session_material_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hsk_lessons read auth" ON public.hsk_lessons;
CREATE POLICY "hsk_lessons read auth"
ON public.hsk_lessons FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "hsk_lessons admin write" ON public.hsk_lessons;
CREATE POLICY "hsk_lessons admin write"
ON public.hsk_lessons FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "class_session_map read auth" ON public.class_session_material_map;
CREATE POLICY "class_session_map read auth"
ON public.class_session_material_map FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "class_session_map admin write" ON public.class_session_material_map;
CREATE POLICY "class_session_map admin write"
ON public.class_session_material_map FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
