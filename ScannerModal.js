import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Text,
  Dimensions,
  StatusBar,
  Image,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { 
  X, 
  Lightning, 
  Info, 
  Scan, 
  Barcode, 
  Image as ImageIcon,
  Fire,
  Minus,
  Plus,
  Trash,
  ArrowCounterClockwise,
} from 'phosphor-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeFoodImage, lookupBarcode } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { dailyLogService } from '../services/dailyLogService';
import { useAuthStore } from '../store';
import { useTheme } from '../theme';
import { useTranslation } from '../i18n';

const { width, height } = Dimensions.get('window');
const FREE_SCANS_PER_DAY = 1;
const SCAN_COUNT_KEY_PREFIX = 'calorion_scan_count_';
const ONE_TIME_OFFER_EVER_HAD_PRO_KEY = '@calway_one_time_offer_ever_had_pro';
const FRAME_SIZE = width - 80;
const BARCODE_FRAME_WIDTH = width - 60;
const BARCODE_FRAME_HEIGHT = 140;

// Screen states
const SCREEN_STATES = {
  CAMERA: 'camera',
  SCANNING: 'scanning',
  RESULT: 'result',
  ERROR: 'error',
};

// Tab constants for animation
const TAB_GAP = 12;
const TAB_PADDING = 16;
const TAB_COUNT = 3;
const TAB_WIDTH = (width - (TAB_PADDING * 2) - (TAB_GAP * (TAB_COUNT - 1))) / TAB_COUNT;

