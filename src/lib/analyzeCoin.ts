import { supabase } from './supabase';

export type CoinAnalysisResult = {
  name: string;
  country: string;
  year_start: number | null;
  year_end: number | null;
  mintage: number | null;
  composition: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  grade_label: string | null;
  grade_value: number | null;
  denomination: string | null;
  metal_composition_detailed: string | null;
  weight_grams: number | null;
  diameter_mm: number | null;
  thickness_mm: number | null;
  edge_type: string | null;
  designer: string | null;
  history_description: string | null;
  ai_opinion: string | null;
};

export async function analyzeCoinInApp(
  frontImageUrl: string,
  backImageUrl: string,
  userId: string
): Promise<{ coin: any }> {
  const { data, error } = await supabase.functions.invoke('analyze-coin', {
    body: {
      front_image_url: frontImageUrl,
      back_image_url: backImageUrl,
      user_id: userId,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze coin');
  }

  if (!data?.coin) {
    throw new Error(data?.error || 'Failed to analyze coin');
  }

  return data as { coin: any };
}
