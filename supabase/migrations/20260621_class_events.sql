-- =============================================================================
-- Migration: class_events
-- Mục đích: Lưu lịch sử toàn bộ sự kiện lớp học (đổi giáo viên, thêm/xoá học viên,
--           cập nhật lớp) để admin có thể truy vấn và kiểm tra lại.
-- Phương pháp: App-level logging (server functions ghi vào bảng sau mỗi mutation).
-- =============================================================================

-- Bảng chính
CREATE TABLE IF NOT EXISTS public.class_events (
  event_id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          text        NOT NULL REFERENCES public.classes(class_id) ON DELETE CASCADE,
  event_type        text        NOT NULL,         -- 'teacher_changed' | 'student_added' | 'student_removed' | 'class_created' | 'class_updated'
  actor_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_specific_id text,                         -- specific_id của người thực hiện (admin/staff)
  details           jsonb       NOT NULL DEFAULT '{}',   -- context tự do
  previous_value    jsonb,                         -- snapshot trước khi thay đổi
  new_value         jsonb,                         -- snapshot sau khi thay đổi
  source            text        NOT NULL DEFAULT 'app',  -- 'app' | 'db-trigger' | 'manual'
  event_ts          timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Indexes cho query thường gặp
CREATE INDEX IF NOT EXISTS idx_class_events_class_id         ON public.class_events(class_id);
CREATE INDEX IF NOT EXISTS idx_class_events_event_ts         ON public.class_events(event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_class_events_event_type       ON public.class_events(event_type);
CREATE INDEX IF NOT EXISTS idx_class_events_actor_specific_id ON public.class_events(actor_specific_id);

-- RLS: bật Row Level Security, chỉ đọc qua service-role hoặc authenticated
ALTER TABLE public.class_events ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated user có thể đọc (service-role bypass RLS automatically)
DROP POLICY IF EXISTS "class_events_read_authenticated" ON public.class_events;
CREATE POLICY "class_events_read_authenticated"
  ON public.class_events
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service-role write (app-level inserts dùng supabaseAdmin, không cần policy)

-- =============================================================================
-- RPC: get_class_events — đọc sự kiện kèm tên actor
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_class_events(
  p_class_id text,
  p_limit    int DEFAULT 100
)
RETURNS TABLE (
  event_id          uuid,
  class_id          text,
  event_type        text,
  actor_id          uuid,
  actor_specific_id text,
  actor_name        text,
  details           jsonb,
  previous_value    jsonb,
  new_value         jsonb,
  source            text,
  event_ts          timestamptz,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    e.event_id,
    e.class_id,
    e.event_type,
    e.actor_id,
    e.actor_specific_id,
    u.full_name  AS actor_name,
    e.details,
    e.previous_value,
    e.new_value,
    e.source,
    e.event_ts,
    e.created_at
  FROM public.class_events e
  LEFT JOIN public.users u
    ON u.id = e.actor_id
    OR u.specific_id::text = e.actor_specific_id
  WHERE e.class_id = p_class_id
  ORDER BY e.event_ts DESC
  LIMIT p_limit;
$$;

-- Cấp quyền cho authenticated user gọi RPC
REVOKE EXECUTE ON FUNCTION public.get_class_events(text, int) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_class_events(text, int) TO authenticated;

-- =============================================================================
-- (TÙY CHỌN) DB Triggers — bỏ comment để kích hoạt fallback DB-level logging.
-- Chỉ nên dùng khi cần bắt các thao tác DB trực tiếp (bypass server functions).
-- Lưu ý: nếu bật cùng app-level logging sẽ tạo sự kiện trùng lặp (source khác nhau).
-- =============================================================================

-- -- Trigger cho class_enrollments (student_added / student_removed)
-- CREATE OR REPLACE FUNCTION public.fn_log_class_enrollment_event()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     INSERT INTO public.class_events(class_id, event_type, details, new_value, source)
--     VALUES (NEW.class_id, 'student_added',
--       jsonb_build_object('student_id', NEW.student_id, 'enrolled_at', NEW.enrolled_at),
--       to_jsonb(NEW), 'db-trigger');
--     RETURN NEW;
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO public.class_events(class_id, event_type, details, previous_value, source)
--     VALUES (OLD.class_id, 'student_removed',
--       jsonb_build_object('student_id', OLD.student_id),
--       to_jsonb(OLD), 'db-trigger');
--     RETURN OLD;
--   END IF;
--   RETURN NULL;
-- END;
-- $$;
-- DROP TRIGGER IF EXISTS trg_log_class_enrollment_event ON public.class_enrollments;
-- CREATE TRIGGER trg_log_class_enrollment_event
--   AFTER INSERT OR DELETE ON public.class_enrollments
--   FOR EACH ROW EXECUTE FUNCTION public.fn_log_class_enrollment_event();

-- -- Trigger cho classes (teacher_changed)
-- CREATE OR REPLACE FUNCTION public.fn_log_class_teacher_change()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   IF TG_OP = 'UPDATE' AND OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
--     INSERT INTO public.class_events(class_id, event_type, details, previous_value, new_value, source)
--     VALUES (NEW.class_id, 'teacher_changed',
--       jsonb_build_object('old_teacher_id', OLD.teacher_id, 'new_teacher_id', NEW.teacher_id),
--       jsonb_build_object('teacher_id', OLD.teacher_id),
--       jsonb_build_object('teacher_id', NEW.teacher_id),
--       'db-trigger');
--   END IF;
--   RETURN NEW;
-- END;
-- $$;
-- DROP TRIGGER IF EXISTS trg_log_class_teacher_change ON public.classes;
-- CREATE TRIGGER trg_log_class_teacher_change
--   AFTER UPDATE ON public.classes
--   FOR EACH ROW EXECUTE FUNCTION public.fn_log_class_teacher_change();
