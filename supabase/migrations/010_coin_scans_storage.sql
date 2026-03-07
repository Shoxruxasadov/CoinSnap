-- ============================================
-- COIN SCANS STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('coin-scans', 'coin-scans', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload under their own folder
CREATE POLICY "coin_scans_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'coin-scans'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Anyone can read (images are public)
CREATE POLICY "coin_scans_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'coin-scans');

-- Users can delete their own uploads
CREATE POLICY "coin_scans_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'coin-scans'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
