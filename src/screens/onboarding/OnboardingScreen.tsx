import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { triggerImpact } from '../../lib/haptics';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/RootStack';
import { useOnboardingStore } from '../../store/onboardingStore';
import Purchases from 'react-native-purchases';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDE_IMAGES = [
  require('../../../assets/onboarding/onboarding1.png'),
  require('../../../assets/onboarding/onboarding2.png'),
  require('../../../assets/onboarding/onboarding3.png'),
];

const SLIDES = [
  {
    id: '1',
    title: 'Your Pocket Coin Expert',
    subtitle:
      'Point your camera at any coin and our AI identifies it in seconds and reveals its real market value',
    screenImage: SLIDE_IMAGES[0],
  },
  {
    id: '2',
    title: 'Real Prices and Real Data',
    subtitle:
      'Market values from eBay sold listings, auction results, and dealer prices. Updated daily so you never overpay or undersell.',
    screenImage: SLIDE_IMAGES[1],
  },
  {
    id: '3',
    title: "Build a Collection You're Proud Of",
    subtitle:
      "Track every coin and banknote, watch your collection value grow, complete sets, and connect with 50,000+ collectors worldwide",
    screenImage: SLIDE_IMAGES[2],
  },
];

const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;
const DOT_GAP = 8;
const INDICATOR_DURATION = 280;
const CONTENT_ENTER_DURATION = 420;
const CONTENT_EXIT_DURATION = 260;

function PageIndicatorDot({
  index,
  scrollPositionAnimated,
}: {
  index: number;
  scrollPositionAnimated: Animated.Value;
}) {
  // Butun sahifa bo'ylab o'tish: scrollPosition 0→1 da 1-chi kichraydi, 2-chi kattalashadi (sinxron)
  const progress = scrollPositionAnimated.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });
  const scaleY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.3)', '#d4a853'],
  });

  return (
    <Animated.View
      style={[
        styles.dotBase,
        {
          width,
          opacity,
          backgroundColor,
          transform: [{ scaleY }],
        },
      ]}
    />
  );
}

function PaginationDots({
  scrollPositionAnimated,
}: {
  scrollPositionAnimated: Animated.Value;
}) {
  return (
    <View style={styles.dots}>
      {SLIDES.map((_, i) => (
        <PageIndicatorDot
          key={i}
          index={i}
          scrollPositionAnimated={scrollPositionAnimated}
        />
      ))}
    </View>
  );
}

function SlideContent({
  item,
  index,
  isActive,
}: {
  item: (typeof SLIDES)[0];
  index: number;
  isActive: boolean;
}) {
  // Har doim yopiq holatdan boshlaymiz — Continue bosganda yangi mount bo'lsa ham animatsiya ishlashi uchun
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: CONTENT_ENTER_DURATION,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: CONTENT_ENTER_DURATION,
          useNativeDriver: true,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: CONTENT_EXIT_DURATION,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 0.92,
          duration: CONTENT_EXIT_DURATION,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start();
    }
  }, [isActive, opacity, scale]);

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Image
          source={item.screenImage}
          style={styles.screenContentImage}
          resizeMode="cover"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.slideContent,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const isProgrammaticScrollRef = useRef(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [actualScrollPosition, setActualScrollPosition] = useState(0);
  const scrollPositionAnimated = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Onboarding'>>();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const currentIndex = Math.round(
    Math.max(0, Math.min(SLIDES.length - 1, scrollPosition))
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const pos = x / SCREEN_WIDTH;
    setActualScrollPosition(pos);
    if (!isProgrammaticScrollRef.current) {
      setScrollPosition(pos);
      scrollPositionAnimated.setValue(pos);
    }
  };

  const onContinue = async () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      isProgrammaticScrollRef.current = true;
      setScrollPosition(nextIndex);
      Animated.timing(scrollPositionAnimated, {
        toValue: nextIndex,
        duration: INDICATOR_DURATION,
        useNativeDriver: false,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      }).start();
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    } else {
      completeOnboarding();
      try {
        const info = await Purchases.getCustomerInfo();
        const isPro = Object.keys(info.entitlements.active).length > 0;
        navigation.replace(isPro ? 'GetStarted' : 'Pro', isPro ? undefined : { fromOnboarding: true });
      } catch {
        navigation.replace('Pro', { fromOnboarding: true });
      }
    }
  };

  const onScrollEndDrag = () => {
    isProgrammaticScrollRef.current = false;
  };

  const prevIndexRef = useRef<number | null>(null);
  const buttonTextScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const prev = prevIndexRef.current;
    const isLastPage = currentIndex === SLIDES.length - 1;
    const wasLastPage = prev === SLIDES.length - 1;
    const justEnteredLast = isLastPage && !wasLastPage;
    const justLeftLast = !isLastPage && wasLastPage;
    if (prev !== null && (justEnteredLast || justLeftLast)) {
      buttonTextScale.setValue(0.88);
      Animated.spring(buttonTextScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 180,
      }).start();
    }
  }, [currentIndex, buttonTextScale]);

  const triggerPageChangeHaptic = () => {
    triggerImpact(Haptics.ImpactFeedbackStyle.Medium, INDICATOR_DURATION);
  };

  useEffect(() => {
    if (prevIndexRef.current !== null && prevIndexRef.current !== currentIndex) {
      triggerPageChangeHaptic();
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const pos = x / SCREEN_WIDTH;
    setScrollPosition(pos);
    setActualScrollPosition(pos);
    scrollPositionAnimated.setValue(pos);
    isProgrammaticScrollRef.current = false;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <Image
        source={require('../../../assets/onboarding/overlay.png')}
        style={styles.overlay}
        resizeMode="cover"
      />

      <Image
        source={require('../../../assets/onboarding/linear.png')}
        style={styles.linearLayer}
        resizeMode="cover"
      />

      {/* 3. Ustida: FlatList (slaydlar) */}
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          extraData={{ currentIndex, actualScrollPosition }}
          renderItem={({ item, index: idx }) => (
            <SlideContent
              item={item}
              index={idx}
              isActive={idx === Math.round(actualScrollPosition)}
            />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>

      {/* 4. Ustida: indicator va button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PaginationDots scrollPositionAnimated={scrollPositionAnimated} />
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Animated.Text
            style={[
              styles.continueText,
              { transform: [{ scale: buttonTextScale }] },
            ]}
          >
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1a1512',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  linearLayer: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH+100,
    height: SCREEN_HEIGHT+100,
    transform: [{ translateX: -50 }, { translateY: -100 }],
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  screenContentImage: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    left: 0,
    top: 0,
  },
  slideContent: {
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    color: '#A6A09B',
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: -0.18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: DOT_GAP,
  },
  dotBase: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  continueButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    height: 56,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#292524',
  },
});
