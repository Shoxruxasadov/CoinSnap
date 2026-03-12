-- Add login streak fields to profiles for achievements
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at DATE,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
