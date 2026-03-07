export type BlogCategory = {
  id: number;
  created_at: string;
  name: string;
  sort_order: number;
};

export type BlogPost = {
  id: number;
  created_at: string;
  updated_at: string;
  title: string;
  thumbnail_url: string | null;
  read_time_minutes: number;
  excerpt: string | null;
  content: string | null;
  url: string | null;
  sort_order: number;
  category_id: number | null;
};

export function formatReadTime(minutes: number): string {
  if (minutes <= 0) return '1 min read';
  return `${minutes} min read`;
}
