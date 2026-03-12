-- Allow anonymous users to upload to 'anonymous' folder in coin-scans bucket
CREATE POLICY "coin_scans_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'coin-scans'
    AND (storage.foldername(name))[1] = 'anonymous'
  );

-- Allow anyone to read coins table (for viewing scan results without login)
DROP POLICY IF EXISTS "coins_select" ON public.coins;
CREATE POLICY "coins_select" ON public.coins
  FOR SELECT TO anon, authenticated USING (true);
