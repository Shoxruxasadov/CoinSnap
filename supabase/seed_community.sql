-- Community Posts Seed Data
-- Generated from data/community_posts.csv
-- Run this after you have at least one user in auth.users

-- Post 1
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'I picked up this 1921 Morgan Silver Dollar today at a local market. Weight shows 26.7g, but some edge details look unusually soft. Anyone experienced with this coin? Does it look authentic to you?', ARRAY['https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400', 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400']
FROM auth.users
LIMIT 1;

-- Post 2
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Finally got my hands on a 1943 Walking Liberty Half Dollar. Condition seems really good. The app estimated $18-$25. For those who collect this series: is this accurate or should it be higher?', ARRAY['https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400', 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400']
FROM auth.users
LIMIT 1;

-- Post 3
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Just inherited a collection from my grandfather. About 200+ coins from various eras. Where should I start with cataloging? Any tips for beginners?', '{}'
FROM auth.users
LIMIT 1;

-- Post 4
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Question for the experts: what''s the best way to clean old copper coins without damaging them? I''ve heard mixed advice.', '{}'
FROM auth.users
LIMIT 1;

-- Post 5
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Sharing my latest find - a beautiful 1964 Kennedy Half Dollar in uncirculated condition. The mint luster is incredible!', ARRAY['https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400']
FROM auth.users
LIMIT 1;

-- Post 6
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Does anyone know a reputable coin grading service that ships internationally? I''m based in Europe.', '{}'
FROM auth.users
LIMIT 1;

-- Post 7
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'Pro tip: always check the edge lettering on silver dollars. It''s one of the easiest ways to spot counterfeits.', '{}'
FROM auth.users
LIMIT 1;

-- Post 8
INSERT INTO public.community_posts (user_id, content, image_urls)
SELECT id, 'My local coin show is this weekend! Who else is going? Looking for 19th century European coins.', '{}'
FROM auth.users
LIMIT 1;

