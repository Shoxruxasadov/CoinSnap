import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const TARGET_SIZE = 800;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

export async function processCoinImage(imageUri: string): Promise<{
  processedUri: string;
  processedBase64: string;
}> {
  const originalBase64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: 'base64',
  });

  let processedBase64 = originalBase64;
  let isPng = false;

  try {
    const { data, error } = await supabase.functions.invoke('process-coin-image', {
      body: { imageBase64: originalBase64 },
    });

    if (error) {
      console.warn('process-coin-image invoke error:', error);
    } else if (data?.warning) {
      console.warn('process-coin-image warning:', data.warning);
    }

    if (!error && data?.processedBase64 && !data?.warning) {
      processedBase64 = data.processedBase64;
      isPng = true;
    }
  } catch (e) {
    console.warn('Background removal failed, using original:', e);
  }

  const ext = isPng ? 'png' : 'jpg';
  const tempUri = FileSystem.cacheDirectory + `coin_processed_${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(tempUri, processedBase64, {
    encoding: 'base64',
  });

  const { width: imgW, height: imgH } = await getImageSize(tempUri);
  const actions: ImageManipulator.Action[] = [];

  if (imgW !== imgH) {
    // Make square by cropping the longer side centered
    const side = Math.min(imgW, imgH);
    const originX = Math.round((imgW - side) / 2);
    const originY = Math.round((imgH - side) / 2);
    actions.push({ crop: { originX, originY, width: side, height: side } });
  }

  actions.push({ resize: { width: TARGET_SIZE, height: TARGET_SIZE } });

  const standardized = await ImageManipulator.manipulateAsync(
    tempUri,
    actions,
    { compress: 0.92, format: ImageManipulator.SaveFormat.PNG },
  );

  const finalBase64 = await FileSystem.readAsStringAsync(standardized.uri, {
    encoding: 'base64',
  });

  return {
    processedUri: standardized.uri,
    processedBase64: finalBase64,
  };
}
