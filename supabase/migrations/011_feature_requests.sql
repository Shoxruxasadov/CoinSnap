-- ============================================
-- FEATURE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature requests
CREATE POLICY "feature_requests_select"
  ON public.feature_requests FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create feature requests
CREATE POLICY "feature_requests_insert"
  ON public.feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to increment votes
CREATE OR REPLACE FUNCTION public.increment_feature_votes(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.feature_requests
  SET votes = votes + 1
  WHERE id = request_id;
END;
$$;
