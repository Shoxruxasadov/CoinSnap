-- ============================================
-- COMMUNITY IMAGES STORAGE BUCKET
-- ============================================

-- Create storage bucket for community images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "community_images_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "community_images_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'community-images');

-- Allow users to delete their own images
CREATE POLICY "community_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);
