import { supabase } from './supabase';

export type EbayItem = {
  title: string;
  price: string | null;
  currency: string;
  itemWebUrl: string;
  imageUrl: string | null;
};

export type EbaySearchResult = {
  market_value_min: number;
  market_value_max: number;
  market_value_median: number;
  avg_growth_percentage: number;
  image_urls: string[];
  ebay_links: string[];
  ebay_items: EbayItem[];
};

export async function searchEbayProducts(
  coinName: string,
  country?: string,
  year?: number | null
): Promise<EbaySearchResult | null> {
  try {
    // Build search query
    const parts = [coinName];
    if (country) parts.push(country);
    if (year) parts.push(String(year));
    parts.push('coin');
    
    const query = parts.join(' ');

    const { data, error } = await supabase.functions.invoke('ebay-search', {
      body: { q: query, limit: 8 },
    });

    if (error) {
      console.warn('eBay search error:', error);
      return null;
    }

    return data as EbaySearchResult;
  } catch (e) {
    console.warn('eBay search failed:', e);
    return null;
  }
}
