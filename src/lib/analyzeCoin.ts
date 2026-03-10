import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'];

const COIN_ANALYSIS_PROMPT = `You are an expert numismatist and coin grading specialist. Analyze the provided coin images (obverse/front and reverse/back) and return a detailed JSON object.

Return ONLY valid JSON with these exact fields:
{
  "name": "Full coin name (e.g. Walking Liberty Half Dollar)",
  "country": "Country of origin (e.g. United States)",
  "year_start": 1916,
  "year_end": 1947,
  "mintage": 20000000,
  "composition": "Short composition (e.g. Silver & Copper)",
  "estimated_price_min": 4.23,
  "estimated_price_max": 5.80,
  "grade_label": "Grade label (e.g. Very Fine)",
  "grade_value": 20,
  "denomination": "Denomination with detail (e.g. Half Dollar (50 cents))",
  "metal_composition_detailed": "Detailed composition (e.g. 90% Silver, 10% Copper)",
  "weight_grams": 12.5,
  "diameter_mm": 30.6,
  "thickness_mm": 2.15,
  "edge_type": "Edge description (e.g. Reeded (grooved))",
  "designer": "Designer name",
  "history_description": "A detailed paragraph about the coin's history, significance, and design story.",
  "ai_opinion": "Your expert opinion about this coin's collectibility, market demand, and notable features."
}

Important rules:
- year_start and year_end: if this is a single year coin, set both to the same value
- mintage: total mintage number, use null if unknown
- estimated_price_min/max: estimated market value in USD based on visible condition
- grade_value: Sheldon scale 1-70, estimate from photo quality
- All numeric fields should be numbers (not strings)
- If you cannot determine a field, use null
- Do NOT wrap the JSON in markdown code blocks`;

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

async function callGemini(
  apiKey: string,
  frontBase64: string,
  backBase64: string
): Promise<CoinAnalysisResult> {
  const body = {
    contents: [
      {
        parts: [
          { text: COIN_ANALYSIS_PROMPT },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: frontBase64,
            },
          },
          { text: 'This is the OBVERSE (front) side of the coin.' },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: backBase64,
            },
          },
          { text: 'This is the REVERSE (back) side of the coin.' },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
          const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned) as CoinAnalysisResult;
        }
      }

      const text = await res.text();
      lastError = new Error(`Gemini API error (${model}): ${text}`);
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

export async function analyzeCoinInApp(
  frontImageUri: string,
  backImageUri: string,
  frontImageUrl: string,
  backImageUrl: string,
  userId: string,
  getGeminiKey: () => Promise<string>
): Promise<{ coin: any }> {
  const apiKey = await getGeminiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const [frontBase64, backBase64] = await Promise.all([
    FileSystem.readAsStringAsync(frontImageUri, { encoding: 'base64' }),
    FileSystem.readAsStringAsync(backImageUri, { encoding: 'base64' }),
  ]);

  const coinData = await callGemini(apiKey, frontBase64, backBase64);

  const { data: insertedCoin, error } = await supabase
    .from('coins')
    .insert({
      name: coinData.name ?? 'Unknown Coin',
      country: coinData.country ?? 'Unknown',
      year_start: coinData.year_start ?? null,
      year_end: coinData.year_end ?? null,
      front_image_url: frontImageUrl,
      back_image_url: backImageUrl,
      mintage: coinData.mintage ?? null,
      composition: coinData.composition ?? null,
      estimated_price_min: coinData.estimated_price_min ?? null,
      estimated_price_max: coinData.estimated_price_max ?? null,
      grade_label: coinData.grade_label ?? null,
      grade_value: coinData.grade_value ?? null,
      denomination: coinData.denomination ?? null,
      metal_composition_detailed: coinData.metal_composition_detailed ?? null,
      weight_grams: coinData.weight_grams ?? null,
      diameter_mm: coinData.diameter_mm ?? null,
      thickness_mm: coinData.thickness_mm ?? null,
      edge_type: coinData.edge_type ?? null,
      designer: coinData.designer ?? null,
      history_description: coinData.history_description ?? null,
      ai_opinion: coinData.ai_opinion ?? null,
      scanned_by_user_id: userId,
      scanned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { coin: insertedCoin };
}
