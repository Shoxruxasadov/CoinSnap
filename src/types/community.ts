export type CommunityPost = {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  content: string;
  image_urls: string[];
  // Joined fields
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
};

export type CommunityReply = {
  id: number;
  created_at: string;
  updated_at: string;
  post_id: number;
  user_id: string;
  content: string;
  // Joined fields
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };
  likes_count?: number;
  is_liked?: boolean;
};

export type SortOption = 'all' | 'my_posts' | 'newest' | 'oldest' | 'high_rated';

export function getDisplayName(user?: CommunityPost['user'] | CommunityReply['user']): string {
  if (!user) return 'Anonymous';
  const metadata = user.user_metadata;
  const name = metadata?.full_name || metadata?.name;
  if (name && String(name).trim()) return String(name).trim();
  return 'Anonymous';
}

export function getAvatarUrl(user?: CommunityPost['user'] | CommunityReply['user']): string | null {
  if (!user?.user_metadata) return null;
  const u = user.user_metadata;
  return u.avatar_url || u.picture || null;
}

export function formatPostDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
}

export function formatPostTime(iso: string): string {
  try {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}
