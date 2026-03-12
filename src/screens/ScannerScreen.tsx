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
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { X, Zap, ImagePlus, Info, Crown } from 'lucide-react-native';
import Svg, { Defs, Rect, Mask, Circle as SvgCircle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/MainStack';
import { supabase } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import PagerView from 'react-native-pager-view';
import { triggerSelection, triggerImpact } from '../lib/haptics';
import { analyzeCoinInApp } from '../lib/analyzeCoin';
import { processCoinImage } from '../lib/processCoinImage';
import CoinObserveSvg from '../../assets/guide/coin-observe.svg';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const GUIDE_PAGES = [
  {
    title: 'Keep It Clear',
    description: 'Make sure the coin is in focus and all details are easy to see',
    imageWrong: require('../../assets/guide/1.png'),
    imageRight: require('../../assets/guide/2.png'),
  },
  {
    title: 'Center the Coin',
    description: 'Place the coin fully inside the frame for best alignment',
    imageWrong: require('../../assets/guide/1-1.png'),
    imageRight: require('../../assets/guide/2.png'),
  },
  {
    title: 'Use Good Lighting',
    description: 'Take the photo in bright, even light without shadows or glare',
    imageWrong: require('../../assets/guide/1-2.png'),
    imageRight: require('../../assets/guide/2.png'),
  },
];

const SCREEN_DIMS = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN_DIMS.width;
const SCREEN_HEIGHT = SCREEN_DIMS.height;
const CIRCLE_SIZE = SCREEN_WIDTH * 0.65;
const CIRCLE_RATIO = 0.65;
const CIRCLE_TOP = (SCREEN_HEIGHT - CIRCLE_SIZE) / 2.2;
const CIRCLE_CENTER_Y = CIRCLE_TOP + CIRCLE_SIZE / 2;


const ANALYSIS_STEPS = [
  { percent: 20, label: 'Removing background' },
  { percent: 40, label: 'Uploading images' },
  { percent: 55, label: 'Analyzing coin' },
  { percent: 70, label: 'Identifying details' },
  { percent: 80, label: 'Checking market' },
  { percent: 95, label: 'Generating report' },
  { percent: 100, label: 'Finalizing' },
  { percent: 100, label: 'Almost done' },
];

const DIGIT_HEIGHT = 56;
const SMALL_DIGIT_HEIGHT = 22;

const AnimatedDigit = React.memo(({ digit, small }: { digit: string; small?: boolean }) => {
  const h = small ? SMALL_DIGIT_HEIGHT : DIGIT_HEIGHT;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const [displayDigit, setDisplayDigit] = useState(digit);
  const prevDigit = useRef<string | null>(null);

  useEffect(() => {
    if (prevDigit.current !== null && prevDigit.current !== digit) {
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 70,
        useNativeDriver: true,
      }).start(() => {
        setDisplayDigit(digit);
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 70,
          useNativeDriver: true,
        }).start();
      });
    } else {
      setDisplayDigit(digit);
    }
    prevDigit.current = digit;
  }, [digit]);

  return (
    <View style={[digitStyles.slot, { height: h }]}>
      <Animated.Text style={[small ? digitStyles.smallText : digitStyles.text, { opacity: animOpacity }]}>
        {displayDigit}
      </Animated.Text>
    </View>
  );
});

