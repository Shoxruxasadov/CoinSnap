import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const TARGET_SIZE = 512;

let cachedGeminiKey: string | null = null;

async function getGeminiKey(): Promise<string> {
  if (cachedGeminiKey) return cachedGeminiKey;
  const { data, error } = await supabase.functions.invoke('get-gemini-key');
  if (error || !data?.key) throw new Error('Failed to get Gemini API key');
  cachedGeminiKey = data.key;
  return cachedGeminiKey;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

async function detectCoinBounds(
  base64: string,
  imgW: number,
  imgH: number
): Promise<{ x: number; y: number; size: number } | null> {
  try {
    const apiKey = await getGeminiKey();

    const prompt = `Look at this image carefully. Find the coin in the image.

Return ONLY a JSON object with the bounding box of the coin:
{"cx": 0.5, "cy": 0.5, "r": 0.3}

Where:
- cx = center X of the coin as a fraction of image width (0.0 to 1.0)
- cy = center Y of the coin as a fraction of image height (0.0 to 1.0)  
- r = radius of the coin as a fraction of the smaller image dimension (0.0 to 0.5)

Return ONLY the JSON, no other text.`;

    const body = {
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
    };

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );

        if (!res.ok) continue;

        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[^}]+\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        const { cx, cy, r } = parsed;

        if (typeof cx !== 'number' || typeof cy !== 'number' || typeof r !== 'number') continue;
        if (cx < 0 || cx > 1 || cy < 0 || cy > 1 || r <= 0 || r > 0.5) continue;

        const minDim = Math.min(imgW, imgH);
        const radiusPx = r * minDim;
        const centerX = cx * imgW;
        const centerY = cy * imgH;

        // Crop to a square around the coin with comfortable padding
        const padding = radiusPx * 0.45;
        const cropSize = Math.round((radiusPx + padding) * 2);
        const x = Math.max(0, Math.round(centerX - cropSize / 2));
        const y = Math.max(0, Math.round(centerY - cropSize / 2));
        const finalSize = Math.min(cropSize, imgW - x, imgH - y);

        console.log('Coin detected:', { cx, cy, r, centerX, centerY, radiusPx, cropSize: finalSize });

        return { x, y, size: finalSize };
      } catch (e) {
        console.warn('Gemini detect error:', e);
      }
    }

    return null;
  } catch (e) {
    console.warn('detectCoinBounds failed:', e);
    return null;
  }
}

export async function processCoinImage(imageUri: string): Promise<{
  processedUri: string;
  processedBase64: string;
}> {
  const originalBase64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64',
  });

  const { width: imgW, height: imgH } = await getImageSize(imageUri);
  console.log('processCoinImage: image size', imgW, 'x', imgH);

  // Detect coin position using Gemini
  const coinBounds = await detectCoinBounds(originalBase64, imgW, imgH);

  const actions: ImageManipulator.Action[] = [];

  if (coinBounds) {
    console.log('Cropping to detected coin:', coinBounds);
    actions.push({
      crop: {
        originX: coinBounds.x,
        originY: coinBounds.y,
        width: coinBounds.size,
        height: coinBounds.size,
      },
    });
  } else {
    console.log('Coin not detected, using center crop');
    if (imgW !== imgH) {
      const side = Math.min(imgW, imgH);
      const originX = Math.round((imgW - side) / 2);
      const originY = Math.round((imgH - side) / 2);
      actions.push({ crop: { originX, originY, width: side, height: side } });
    }
  }

  actions.push({ resize: { width: TARGET_SIZE, height: TARGET_SIZE } });

  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    actions,
    { compress: 0.92, format: ImageManipulator.SaveFormat.PNG },
  );

  const bgRemovedUri = await removeBackground(result.uri);

  let finalUri = bgRemovedUri || result.uri;

  if (bgRemovedUri) {
    const compressed = await ImageManipulator.manipulateAsync(
      bgRemovedUri,
      [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.PNG },
    );
    finalUri = compressed.uri;
  }

  const finalBase64 = await FileSystem.readAsStringAsync(finalUri, {
    encoding: 'base64',
  });

  return {
    processedUri: finalUri,
    processedBase64: finalBase64,
  };
}

async function removeBackground(imageUri: string): Promise<string | null> {
  try {
    const apiKey = await getGeminiKey();
    const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });

    const models = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];

    for (const model of models) {
      try {
        console.log(`Removing background via Gemini ${model}...`);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Remove the background from this coin image completely. Keep only the coin itself on a fully transparent background. Do not alter, redraw, or modify the coin in any way — preserve every detail exactly as it is. Output a PNG with transparent background.' },
                  { inline_data: { mime_type: 'image/png', data: base64 } },
                ],
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
              },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`Gemini ${model} BG removal failed: ${res.status}`, errText);
          continue;
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts) {
          console.warn(`Gemini ${model}: no parts in response`);
          continue;
        }

        for (const part of parts) {
          if (part.inline_data?.data) {
            const outputPath = `${FileSystem.cacheDirectory}bg_removed_${Date.now()}.png`;
            await FileSystem.writeAsStringAsync(outputPath, part.inline_data.data, { encoding: 'base64' });
            console.log(`BG removed successfully via Gemini ${model}`);
            return outputPath;
          }
        }
        console.warn(`Gemini ${model}: response had parts but no image data`);
      } catch (e) {
        console.warn(`Gemini ${model} BG error:`, e);
      }
    }

    return null;
  } catch (e) {
    console.warn('removeBackground error:', e);
    return null;
  }
}
