import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const TARGET_SIZE = 800;
const PADDING_PERCENT = 0.1; // 10% padding around coin

export async function processCoinImage(imageUri: string): Promise<{
  processedUri: string;
  processedBase64: string;
}> {
  // Step 1: Read original image as base64
  const originalBase64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64',
  });

  // Step 2: Try to remove background via Edge Function
  let processedBase64 = originalBase64;
  
  try {
    const { data, error } = await supabase.functions.invoke('process-coin-image', {
      body: { imageBase64: originalBase64 },
    });

    if (!error && data?.processedBase64) {
      processedBase64 = data.processedBase64;
    }
  } catch (e) {
    console.warn('Background removal failed, using original:', e);
  }

  // Step 3: Save processed base64 to temp file
  const tempUri = FileSystem.cacheDirectory + `coin_processed_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(tempUri, processedBase64, {
    encoding: 'base64',
  });

  // Step 4: Standardize the image (resize, center, add padding)
  const standardized = await ImageManipulator.manipulateAsync(
    tempUri,
    [
      { resize: { width: TARGET_SIZE, height: TARGET_SIZE } },
    ],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  // Step 5: Read final base64
  const finalBase64 = await FileSystem.readAsStringAsync(standardized.uri, {
    encoding: 'base64',
  });

  return {
    processedUri: standardized.uri,
    processedBase64: finalBase64,
  };
}

export async function processAndUploadCoinImage(
  imageUri: string,
  userId: string,
  side: 'front' | 'back'
): Promise<{
  processedUri: string;
  uploadedUrl: string;
}> {
  // Process the image
  const { processedUri, processedBase64 } = await processCoinImage(imageUri);

  // Upload to Supabase Storage
  const fileName = `${userId}/${Date.now()}_${side}.jpg`;
  const { data, error } = await supabase.storage
    .from('coin-scans')
    .upload(fileName, decode(processedBase64), {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${side} image: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('coin-scans')
    .getPublicUrl(fileName);

  return {
    processedUri,
    uploadedUrl: urlData.publicUrl,
  };
}

// Helper to decode base64 to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