// Snap Tips Modal Component
const SnapTipsModal = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  if (!visible) return null;
  
  // Food images for snap tips
  // Place proper food images in assets/SnapTips/ folder:
  // - good.png: Full plate view (best angle)
  // - bad1.png: Too close crop
  // - bad2.png: Too close crop
  const goodFoodImage = require('../../assets/SnapTips/good.png');
  const badFoodImage1 = require('../../assets/SnapTips/bad1.png');
  const badFoodImage2 = require('../../assets/SnapTips/bad2.png');
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={snapTipsStyles.container}>
        {/* Content */}
        <View style={[snapTipsStyles.content, { paddingTop: insets.top + 80 }]}>
          <Text style={snapTipsStyles.title}>{t('scanner.snapTips')}</Text>
          
          {/* Good Example */}
          <View style={snapTipsStyles.goodExample}>
            <View style={snapTipsStyles.goodImageWrapper}>
              <View style={snapTipsStyles.goodImageContainer}>
                <Image 
                  source={goodFoodImage} 
                  style={snapTipsStyles.goodImage}
                  resizeMode="cover"
                />
              </View>
              <View style={snapTipsStyles.checkBadge}>
                <Text style={snapTipsStyles.checkIcon}>✓</Text>
              </View>
            </View>
            <Text style={snapTipsStyles.goodLabel}>{t('scanner.snapFront')}</Text>
          </View>
          
          {/* Bad Examples */}
          <View style={snapTipsStyles.badExamples}>
            <View style={snapTipsStyles.badExample}>
              <View style={snapTipsStyles.badImageWrapper}>
                <View style={snapTipsStyles.badImageContainer}>
                  <Image 
                    source={badFoodImage1} 
                    style={snapTipsStyles.badImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={snapTipsStyles.xBadge}>
                  <Text style={snapTipsStyles.xIcon}>✕</Text>
                </View>
              </View>
              <Text style={snapTipsStyles.badLabel}>{t('scanner.tooClose')}</Text>
            </View>
            
            <View style={snapTipsStyles.badExample}>
              <View style={snapTipsStyles.badImageWrapper}>
                <View style={snapTipsStyles.badImageContainer}>
                  <Image 
                    source={badFoodImage2} 
                    style={snapTipsStyles.badImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={snapTipsStyles.xBadge}>
                  <Text style={snapTipsStyles.xIcon}>✕</Text>
                </View>
              </View>
              <Text style={snapTipsStyles.badLabel}>{t('scanner.tooClose')}</Text>
            </View>
          </View>
        </View>
        
        {/* Understand Button */}
        <View style={[snapTipsStyles.buttonContainer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity 
            style={snapTipsStyles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={snapTipsStyles.buttonText}>{t('scanner.understand')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const snapTipsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 60,
    letterSpacing: -0.5,
  },
  goodExample: {
    alignItems: 'center',
    marginBottom: 60,
  },
  goodImageWrapper: {
    position: 'relative',
  },
  goodImageContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffffff',
    padding: 0,
    overflow: 'hidden',
  },
  goodImage: {
    width: 180,
    height: 180,
    borderRadius: 84,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  goodLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    letterSpacing: -0.3,
  },
  badExamples: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  badExample: {
    alignItems: 'center',
  },
  badImageWrapper: {
    position: 'relative',
  },
  badImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    padding: 0,
    overflow: 'hidden',
  },
  badImage: {
    width: 100,
    height: 100,
    borderRadius: 46,
  },
  xBadge: {
    position: 'absolute',
    top: 0,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  xIcon: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  badLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    letterSpacing: -0.2,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
});

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ScannerModal = ({ visible, onClose, onFoodScanned, userId, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isPro } = useAuthStore();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const hasRequestedPermissionRef = useRef(false);
  const [remainingScans, setRemainingScans] = useState(FREE_SCANS_PER_DAY);

  // When scan is opened, request camera permission immediately (system dialog only, no custom screen)
  useEffect(() => {
    if (!visible) {
      hasRequestedPermissionRef.current = false;
      return;
    }
    if (permission && !permission.granted && !hasRequestedPermissionRef.current) {
      hasRequestedPermissionRef.current = true;
      requestPermission().then((result) => {
        if (!result?.granted) onClose();
      });
    }
  }, [visible, permission, requestPermission, onClose]);

  // Load remaining scans for today when modal opens (non-Pro only)
  useEffect(() => {
    if (!visible || isPro) return;
    const key = SCAN_COUNT_KEY_PREFIX + getTodayStr();
    AsyncStorage.getItem(key).then((val) => {
      const count = val ? parseInt(val, 10) : 0;
      setRemainingScans(Math.max(0, FREE_SCANS_PER_DAY - count));
    });
  }, [visible, isPro]);

  const [activeTab, setActiveTab] = useState('scan');
  const [torchOn, setTorchOn] = useState(false);
  const [screenState, setScreenState] = useState(SCREEN_STATES.CAMERA);
  const [capturedImage, setCapturedImage] = useState(null);
  const [foodResult, setFoodResult] = useState(null);
  const [servings, setServings] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSnapTips, setShowSnapTips] = useState(false);
  
  // Animation for scanning
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Animation for tab indicator
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for frame size (scan food vs barcode)
  const frameWidthAnim = useRef(new Animated.Value(FRAME_SIZE)).current;
  const frameHeightAnim = useRef(new Animated.Value(FRAME_SIZE)).current;
  const frameOpacity = useRef(new Animated.Value(1)).current;
  
  // Animation for barcode title
  const barcodeTitleOpacity = useRef(new Animated.Value(0)).current;
  const barcodeTitleTranslateY = useRef(new Animated.Value(-30)).current;

  const tabs = [
    { id: 'scan', label: t('scanner.scanFood'), icon: Scan },
    { id: 'barcode', label: t('scanner.barcode'), icon: Barcode },
    { id: 'gallery', label: t('scanner.gallery'), icon: ImageIcon },
  ];
  
  // Get tab index
  const getTabIndex = (tabId) => tabs.findIndex(t => t.id === tabId);
  
  // Animate tab indicator when activeTab changes
  useEffect(() => {
    const index = getTabIndex(activeTab);
    if (index !== -1) {
      const targetX = index * (TAB_WIDTH + TAB_GAP);
      Animated.spring(tabIndicatorAnim, {
        toValue: targetX,
        friction: 20,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [activeTab]);

  useEffect(() => {
    if (screenState === SCREEN_STATES.SCANNING) {
      startScanAnimation();
    }
  }, [screenState]);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setScreenState(SCREEN_STATES.CAMERA);
      setCapturedImage(null);
      setFoodResult(null);
      setServings(1);
      setErrorMessage('');
      setTorchOn(false);
      setActiveTab('scan');
      // Reset tab indicator position
      tabIndicatorAnim.setValue(0);
      // Reset frame size to scan food size
      frameWidthAnim.setValue(FRAME_SIZE);
      frameHeightAnim.setValue(FRAME_SIZE);
      // Reset barcode title animation
      barcodeTitleOpacity.setValue(0);
      barcodeTitleTranslateY.setValue(-30);
    }
  }, [visible]);

  const startScanAnimation = () => {
    // Pulse animation for the image
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Scan line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    // When scan left is 0 (non-Pro), open Pro/OneTimeOffer instead of scanning
    if (!isPro && remainingScans === 0 && navigation) {
      const everHadPro = (await AsyncStorage.getItem(ONE_TIME_OFFER_EVER_HAD_PRO_KEY)) === 'true';
      if (everHadPro) {
        navigation.navigate('Pro', { fromScanner: true });
      } else {
        navigation.navigate('OneTimeOffer', { fromScanner: true });
      }
      onClose();
      return;
    }

    // Haptic feedback on capture
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });
      
      setCapturedImage(photo);
      setScreenState(SCREEN_STATES.SCANNING);
      
      // Analyze the image
      await analyzeImage(photo.base64, 'image/jpeg');
    } catch (error) {
      console.error('Error capturing photo:', error);
      setErrorMessage(t('scanner.captureFailed'));
      setScreenState(SCREEN_STATES.ERROR);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        setCapturedImage({ uri: photo.uri, base64: photo.base64 });
        setScreenState(SCREEN_STATES.SCANNING);
        
        // Analyze the image
        await analyzeImage(photo.base64, 'image/jpeg');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setErrorMessage(t('scanner.pickFailed'));
      setScreenState(SCREEN_STATES.ERROR);
    }
  };

  const consumeScanAndNotify = async (foodData, options = {}) => {
    if (!isPro) {
      const key = SCAN_COUNT_KEY_PREFIX + getTodayStr();
      const raw = await AsyncStorage.getItem(key);
      const count = (raw ? parseInt(raw, 10) : 0) + 1;
      await AsyncStorage.setItem(key, String(count));
      setRemainingScans((prev) => Math.max(0, prev - 1));
    }
    if (onFoodScanned) onFoodScanned(foodData, options);
  };

  const handleTabPress = (tabId) => {
    if (tabId === 'gallery') {
      handleGalleryPick();
    } else {
      setActiveTab(tabId);
      
      // Animate frame size change
      const isBarcode = tabId === 'barcode';
      const targetWidth = isBarcode ? BARCODE_FRAME_WIDTH : FRAME_SIZE;
      const targetHeight = isBarcode ? BARCODE_FRAME_HEIGHT : FRAME_SIZE;
      
      Animated.parallel([
        Animated.spring(frameWidthAnim, {
          toValue: targetWidth,
          friction: 12,
          tension: 100,
          useNativeDriver: false,
        }),
        Animated.spring(frameHeightAnim, {
          toValue: targetHeight,
          friction: 12,
          tension: 100,
          useNativeDriver: false,
        }),
      ]).start();
      
      // Animate barcode title
      if (isBarcode) {
        // Show title - fall from sky
        barcodeTitleTranslateY.setValue(-30);
        barcodeTitleOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(barcodeTitleTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.timing(barcodeTitleOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Hide title - fly up and fade
        Animated.parallel([
          Animated.timing(barcodeTitleTranslateY, {
            toValue: -30,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(barcodeTitleOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  const analyzeImage = async (base64, mimeType) => {
    try {
      // Upload image to Supabase storage first
      let imageUrl = null;
      if (userId && base64) {
        try {
          imageUrl = await storageService.uploadFoodImage(base64, userId);
          console.log('Image uploaded:', imageUrl);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue even if upload fails - we can still analyze and save without image
        }
      }

      const result = await analyzeFoodImage(base64, mimeType);
      
      if (result.success) {
        // Immediately save and navigate - no result screen in scanner
        const foodData = {
          ...result.data,
          image_url: imageUrl,
          image_uri: capturedImage?.uri,
          scanned_at: dailyLogService.getLocalISOString(),
          servings: 1,
        };
        
        consumeScanAndNotify(foodData);
      } else {
        setErrorMessage(result.error || t('scanner.couldNotAnalyze'));
        setScreenState(SCREEN_STATES.ERROR);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setErrorMessage(t('scanner.analyzeFailed'));
      setScreenState(SCREEN_STATES.ERROR);
    }
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (activeTab !== 'barcode' || screenState !== SCREEN_STATES.CAMERA) return;
    
    setScreenState(SCREEN_STATES.SCANNING);
    
    try {
      const result = await lookupBarcode(data);
      
      if (result.success) {
        // Immediately save and navigate
        const foodData = {
          ...result.data,
          image_uri: result.data.image_url,
          scanned_at: dailyLogService.getLocalISOString(),
          servings: 1,
        };
        
        consumeScanAndNotify(foodData, { fromBarcode: true });
      } else {
        setErrorMessage(result.error || t('scanner.productNotFound'));
        setScreenState(SCREEN_STATES.ERROR);
      }
    } catch (error) {
      console.error('Error looking up barcode:', error);
      setErrorMessage(t('scanner.barcodeFailed'));
      setScreenState(SCREEN_STATES.ERROR);
    }
  };

  const handleRetry = () => {
    setScreenState(SCREEN_STATES.CAMERA);
    setCapturedImage(null);
    setFoodResult(null);
    setErrorMessage('');
  };

  const handleSaveFood = () => {
    if (foodResult && onFoodScanned) {
      const adjustedFood = {
        ...foodResult,
        calories: Math.round(foodResult.calories * servings),
        protein_g: Math.round(foodResult.protein_g * servings),
        carbs_g: Math.round(foodResult.carbs_g * servings),
        fat_g: Math.round(foodResult.fat_g * servings),
        fiber_g: Math.round(foodResult.fiber_g * servings),
        sugar_g: Math.round(foodResult.sugar_g * servings),
        sodium_g: Math.round((foodResult.sodium_g || 0) * servings * 10) / 10,
        servings: servings,
        image_uri: capturedImage?.uri,
        scanned_at: dailyLogService.getLocalISOString(),
      };
      consumeScanAndNotify(adjustedFood);
    }
    onClose();
  };

  const handleDeleteFood = () => {
    handleRetry();
  };

  const formatDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes}`;
  };

  // No custom permission screen: request is done in useEffect (system dialog only).
  // While not granted we show nothing; if user denies, onClose() is called from requestPermission().then()
  if (!permission) return null;
  if (!permission.granted) return null;

  // Scanning Screen
  if (screenState === SCREEN_STATES.SCANNING) {
    return (
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <StatusBar barStyle="dark-content" />
        <View style={styles.scanningContainer}>
          <View style={styles.scanningContent}>
            <Animated.View
              style={[
                styles.scanningImageContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {capturedImage?.uri ? (
                <Image source={{ uri: capturedImage.uri }} style={styles.scanningImage} />
              ) : (
                <View style={[styles.scanningImage, styles.scanningImagePlaceholder]}>
                  <Scan size={60} color="#888" />
                </View>
              )}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-100, 100],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Animated.View>
            
            <Text style={styles.scanningTitle}>{t('scanner.scanningTitle')}</Text>
            <Text style={styles.scanningSubtitle}>
              {t('scanner.scanningSubtitle')}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Error Screen
  if (screenState === SCREEN_STATES.ERROR) {
    return (
      <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorImageContainer}>
              {capturedImage?.uri ? (
                <Image 
                  source={{ uri: capturedImage.uri }} 
                  style={styles.errorImage}
                  blurRadius={5}
                />
              ) : (
                <View style={[styles.errorImage, styles.errorImagePlaceholder]} />
              )}
              <View style={styles.errorBadge}>
                <X size={24} color="#fff" weight="bold" />
              </View>
            </View>
            
            <Text style={styles.errorTitle}>{t('scanner.mealNotDetected')}</Text>
            <Text style={styles.errorSubtitle}>
              {t('scanner.tryAgainNotScanned')}
            </Text>
          </View>
          
          <View style={[styles.errorButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <ArrowCounterClockwise size={22} color="#fff" weight="bold" />
              <Text style={styles.retryButtonText}>{t('scanner.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Result Screen
  if (screenState === SCREEN_STATES.RESULT && foodResult) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <StatusBar barStyle="light-content" />
        <View style={styles.resultContainer}>
          {/* Background Image */}
          <View style={styles.resultImageContainer}>
            {capturedImage?.uri ? (
              <Image source={{ uri: capturedImage.uri }} style={styles.resultBackgroundImage} />
            ) : (
              <View style={[styles.resultBackgroundImage, { backgroundColor: '#333' }]} />
            )}
            
            {/* Close Button */}
            <TouchableOpacity
              style={[styles.resultCloseButton, { top: insets.top + 10 }]}
              onPress={onClose}
            >
              <X size={24} color="#fff" weight="bold" />
            </TouchableOpacity>
            
            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.resultDeleteButton, { top: insets.top + 10 }]}
              onPress={handleDeleteFood}
            >
              <Trash size={24} color="#fff" weight="regular" />
            </TouchableOpacity>
          </View>
          
          {/* Bottom Sheet */}
          <View style={styles.resultSheet}>
            <View style={styles.sheetHandle} />
            
            <ScrollView 
              style={styles.resultScrollView}
              contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.resultDate}>{formatDate()}</Text>
              <Text style={styles.resultName}>{foodResult.name}</Text>
              
              {/* Calories Card */}
              <View style={styles.caloriesCard}>
                <View style={styles.caloriesIconContainer}>
                  <Fire size={28} color="#1a1a1a" weight="fill" />
                </View>
                <Text style={styles.caloriesText}>
                  {Math.round(foodResult.calories * servings)} {t('common.unitKcal')}
                </Text>
              </View>
              
              {/* Macros Grid */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🥩</Text>
                    <Text style={styles.macroLabel}>{t('scanner.protein')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {Math.round(foodResult.protein_g * servings)} {t('common.unitG')}
                  </Text>
                </View>
                
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🍚</Text>
                    <Text style={styles.macroLabel}>{t('scanner.carbs')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {Math.round(foodResult.carbs_g * servings)} {t('common.unitG')}
                  </Text>
                </View>
                
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🥑</Text>
                    <Text style={styles.macroLabel}>{t('scanner.fat')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {Math.round(foodResult.fat_g * servings)} {t('common.unitG')}
                  </Text>
                </View>
                
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🥦</Text>
                    <Text style={styles.macroLabel}>{t('scanner.fiber')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {Math.round(foodResult.fiber_g * servings)} {t('common.unitG')}
                  </Text>
                </View>
                
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🍬</Text>
                    <Text style={styles.macroLabel}>{t('scanner.sugar')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {Math.round(foodResult.sugar_g * servings)} {t('common.unitG')}
                  </Text>
                </View>
                
                <View style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroEmoji}>🧂</Text>
                    <Text style={styles.macroLabel}>{t('scanner.sodium')}</Text>
                  </View>
                  <Text style={styles.macroValue}>
                    {((foodResult.sodium_g || 0) * servings).toFixed(1)} {t('common.unitG')}
                  </Text>
                </View>
              </View>
              
              {/* Servings */}
              <View style={styles.servingsSection}>
                <View style={styles.servingsInfo}>
                  <Text style={styles.servingsLabel}>{t('scanner.servings')}</Text>
                  <Text style={styles.servingsSubtext}>
                    {foodResult.calories_per_serving} {t('scanner.kcalPerServing')}
                  </Text>
                </View>
                <View style={styles.servingsControls}>
                  <TouchableOpacity
                    style={styles.servingButton}
                    onPress={() => setServings(Math.max(1, servings - 1))}
                  >
                    <Minus size={20} color="#1a1a1a" weight="bold" />
                  </TouchableOpacity>
                  <Text style={styles.servingsCount}>{servings}</Text>
                  <TouchableOpacity
                    style={styles.servingButton}
                    onPress={() => setServings(servings + 1)}
                  >
                    <Plus size={20} color="#1a1a1a" weight="bold" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Ingredients */}
              {foodResult.ingredients && foodResult.ingredients.length > 0 && (
                <View style={styles.ingredientsSection}>
                  <Text style={styles.ingredientsTitle}>{t('scanner.ingredients')}</Text>
                  {foodResult.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientRow}>
                      <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      <Text style={styles.ingredientAmount}>{ingredient.amount_g} g</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            {/* Save Button */}
            <View style={[styles.saveButtonContainer, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveFood}>
                <Text style={styles.saveButtonText}>{t('scanner.addToDailyLog')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Camera Screen
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          enableTorch={torchOn}
          onBarcodeScanned={activeTab === 'barcode' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={24} color="#ffffff" weight="bold" />
          </TouchableOpacity>

          {/* Remaining scans bar (non-Pro only, always dark-mode colors) */}
          {!isPro && (
            <View style={[styles.scansBarContainer, { backgroundColor: "#222222" }]}>
              <Text style={[styles.scansBarText, { color: '#ffffff' }]}>
                {t('scanner.scanLeft')}: {remainingScans}
              </Text>
              {navigation && (
                <TouchableOpacity
                  style={[styles.scansBarButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={async () => {
                    const everHadPro = isPro || (await AsyncStorage.getItem(ONE_TIME_OFFER_EVER_HAD_PRO_KEY)) === 'true';
                    if (everHadPro || remainingScans > 0) {
                      navigation.navigate('Pro', { fromScanner: true });
                    } else {
                      navigation.navigate('OneTimeOffer', { fromScanner: true });
                    }
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.scansBarButtonText, { color: '#ffffff' }]}>{t('scanner.getMore')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Scanning Frame */}
          <View style={styles.frameContainer}>
            {/* Animated Barcode Title */}
            <Animated.Text 
              style={[
                styles.barcodeTitle,
                {
                  opacity: barcodeTitleOpacity,
                  transform: [{ translateY: barcodeTitleTranslateY }],
                }
              ]}
            >
              {t('scanner.barcodeScanner')}
            </Animated.Text>
            
            {/* Animated Frame */}
            <Animated.View style={[
              styles.animatedFrame,
              { width: frameWidthAnim, height: frameHeightAnim }
            ]}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </Animated.View>
          </View>
        </CameraView>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            {/* Animated Tab Indicator */}
            <Animated.View 
              style={[
                styles.tabIndicator,
                { transform: [{ translateX: tabIndicatorAnim }] }
              ]} 
            />
            
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tab}
                  onPress={() => handleTabPress(tab.id)}
                  activeOpacity={0.7}
                >
                  <IconComponent
                    size={20}
                    color={isActive ? '#1a1a1a' : '#888888'}
                    weight="regular"
                  />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Capture Controls */}
          <View style={styles.captureContainer}>
            {/* Torch Button */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setTorchOn(!torchOn)}
              activeOpacity={0.7}
            >
              <Lightning
                size={28}
                color="#ffffff"
                weight={torchOn ? 'fill' : 'regular'}
              />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              activeOpacity={0.8}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            {/* Info Button */}
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setShowSnapTips(true)}
              activeOpacity={0.7}
            >
              <Info size={28} color="#ffffff" weight="regular" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Snap Tips Modal */}
      <SnapTipsModal 
        visible={showSnapTips} 
        onClose={() => setShowSnapTips(false)} 
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scansBarContainer: {
    width: '92%',
    position: 'absolute',
    zIndex: 100,
    left: '4%',
    top: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  scansBarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scansBarButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 24,
  },
  scansBarButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  animatedFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: '#ffffff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },
  // Barcode Frame
  barcodeFrame: {
    width: BARCODE_FRAME_WIDTH,
    height: BARCODE_FRAME_HEIGHT,
    position: 'relative',
  },
  barcodeCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ffffff',
  },
  barcodeCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  barcodeCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  barcodeCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  barcodeCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  bottomControls: {
    backgroundColor: '#1a1a1a',
    paddingTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: TAB_PADDING,
    gap: TAB_GAP,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    left: TAB_PADDING,
    width: TAB_WIDTH,
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    zIndex: 0,
  },
  tab: {
    width: TAB_WIDTH,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#1a1a1a',
  },
  captureContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 50,
  },
  sideButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  captureButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#ffffff',
  },
  // Permission styles
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
  // Scanning styles
  scanningContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningContent: {
    alignItems: 'center',
    padding: 40,
  },
  scanningImageContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#e0e0e0',
    marginBottom: 40,
  },
  scanningImage: {
    width: '100%',
    height: '100%',
  },
  scanningImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    top: '50%',
  },
  scanningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  scanningSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Error styles
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorImageContainer: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#e0e0e0',
    marginBottom: 40,
    position: 'relative',
  },
  errorImage: {
    width: '100%',
    height: '100%',
  },
  errorImagePlaceholder: {
    backgroundColor: '#f0f0f0',
  },
  errorBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorButtonContainer: {
    padding: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Result styles
  resultContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  resultImageContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  resultBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  resultCloseButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultDeleteButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  resultScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  caloriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  caloriesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caloriesText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  macroCard: {
    width: (width - 60) / 3,
    backgroundColor: '#f5f5f7',
    padding: 14,
    borderRadius: 14,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  macroEmoji: {
    fontSize: 16,
  },
  macroLabel: {
    fontSize: 14,
    color: '#888',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  servingsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 24,
  },
  servingsInfo: {},
  servingsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  servingsSubtext: {
    fontSize: 14,
    color: '#888',
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 24,
    textAlign: 'center',
  },
  ingredientsSection: {
    marginBottom: 24,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  ingredientAmount: {
    fontSize: 16,
    color: '#888',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ScannerModal;
