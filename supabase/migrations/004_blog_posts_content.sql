-- Full article body for blog post detail screen
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS content TEXT;
