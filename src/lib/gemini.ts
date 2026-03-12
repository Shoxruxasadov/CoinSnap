import { supabase } from './supabase';

const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'];

const SYSTEM_PROMPT = `You are an expert numismatist and coin specialist assistant. You help users with:
- Coin identification and authentication
- Grading and condition assessment
- Valuation and market trends
- Coin history and background
- Collecting tips and strategies
- Mintage and rarity information

LANGUAGE: Respond ONLY in the same language the user wrote in. If they write in Uzbek, reply in Uzbek. If in Russian, reply in Russian. If in English, reply in English. Do NOT add any translation, "(English Translation)", or second-language version of your answer. One language only.

LENGTH: Keep your response short. Maximum 20-25 lines. Be concise and to the point.

Be helpful, accurate, and conversational. If analyzing an image, provide detailed but brief observations about the coin's condition, authenticity, and estimated grade.`;

type ChatHistory = { role: 'user' | 'model'; text: string }[];

type ChatInput = {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
};

let cachedApiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const { data, error } = await supabase.functions.invoke('get-gemini-key');

  if (error || !data?.key) {
    throw new Error('Failed to get Gemini API key');
  }

  cachedApiKey = data.key;
  return cachedApiKey;
}

export async function chatWithGemini(
  history: ChatHistory,
  input: ChatInput
): Promise<string> {
  const apiKey = await getGeminiKey();

  const contents: any[] = [];

  if (history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }
  }

  const userParts: any[] = [];

  if (input.imageBase64 && input.mimeType) {
    userParts.push({
      inline_data: {
        mime_type: input.mimeType,
        data: input.imageBase64,
      },
    });
  }

  if (input.text) {
    userParts.push({ text: input.text });
  } else if (input.imageBase64) {
    userParts.push({ text: 'Please analyze this coin image.' });
  }

  if (userParts.length > 0) {
    contents.push({
      role: 'user',
      parts: userParts,
    });
  }

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
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
          return rawText;
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
