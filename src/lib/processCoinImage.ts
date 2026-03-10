import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const TARGET_SIZE = 800;

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

  const standardized = await ImageManipulator.manipulateAsync(
    tempUri,
    [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.PNG,
    }
  );

  const finalBase64 = await FileSystem.readAsStringAsync(standardized.uri, {
    encoding: 'base64',
  });

  return {
    processedUri: standardized.uri,
    processedBase64: finalBase64,
  };
}
