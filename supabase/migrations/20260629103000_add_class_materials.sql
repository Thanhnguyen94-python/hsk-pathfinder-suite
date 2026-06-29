-- Add class materials metadata field to support multiple lesson documents per class
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS class_materials jsonb NOT NULL DEFAULT '[]'::jsonb;
