import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  useWindowDimensions,
  PanResponder,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useThemeColors, useEffectiveColorScheme } from '../theme/useThemeColors';
import type { BlogPost } from '../types/blog';
import type { MainStackParamList } from '../navigation/MainStack';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FALLBACK_BODY = 'No content available.';

type BlogItemRoute = RouteProp<MainStackParamList, 'BlogItem'>;

export default function BlogItemScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const route = useRoute<BlogItemRoute>();
  const { width } = useWindowDimensions();
  const post = route.params?.post;

  const IMAGE_SIZE = width;
  const COLLAPSED_Y = IMAGE_SIZE - 20;
  const EXPANDED_Y = 0;

  const sheetY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const expandProgress = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const isExpandedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const contentScrollYRef = useRef(0);

  const readTime = post?.read_time_minutes
    ? `${post.read_time_minutes} min read`
    : '1 min read';
  const bodyText = post?.content ?? post?.excerpt ?? FALLBACK_BODY;
  const imageUrl = post?.thumbnail_url ?? undefined;

  const closeBtnImageOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const closeBtnStickyOpacity = sheetY.interpolate({
    inputRange: [EXPANDED_Y, COLLAPSED_Y],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const spacerHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, insets.top + 8],
  });
  const handleOpacity = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const handleAnimHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 0],
  });
  const handlePadding = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 0],
  });
  const headerRowHeight = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });
  const sheetPaddingTop = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const handleMarginBottom = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  const doExpand = useCallback(() => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(sheetY, {
      toValue: EXPANDED_Y,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    Animated.timing(expandProgress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [sheetY, expandProgress]);

  const doCollapse = useCallback(() => {
    isExpandedRef.current = false;
    contentScrollYRef.current = 0;
    setScrollY(0);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    Animated.spring(sheetY, {
      toValue: COLLAPSED_Y,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    Animated.timing(expandProgress, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  }, [sheetY, expandProgress]);

  const doExpandRef = useRef(doExpand);
  const doCollapseRef = useRef(doCollapse);
  doExpandRef.current = doExpand;
  doCollapseRef.current = doCollapse;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && Math.abs(gs.dy) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -50 && !isExpandedRef.current) {
          doExpandRef.current?.();
        } else if (
          gs.dy > 50 &&
          isExpandedRef.current &&
          contentScrollYRef.current <= 0
        ) {
          doCollapseRef.current?.();
        }
      },
    }),
  ).current;

  const contentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        const vertical = Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5 && Math.abs(gs.dy) > 10;
        if (!vertical) return false;
        if (isExpandedRef.current) {
          return contentScrollYRef.current <= 0 && gs.dy > 10;
        }
        return true;
      },
      onPanResponderRelease: (_, gs) => {
        if (isExpandedRef.current && gs.dy > 50 && contentScrollYRef.current <= 0) {
          doCollapseRef.current?.();
        } else if (!isExpandedRef.current && gs.dy < -50) {
          doExpandRef.current?.();
        }
      },
    }),
  ).current;

  const handleContentScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    contentScrollYRef.current = y;
    setScrollY(y);
  }, []);

  const handleContentScrollEndDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number }; velocity?: { y?: number } } }) => {
      if (!isExpandedRef.current) return;
      const y = e.nativeEvent.contentOffset.y;
      if (y > 0) return;
      const vy = e.nativeEvent.velocity?.y ?? 0;
      if (y <= -30 || (y <= 0 && vy < -1.5)) {
        doCollapse();
      }
    },
    [doCollapse],
  );

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  const colorScheme = useEffectiveColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent?.(true);
      RNStatusBar.setBackgroundColor?.('transparent');
    }
  }, []);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBase }]}>
        <StatusBar style={statusBarStyle} />
        <Text style={[styles.placeholder, { color: colors.text.textTertiary }]}>Post not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.bgBase }]}>
      <StatusBar style={statusBarStyle} />

      <View style={[styles.imageArea, { height: IMAGE_SIZE }]}>
        {imageUrl ? (
          <>
            <View
              style={[
                styles.heroImage,
                styles.placeholderImage,
                { width: IMAGE_SIZE, height: IMAGE_SIZE, position: 'absolute', backgroundColor: colors.border.border3 },
              ]}
            />
            <Image
              source={{ uri: imageUrl }}
              style={[styles.heroImage, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
              resizeMode="cover"
            />
          </>
        ) : (
          <View
            style={[
              styles.heroImage,
              styles.placeholderImage,
              { width: IMAGE_SIZE, height: IMAGE_SIZE, backgroundColor: colors.border.border3 },
            ]}
          />
        )}
      </View>

      <View style={[styles.header, { top: insets.top }]} pointerEvents="box-none">
        <Animated.View style={{ opacity: closeBtnImageOpacity }}>
          <TouchableOpacity onPress={handleClose} style={[styles.headerCloseBtn, { backgroundColor: colors.surface.onBgBase }]}>
            <X size={20} color={colors.text.textBase} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.contentSheet,
          { transform: [{ translateY: sheetY }], backgroundColor: colors.surface.onBgBase },
        ]}
      >
        <Animated.View style={{ flex: 1, paddingTop: sheetPaddingTop }}>
          <Animated.View {...panResponder.panHandlers} collapsable={false}>
            <Animated.View style={{ height: spacerHeight }} />
            <Animated.View
              style={[
                styles.handleWrap,
                { opacity: handleOpacity, paddingVertical: handlePadding },
              ]}
            >
              <Animated.View
                style={[
                  styles.headerHandle,
                  {
                    height: handleAnimHeight,
                    backgroundColor: colors.border.border1,
                    marginBottom: handleMarginBottom,
                  },
                ]}
              />
            </Animated.View>
            <Animated.View
              style={[styles.sheetHeaderRowWrap, { height: headerRowHeight }]}
            >
              <View style={styles.sheetHeaderRow}>
                <Animated.View style={{ opacity: closeBtnStickyOpacity }}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.headerCloseBtn, { backgroundColor: colors.border.border3 }]}
                  >
                    <X size={20} color={colors.text.textBase} strokeWidth={2.5} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </Animated.View>
          </Animated.View>

          <View style={styles.contentScrollWrap} {...contentPanResponder.panHandlers}>
            <ScrollView
              ref={scrollRef}
              scrollEnabled={isExpanded}
              style={styles.contentScroll}
              contentContainerStyle={[
                styles.contentScrollContent,
                { paddingBottom: insets.bottom + 40 },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={handleContentScroll}
              onScrollEndDrag={handleContentScrollEndDrag}
              scrollEventThrottle={16}
              bounces={!(isExpanded && scrollY < 100)}
            >
              <View style={[styles.contentArea, { backgroundColor: colors.surface.onBgBase }]}>
                <Text style={[styles.cardTitle, { color: colors.text.textBase }]}>
                  {post.title}
                </Text>
                <Text style={[styles.cardMeta, { color: colors.text.textTertiary }]}>
                  {readTime}
                </Text>
                <Text style={[styles.cardBody, { color: colors.text.textBase }]}>
                  {bodyText}
                </Text>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageArea: { width: '100%' },
  heroImage: { width: '100%' },
  placeholderImage: {},
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleWrap: { alignSelf: 'center' },
  headerHandle: {
    width: 40,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sheetHeaderRowWrap: { overflow: 'hidden' },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  contentScrollWrap: { flex: 1 },
  contentScroll: { flex: 1 },
  contentScrollContent: { paddingTop: 0 },
  contentArea: { paddingHorizontal: 16, paddingTop: 4 },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 14,
    marginBottom: 20,
  },
  cardBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  placeholder: {
    flex: 1,
    textAlign: 'center',
    marginTop: 48,
    fontSize: 16,
  },
});
