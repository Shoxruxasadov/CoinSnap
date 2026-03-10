import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { X, Zap, ZapOff, ImagePlus, Info, Crown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import { analyzeCoinInApp } from '../lib/analyzeCoin';
import { processCoinImage } from '../lib/processCoinImage';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.65;


const ANALYSIS_STEPS = [
  { percent: 15, label: 'Processing images', seconds: 5 },
  { percent: 30, label: 'Removing background', seconds: 8 },
  { percent: 50, label: 'Analyzing coin', seconds: 10 },
  { percent: 70, label: 'Extracting details', seconds: 10 },
  { percent: 85, label: 'Generating report', seconds: 5 },
  { percent: 100, label: 'Almost done', seconds: 3 },
];

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<1 | 2>(1);
  const [flashOn, setFlashOn] = useState(false);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [showSnapGuide, setShowSnapGuide] = useState(false);
  const [zoom, setZoom] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (!processing) return;
    let idx = 0;
    setAnalysisStepIndex(0);
    progressAnim.setValue(0);

    const animate = () => {
      if (idx >= ANALYSIS_STEPS.length) return;
      const target = ANALYSIS_STEPS[idx].percent / 100;
      Animated.timing(progressAnim, {
        toValue: target,
        duration: 1500,
        useNativeDriver: false,
      }).start();
      setAnalysisStepIndex(idx);
      idx++;
      if (idx < ANALYSIS_STEPS.length) {
        setTimeout(animate, 2000);
      }
    };
    animate();
  }, [processing]);

  const handleClose = () => {
    triggerSelection();
    navigation.goBack();
  };

  const processImage = async (uri: string): Promise<string> => {
    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        Image.getSize(
          uri,
          (w, h) => resolve({ width: w, height: h }),
          reject,
        );
      },
    );

    const minDim = Math.min(width, height);
    const cropSize = minDim;
    const originX = Math.floor((width - cropSize) / 2);
    const originY = Math.floor((height - cropSize) / 2);

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [
        { crop: { originX, originY, width: cropSize, height: cropSize } },
        { resize: { width: 800, height: 800 } },
      ],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
    );

    return cropped.uri;
  };

  const uploadImage = async (uri: string, side: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const filename = `${userId}/${Date.now()}_${side}.jpg`;
      const contentType = 'image/jpeg';

      const { data, error } = await supabase.storage
        .from('coin-scans')
        .upload(filename, decode(base64), { contentType, upsert: false });

      if (error) {
        console.error(`Upload ${side} error:`, error);
        return null;
      }

      const { data: publicUrl } = supabase.storage
        .from('coin-scans')
        .getPublicUrl(data.path);

      return publicUrl.publicUrl;
    } catch (err) {
      console.error(`Upload ${side} error:`, err);
      return null;
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    triggerImpact();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) return;

      const processed = await processImage(photo.uri);

      if (step === 1) {
        setFrontImage(processed);
        setStep(2);
      } else {
        setBackImage(processed);
        startProcessing(frontImage!, processed);
      }
    } catch (err) {
      console.error('Capture error:', err);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    triggerSelection();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }

    const existingImageCount = (frontImage ? 1 : 0) + (backImage ? 1 : 0);
    const maxSelectionCount = existingImageCount === 0 ? 2 : 1;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: maxSelectionCount > 1,
      selectionLimit: maxSelectionCount,
      orderedSelection: true,
    });

    if (result.canceled || !result.assets?.length) return;

    if (existingImageCount === 1 && result.assets.length !== 1) {
      Alert.alert(
        'Select required images',
        'Please select exactly 1 more photo to complete the scan.',
      );
      return;
    }

    if (existingImageCount === 0 && result.assets.length >= 2) {
      const [frontAsset, backAsset] = result.assets;
      const processedFront = await processImage(frontAsset.uri);
      const processedBack = await processImage(backAsset.uri);
      setFrontImage(processedFront);
      setBackImage(processedBack);
      startProcessing(processedFront, processedBack);
      return;
    }

    const processed = await processImage(result.assets[0].uri);
    if (existingImageCount === 0) {
      setFrontImage(processed);
      setBackImage(null);
      setStep(2);
      return;
    }

    if (frontImage && !backImage) {
      setBackImage(processed);
      startProcessing(frontImage, processed);
      return;
    }

    if (!frontImage && backImage) {
      setFrontImage(processed);
      startProcessing(processed, backImage);
      return;
    }
  };

  const handleRemoveFront = () => {
    triggerSelection();
    setFrontImage(null);
    setStep(1);
    setBackImage(null);
  };

  const handleRemoveBack = () => {
    triggerSelection();
    setBackImage(null);
    setStep(2);
  };

  const startProcessing = async (front: string, back: string) => {
    if (!userId) {
      Alert.alert('Error', 'Please sign in to scan coins');
      return;
    }

    setProcessing(true);

    try {
      // Background removal + standardization (parallel)
      const [processedFront, processedBack] = await Promise.all([
        processCoinImage(front).then(r => r.processedUri).catch(() => front),
        processCoinImage(back).then(r => r.processedUri).catch(() => back),
      ]);

      const [frontUrl, backUrl] = await Promise.all([
        uploadImage(processedFront, 'front'),
        uploadImage(processedBack, 'back'),
      ]);

      if (!frontUrl || !backUrl) {
        throw new Error('Failed to upload images');
      }

      const data = await analyzeCoinInApp(frontUrl, backUrl, userId);

      setProcessing(false);
      navigation.replace('ScanResult', { coin: data.coin });
    } catch (err: any) {
      setProcessing(false);
      console.error('Processing error:', err);
      Alert.alert('Error', err.message || 'Failed to analyze coin. Please try again.');
      setFrontImage(null);
      setBackImage(null);
      setStep(1);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentAnalysis = ANALYSIS_STEPS[analysisStepIndex] || ANALYSIS_STEPS[0];

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required to scan coins</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.permissionBtn, { marginTop: 12, backgroundColor: '#333' }]} onPress={handleClose}>
            <Text style={styles.permissionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        zoom={zoom}
      />

      {/* Dark overlay with circle cutout */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          {/* Left side with curved corners */}
          <View style={styles.overlaySideContainer}>
            <View style={styles.overlaySideFill} />
            <View style={[styles.curveCorner, styles.curveTopRight]} />
            <View style={[styles.curveCorner, styles.curveBottomRight]} />
          </View>
          {/* Circle cutout */}
          <View style={styles.circleHole}>
            <View
              style={[
                styles.dashedCircle,
                { borderColor: step === 1 ? '#4CAF50' : '#FFFFFF' },
              ]}
            />
          </View>
          {/* Right side with curved corners */}
          <View style={styles.overlaySideContainer}>
            <View style={styles.overlaySideFill} />
            <View style={[styles.curveCorner, styles.curveTopLeft]} />
            <View style={[styles.curveCorner, styles.curveBottomLeft]} />
          </View>
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.premiumPill} activeOpacity={0.8} onPress={() => navigation.navigate('Pro')}>
          <Crown size={16} color="#1a1a1a" fill="#1a1a1a" />
          <Text style={styles.premiumText}>Get unlimited scans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            triggerSelection();
            setFlashOn((v) => !v);
          }}
        >
          {flashOn ? (
            <Zap size={22} color="#DFAC4C" fill="#DFAC4C" />
          ) : (
            <Zap size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Step instruction card */}
      <View style={styles.stepCardContainer}>
        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>STEP {step}</Text>
          <Text style={styles.stepDesc}>
            {step === 1
              ? 'Take a position of observe side to the center'
              : 'Take a position of reverse side to the center'}
          </Text>
        </View>
      </View>

      {/* Thumbnails */}
      <View style={styles.thumbnailsContainer}>
        {frontImage && (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: frontImage }} style={styles.thumbnail} />
            <TouchableOpacity style={styles.thumbnailRemove} onPress={handleRemoveFront}>
              <X size={10} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {backImage && (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: backImage }} style={styles.thumbnail} />
            <TouchableOpacity style={styles.thumbnailRemove} onPress={handleRemoveBack}>
              <X size={10} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        {!frontImage && !backImage && (
          <View style={styles.stepIndicators}>
            <View style={[styles.stepDot, step === 1 && styles.stepDotActive]}>
              <Text style={styles.stepDotText}>1</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Zoom */}
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>0.5</Text>
          <View style={styles.zoomTrack}>
            <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
            <View
              style={[styles.zoomThumb, { left: `${zoom * 100}%` }]}
              {...(Platform.OS === 'ios' ? {} : {})}
            />
          </View>
          <Text style={styles.zoomLabel}>5x</Text>
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            <ImagePlus size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={handleCapture}
            activeOpacity={0.7}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => {
              triggerSelection();
              setShowSnapGuide(true);
            }}
          >
            <Info size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Processing overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <View style={styles.processingImages}>
              {frontImage && (
                <View style={styles.processingImageWrap}>
                  <Image source={{ uri: frontImage }} style={styles.processingImage} />
                </View>
              )}
              {backImage && (
                <View style={styles.processingImageWrap}>
                  <Image source={{ uri: backImage }} style={styles.processingImage} />
                </View>
              )}
            </View>

            <Text style={styles.processingPercent}>{currentAnalysis.percent}%</Text>

            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>

            <View style={styles.processingLabelPill}>
              <Text style={styles.processingLabel}>{currentAnalysis.label}</Text>
            </View>

            <Text style={styles.processingTime}>{currentAnalysis.seconds} second</Text>
          </View>
        </View>
      )}

      {/* Snap Guide Modal */}
      <Modal visible={showSnapGuide} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.snapGuideCard}>
            <Text style={styles.snapGuideTitle}>Snap Guide</Text>
            <Text style={styles.snapGuideDesc}>
              Place the coin in the center and take a clear, well-lit photo
            </Text>
            <View style={styles.snapGuideExamples}>
              <View style={styles.snapGuideExample}>
                <Image
                  source={require('../../assets/home/info1.png')}
                  style={styles.snapGuideImg}
                />
              </View>
              <View style={styles.snapGuideExample}>
                <Image
                  source={require('../../assets/home/coin2.png')}
                  style={styles.snapGuideImg}
                />
              </View>
            </View>
            <TouchableOpacity
              style={styles.snapGuideBtn}
              onPress={() => setShowSnapGuide(false)}
            >
              <Text style={styles.snapGuideBtnText}>Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: '#DFAC4C',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DFAC4C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  premiumText: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: '700',
  },

  // Step card
  stepCardContainer: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  stepCard: {
    backgroundColor: 'rgba(60,60,60,0.85)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stepDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  // Overlay
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: CIRCLE_SIZE,
  },
  overlaySideContainer: {
    flex: 1,
    position: 'relative',
  },
  overlaySideFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: CIRCLE_SIZE / 2,
    backgroundColor: OVERLAY_COLOR,
  },
  curveCorner: {
    position: 'absolute',
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE / 2,
  },
  curveTopRight: {
    top: 0,
    right: 0,
    backgroundColor: OVERLAY_COLOR,
    borderBottomLeftRadius: CIRCLE_SIZE / 2,
  },
  curveBottomRight: {
    bottom: 0,
    right: 0,
    backgroundColor: OVERLAY_COLOR,
    borderTopLeftRadius: CIRCLE_SIZE / 2,
  },
  curveTopLeft: {
    top: 0,
    left: 0,
    backgroundColor: OVERLAY_COLOR,
    borderBottomRightRadius: CIRCLE_SIZE / 2,
  },
  curveBottomLeft: {
    bottom: 0,
    left: 0,
    backgroundColor: OVERLAY_COLOR,
    borderTopRightRadius: CIRCLE_SIZE / 2,
  },
  circleHole: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedCircle: {
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE - 8,
    borderRadius: (CIRCLE_SIZE - 8) / 2,
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: OVERLAY_COLOR,
  },

  // Thumbnails
  thumbnailsContainer: {
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  thumbnailWrap: {
    position: 'relative',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#DFAC4C',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicators: {
    flexDirection: 'row',
    gap: 12,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: '#DFAC4C',
  },
  stepDotText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  zoomLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    width: 28,
    textAlign: 'center',
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  zoomFill: {
    height: 4,
    backgroundColor: '#DFAC4C',
    borderRadius: 2,
  },
  zoomThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DFAC4C',
    marginLeft: -8,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  infoBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: 'rgba(80,80,80,0.9)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  processingImages: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  processingImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#DFAC4C',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  processingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  processingPercent: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 16,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  processingLabelPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  processingLabel: {
    color: '#DFAC4C',
    fontSize: 15,
    fontWeight: '600',
  },
  processingTime: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Snap Guide modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  snapGuideCard: {
    backgroundColor: 'rgba(80,80,80,0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  snapGuideTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  snapGuideDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  snapGuideExamples: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  snapGuideExample: {
    position: 'relative',
    alignItems: 'center',
  },
  snapGuideImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
  },
  snapGuideBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapGuideBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  snapGuideBtnText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '700',
  },
});