const digitStyles = StyleSheet.create({
  slot: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'SFCompactRounded-Heavy',
  },
  smallText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SFCompactRounded-Bold',
  },
});

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
  const [guidePageIndex, setGuidePageIndex] = useState(0);
  const guidePagerRef = useRef<PagerView>(null);
  const [lastGalleryPhoto, setLastGalleryPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (showSnapGuide) {
      setGuidePageIndex(0);
      guidePagerRef.current?.setPage(0);
    }
  }, [showSnapGuide]);

  // Fetch the last photo from gallery
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;
      
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 1,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        mediaType: MediaLibrary.MediaType.photo,
      });
      
      if (assets.length > 0) {
        // Get local URI that can be loaded by Image component
        const assetInfo = await MediaLibrary.getAssetInfoAsync(assets[0]);
        if (assetInfo.localUri) {
          setLastGalleryPhoto(assetInfo.localUri);
        }
      }
    })();
  }, []);
  const [zoom, setZoom] = useState(0.5 / 14.5);
  const zoomTrackWidth = useRef(0);
  const zoomTrackX = useRef(0);

  const zoomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.pageX - zoomTrackX.current;
        const clamped = Math.max(0, Math.min(1, x / zoomTrackWidth.current));
        setZoom(clamped);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.pageX - zoomTrackX.current;
        const clamped = Math.max(0, Math.min(1, x / zoomTrackWidth.current));
        setZoom(clamped);
      },
    }),
  ).current;

  const onZoomTrackLayout = (e: LayoutChangeEvent) => {
    zoomTrackWidth.current = e.nativeEvent.layout.width;
    e.target.measureInWindow((x: number) => {
      zoomTrackX.current = x;
    });
  };

  const displayZoom = (0.5 + zoom * 14.5).toFixed(1);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const dashedSpinAnim = useRef(new Animated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = useState(0);
  const displayPercentRef = useRef(0);
  const countTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (!processing) {
      progressAnim.setValue(0);
      dashedSpinAnim.setValue(0);
      return;
    }
    const target = (ANALYSIS_STEPS[analysisStepIndex]?.percent ?? 0) / 100;
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [analysisStepIndex, processing]);

  useEffect(() => {
    if (!processing) return;
    dashedSpinAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(dashedSpinAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [processing]);

  useEffect(() => {
    if (!processing) {
      displayPercentRef.current = 0;
      setDisplayPercent(0);
      if (countTimerRef.current) {
        clearInterval(countTimerRef.current);
        countTimerRef.current = null;
      }
      return;
    }

    const target = currentAnalysis.percent;
    const start = displayPercentRef.current;
    if (start >= target) return;

    const STEP = 2;
    const steps = Math.ceil((target - start) / STEP);
    const tickMs = Math.max(100, Math.floor(2000 / steps));
    let current = start;

    if (countTimerRef.current) clearInterval(countTimerRef.current);

    countTimerRef.current = setInterval(() => {
      current += STEP;
      if (current >= target) current = target;
      displayPercentRef.current = current;
      setDisplayPercent(current);
      if (current >= target) {
        if (countTimerRef.current) clearInterval(countTimerRef.current);
        countTimerRef.current = null;
      }
    }, tickMs);

    return () => {
      if (countTimerRef.current) {
        clearInterval(countTimerRef.current);
        countTimerRef.current = null;
      }
    };
  }, [analysisStepIndex, processing]);

  // Seconds counter removed

  const handleClose = () => {
    triggerSelection();
    navigation.goBack();
  };

  const processImage = async (uri: string, fromCamera: boolean = false): Promise<string> => {
    try {
      const { width: imgW, height: imgH } = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
        },
      );

      const actions: ImageManipulator.Action[] = [];

      if (fromCamera) {
        // Swap dimensions if raw image is landscape but device is portrait (EXIF rotation)
        let photoW = imgW;
        let photoH = imgH;
        if (imgW > imgH && SCREEN_HEIGHT > SCREEN_WIDTH) {
          photoW = imgH;
          photoH = imgW;
        }

        // CameraView aspect-fill: image fills screen, excess is clipped equally on both sides
        // Scale factor: how many photo pixels = 1 screen pixel
        const scaleX = photoW / SCREEN_WIDTH;
        const scaleY = photoH / SCREEN_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Photo area that maps to visible screen
        const visibleW = SCREEN_WIDTH * scale;
        const visibleH = SCREEN_HEIGHT * scale;

        // Offset from photo origin to visible area origin (centered)
        const offsetX = (photoW - visibleW) / 2;
        const offsetY = (photoH - visibleH) / 2;

        // Circle center and radius in photo coordinates
        const cx = offsetX + (SCREEN_WIDTH / 2) * scale;
        const cy = offsetY + CIRCLE_CENTER_Y * scale;
        const r = (CIRCLE_SIZE / 2) * scale;

        // Crop square around circle
        const cropSize = Math.round(r * 2);
        const originX = Math.max(0, Math.min(Math.round(cx - r), photoW - cropSize));
        const originY = Math.max(0, Math.min(Math.round(cy - r), photoH - cropSize));

        console.log('Crop:', {
          screen: { w: SCREEN_WIDTH, h: SCREEN_HEIGHT },
          circleScreen: { cy: CIRCLE_CENTER_Y, size: CIRCLE_SIZE },
          raw: { imgW, imgH },
          photo: { photoW, photoH },
          scale,
          visible: { visibleW, visibleH },
          offset: { offsetX, offsetY },
          crop: { cx, cy, r, originX, originY, cropSize },
        });

        actions.push({ crop: { originX, originY, width: cropSize, height: cropSize } });
        actions.push({ resize: { width: 1000 } });
      } else {
        const maxSize = 1200;
        if (imgW > maxSize || imgH > maxSize) {
          const s = Math.min(maxSize / imgW, maxSize / imgH);
          actions.push({ resize: { width: Math.round(imgW * s), height: Math.round(imgH * s) } });
        }
      }

      if (actions.length === 0) return uri;

      const result = await ImageManipulator.manipulateAsync(uri, actions, {
        compress: 0.92,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return result.uri;
    } catch (err) {
      console.error('processImage error:', err);
      return uri;
    }
  };

  const uploadImage = async (uri: string, side: string): Promise<string | null> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const folder = userId || 'anonymous';
      const filename = `${folder}/${Date.now()}_${side}.png`;
      const contentType = 'image/png';

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
    if (!cameraRef.current) {
      console.error('Camera ref is null');
      Alert.alert('Error', 'Camera is not ready. Please try again.');
      return;
    }
    triggerImpact();

    try {
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      console.log('Photo taken:', photo?.uri ? 'URI received' : 'No URI');

      if (!photo?.uri) {
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
        return;
      }

      console.log('Processing image...');
      const processed = await processImage(photo.uri, true);
      console.log('Image processed:', processed);

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
    setProcessing(true);
    setAnalysisStepIndex(0); // 20% – Removing background

    try {
      const [processedFront, processedBack] = await Promise.all([
        processCoinImage(front).then(r => r.processedUri).catch(() => front),
        processCoinImage(back).then(r => r.processedUri).catch(() => back),
      ]);

      setAnalysisStepIndex(1); // 45% – Uploading images

      const [frontUrl, backUrl] = await Promise.all([
        uploadImage(processedFront, 'front'),
        uploadImage(processedBack, 'back'),
      ]);

      if (!frontUrl || !backUrl) {
        throw new Error('Failed to upload images');
      }

      setAnalysisStepIndex(2); // 55% – Analyzing coin

      let analysisComplete = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      
      // Gradual progress during analysis
      timers.push(setTimeout(() => {
        if (!analysisComplete) setAnalysisStepIndex(3); // 70% – Identifying details
      }, 4000));
      
      timers.push(setTimeout(() => {
        if (!analysisComplete) setAnalysisStepIndex(4); // 80% – Checking market
      }, 8000));
      
      timers.push(setTimeout(() => {
        if (!analysisComplete) setAnalysisStepIndex(5); // 90% – Generating report
      }, 12000));
      
      timers.push(setTimeout(() => {
        if (!analysisComplete) setAnalysisStepIndex(6); // 95% – Finalizing
      }, 18000));

      const data = await analyzeCoinInApp(frontUrl, backUrl, userId);
      analysisComplete = true;
      timers.forEach(t => clearTimeout(t));

      setAnalysisStepIndex(7); // 100% – Almost done
      await new Promise(resolve => setTimeout(resolve, 600));

      setProcessing(false);
      navigation.replace('ScanResult', { coin: data.coin });
    } catch (err: any) {
      setProcessing(false);
      console.error('Processing error:', err);

      if (err.isUnknownCoin) {
        Alert.alert(
          'Unknown Coin',
          'We could not identify this coin. Please make sure you are scanning a real coin and try again with clearer images.',
          [{ text: 'Try Again', style: 'default' }],
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to analyze coin. Please try again.');
      }

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

  // Permission is now requested before navigation from MainTabs
  // If somehow we get here without permission, go back
  useEffect(() => {
    if (permission && !permission.granted) {
      navigation.goBack();
    }
  }, [permission, navigation]);

  // Show nothing while checking permission or if not granted
  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
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
        <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <Defs>
            <Mask id="circleMask">
              <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
              <SvgCircle cx={SCREEN_WIDTH / 2} cy={CIRCLE_CENTER_Y} r={CIRCLE_SIZE / 2} fill="black" />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            fill="rgba(0,0,0,0.55)"
            mask="url(#circleMask)"
          />
          <SvgCircle
            cx={SCREEN_WIDTH / 2}
            cy={CIRCLE_CENTER_Y}
            r={CIRCLE_SIZE / 2 - 4}
            fill="none"
            stroke={step === 1 ? '#4CAF50' : '#FFFFFF'}
            strokeWidth={3}
            strokeDasharray="12 8"
          />
        </Svg>
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

      {/* Thumbnails - always show both slots */}
      <View style={styles.thumbnailsContainer}>
        {/* Slot 1: Observe */}
        <View style={styles.thumbnailSlot}>
          {frontImage ? (
            <View style={styles.thumbnailWrap}>
              <Image source={{ uri: frontImage }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.thumbnailRemove} onPress={handleRemoveFront}>
                <X size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.thumbnailPlaceholder, step === 1 && styles.thumbnailPlaceholderActive]}>
              <CoinObserveSvg width={28} height={24} style={{marginTop: 2}} />
            </View>
          )}
          <Text style={styles.thumbnailLabel}>Observe</Text>
        </View>

        {/* Slot 2: Reverse */}
        <View style={styles.thumbnailSlot}>
          {backImage ? (
            <View style={styles.thumbnailWrap}>
              <Image source={{ uri: backImage }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.thumbnailRemove} onPress={handleRemoveBack}>
                <X size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.thumbnailPlaceholder, step === 2 && styles.thumbnailPlaceholderActive]}>
              <Text style={[styles.thumbnailPlaceholderText, {fontWeight: '900'}]}>1</Text>
            </View>
          )}
          <Text style={styles.thumbnailLabel}>Reverse</Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        {/* Zoom */}
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>{displayZoom}x</Text>
          <View
            style={styles.zoomTrack}
            onLayout={onZoomTrackLayout}
            {...zoomPanResponder.panHandlers}
          >
            <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
            <View style={[styles.zoomThumb, { left: `${zoom * 100}%` }]} />
          </View>
          <Text style={styles.zoomLabel}>15x</Text>
        </View>

        {/* Shutter row */}
        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            {lastGalleryPhoto ? (
              <Image source={{ uri: lastGalleryPhoto }} style={styles.galleryPreview} />
            ) : (
              <ImagePlus size={24} color="#fff" />
            )}
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
                  <Animated.View style={[styles.dashedBorder, { transform: [{ rotate: dashedSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
                  <Image source={{ uri: frontImage }} style={styles.processingImage} />
                </View>
              )}
              {backImage && (
                <View style={styles.processingImageWrap}>
                  <Animated.View style={[styles.dashedBorder, { transform: [{ rotate: dashedSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
                  <Image source={{ uri: backImage }} style={styles.processingImage} />
                </View>
              )}
            </View>

            <View style={styles.percentContainer}>
              <View style={styles.digitsRow}>
                {String(displayPercent).split('').map((d, i, arr) => (
                  <AnimatedDigit key={arr.length - 1 - i} digit={d} />
                ))}
                <Text style={styles.percentSign}>%</Text>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>

            <View style={styles.processingLabelPill}>
              <Text style={styles.processingLabel}>{currentAnalysis.label}</Text>
            </View>

            
          </View>
        </View>
      )}

      {/* Snap Guide Modal */}
      <Modal visible={showSnapGuide} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.snapGuideCard}>
            <PagerView
              ref={guidePagerRef}
              style={styles.snapGuidePager}
              initialPage={0}
              onPageSelected={(e) => setGuidePageIndex(e.nativeEvent.position)}
            >
              {GUIDE_PAGES.map((page, index) => (
                <View key={index} style={styles.snapGuidePage} collapsable={false}>
                  <Text style={styles.snapGuideTitle}>{page.title}</Text>
                  <Text style={styles.snapGuideDesc}>{page.description}</Text>
                  <View style={styles.snapGuideExamples}>
                    <View style={styles.snapGuideExample}>
                      <Image source={page.imageWrong} style={styles.snapGuideImg} resizeMode="cover" />
                  
                    </View>
                    <View style={styles.snapGuideExample}>
                      <Image source={page.imageRight} style={styles.snapGuideImg} resizeMode="cover" />
                 
                    </View>
                  </View>
                </View>
              ))}
            </PagerView>
            <View style={styles.snapGuideDots}>
              {GUIDE_PAGES.map((_, i) => (
                <View
                  key={i}
                  style={[styles.snapGuideDot, guidePageIndex === i && styles.snapGuideDotActive]}
                />
              ))}
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


  // Thumbnails
  thumbnailsContainer: {
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  thumbnailSlot: {
    alignItems: 'center',
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
  thumbnailPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderActive: {
    borderColor: 'rgba(255,255,255,0.6)',
  },
  thumbnailPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 22,
    fontWeight: '900',
  },
  thumbnailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textTransform: 'capitalize',
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
    minWidth: 36,
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
    overflow: 'hidden',
  },
  galleryPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedBorder: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#DFAC4C',
    borderStyle: 'dashed',
  },
  processingImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  percentContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentSign: {
    color: '#fff',
    fontSize: 48,
    fontFamily: 'SFCompactRounded-Heavy',
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
    fontFamily: 'SFCompactRounded-Semibold',
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
    alignItems: 'center',
    maxHeight: '90%',
  },
  snapGuidePager: {
    width: '100%',
    height: 280,
  },
  snapGuidePage: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  snapGuideTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    paddingHorizontal: 28,
  },
  snapGuideDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 28,
  },
  snapGuideExamples: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
    paddingHorizontal: 28,
  },
  snapGuideExample: {
    position: 'relative',
    alignItems: 'center',
  },
  snapGuideImg: {
    width: 120,
    height: 120,
  },
  snapGuideImgPlaceholder: {
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
  snapGuideDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  snapGuideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  snapGuideDotActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  snapGuideBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: '90%',
    alignItems: 'center',
  },
  snapGuideBtnText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '700',
  },
});
