-- Add material ratings columns to teacher_session_ratings
ALTER TABLE public.teacher_session_ratings
ADD COLUMN IF NOT EXISTS material_stars int CHECK (material_stars BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS material_comment text;
