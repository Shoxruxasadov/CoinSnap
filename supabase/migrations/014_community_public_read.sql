-- Allow public (anon) read access to community tables and profiles
-- Drop existing select policies that require authentication
DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts;
DROP POLICY IF EXISTS "community_post_likes_select" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_replies_select" ON public.community_replies;
DROP POLICY IF EXISTS "community_reply_likes_select" ON public.community_reply_likes;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Create new policies allowing both anon and authenticated users to read
CREATE POLICY "community_posts_select" ON public.community_posts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "community_post_likes_select" ON public.community_post_likes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "community_replies_select" ON public.community_replies
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "community_reply_likes_select" ON public.community_reply_likes
  FOR SELECT TO anon, authenticated USING (true);

-- Profiles should also be readable by anon for displaying user names/avatars
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
