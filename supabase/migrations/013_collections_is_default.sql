-- Add is_default flag to collections for the "General" default collection
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
