import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import { triggerSelection } from '../../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZE = (SCREEN_WIDTH - 40 - 24) / 3;

type StreakBadge = { id: string; days: number; name: string; desc: string; dialogDesc: string };
type CollectorBadge = { id: string; count: number; name: string; desc: string; dialogDesc: string };

const STREAK_BADGES: StreakBadge[] = [
  { id: 'streak3', days: 3, name: 'Bronze', desc: '3 days streak', dialogDesc: 'Login 3 days in a row to get this achievement' },
  { id: 'streak7', days: 7, name: 'Steel', desc: '7 days streak', dialogDesc: 'Login 7 days in a row to get this achievement' },
  { id: 'streak14', days: 14, name: 'Silver', desc: '14 days streak', dialogDesc: 'Login 14 days in a row to get this achievement' },
  { id: 'streak30', days: 30, name: 'Gold', desc: '30 days streak', dialogDesc: 'Login 30 days in a row to get this achievement' },
  { id: 'streak60', days: 60, name: 'Platinum', desc: '60 days streak', dialogDesc: 'Login 60 days in a row to get this achievement' },
  { id: 'streak100', days: 100, name: 'Diamond', desc: '100 days streak', dialogDesc: 'Login 100 days in a row to get this achievement' },
];

const COLLECTOR_BADGES: CollectorBadge[] = [
  { id: 'collector10', count: 10, name: 'Mini Pocket', desc: 'Collect 10 coins', dialogDesc: 'Collect 10 coins to get this achievement' },
];

const BADGE_DISABLED_OPACITY = 0.45;

const activeImages: Record<string, any> = {
  streak3: require('../../../assets/achievements/streak3.png'),
  streak7: require('../../../assets/achievements/streak7.png'),
  streak14: require('../../../assets/achievements/streak14.png'),
  streak30: require('../../../assets/achievements/streak30.png'),
  streak60: require('../../../assets/achievements/streak60.png'),
  streak100: require('../../../assets/achievements/streak100.png'),
  collector10: require('../../../assets/achievements/collector10.png'),
};

type SelectedBadge = { id: string; name: string; dialogDesc: string; active: boolean } | null;

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;

  const [streak, setStreak] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<SelectedBadge>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const [{ count }, { data: profile }] = await Promise.all([
        supabase.from('coins').select('*', { count: 'exact', head: true }).eq('scanned_by_user_id', userId),
        supabase.from('profiles').select('last_login_at, streak_days').eq('id', userId).single(),
      ]);

      setScanCount(count ?? 0);

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const lastLogin = (profile?.last_login_at as string) ?? null;
      const currentStreak = (profile?.streak_days as number) ?? 0;

      let newStreak = currentStreak;
      if (!lastLogin) {
        newStreak = 1;
      } else if (lastLogin === yesterday) {
        newStreak = currentStreak + 1;
      } else if (lastLogin !== today) {
        newStreak = 1;
      }

      if (lastLogin !== today) {
        await supabase.from('profiles').update({
          last_login_at: today,
          streak_days: newStreak,
          updated_at: new Date().toISOString(),
        }).eq('id', userId);
      }

      setStreak(lastLogin === today ? currentStreak : newStreak);
    })();
  }, [userId]);

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const isStreakActive = (days: number) => streak >= days;
  const isCollectorActive = (count: number) => scanCount >= count;

  const openDialog = (badge: { id: string; name: string; dialogDesc: string }, active: boolean) => {
    triggerSelection();
    setSelectedBadge({ id: badge.id, name: badge.name, dialogDesc: badge.dialogDesc, active });
  };

  const closeDialog = () => {
    triggerSelection();
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedBadge(null);
      cardTranslateY.setValue(300);
    });
  };

  useEffect(() => {
    if (!selectedBadge) return;
    overlayOpacity.setValue(0);
    cardTranslateY.setValue(300);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
    ]).start();
  }, [selectedBadge]);

  const handleInfoPress = () => {
    triggerSelection();
    Alert.alert(
      'About Achievements',
      'Achievements reward your activity in the app. Earn Streak badges by logging in on consecutive days, and Collector badges by scanning and saving coins. Tap any badge to see how to unlock it.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Achievements</Text>
        <TouchableOpacity style={styles.infoBtn} onPress={handleInfoPress}>
          <Info size={24} color={colors.text.textBase} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text.textBase }]}>Streak</Text>
        <View style={styles.badgeGrid}>
          {STREAK_BADGES.map((badge) => {
            const active = isStreakActive(badge.days);
            return (
              <TouchableOpacity
                key={badge.id}
                style={styles.badgeItem}
                onPress={() => openDialog(badge, active)}
                activeOpacity={0.8}
              >
                <Image
                  source={activeImages[badge.id]}
                  style={[styles.badgeImage, { opacity: active ? 1 : BADGE_DISABLED_OPACITY }]}
                  resizeMode="contain"
                />
                <Text style={[styles.badgeName, { color: colors.text.textBase }]}>{badge.name}</Text>
                <Text style={[styles.badgeDesc, { color: colors.text.textTertiary }]}>{badge.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text.textBase, marginTop: 24 }]}>Collector</Text>
        <View style={styles.badgeGrid}>
          {COLLECTOR_BADGES.map((badge) => {
            const active = isCollectorActive(badge.count);
            return (
              <TouchableOpacity
                key={badge.id}
                style={styles.badgeItem}
                onPress={() => openDialog(badge, active)}
                activeOpacity={0.8}
              >
                <Image
                  source={activeImages[badge.id]}
                  style={[styles.badgeImage, { opacity: active ? 1 : BADGE_DISABLED_OPACITY }]}
                  resizeMode="contain"
                />
                <Text style={[styles.badgeName, { color: colors.text.textBase }]}>{badge.name}</Text>
                <Text style={[styles.badgeDesc, { color: colors.text.textTertiary }]}>{badge.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Achievement Dialog */}
      <Modal visible={!!selectedBadge} transparent animationType="none">
        <Animated.View
          style={[
            styles.dialogOverlay,
            { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeDialog}
          />
          <Animated.View
            style={[
              styles.dialogCardWrapper,
              { transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.dialogCard, { backgroundColor: colors.surface.onBgBase }]}
            >
              {selectedBadge && (
                <>
                <Image
                  source={activeImages[selectedBadge.id]}
                  style={[styles.dialogBadgeImage, { opacity: selectedBadge.active ? 1 : BADGE_DISABLED_OPACITY }]}
                  resizeMode="contain"
                />
                  <Text style={[styles.dialogTitle, { color: colors.text.textBase }]}>{selectedBadge.name}</Text>
                  <Text style={[styles.dialogDesc, { color: colors.text.textTertiary }]}>
                    {selectedBadge.dialogDesc}
                  </Text>
                  <TouchableOpacity
                    style={[styles.dialogBtn, { backgroundColor: colors.background.bgInverse }]}
                    onPress={closeDialog}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dialogBtnText, { color: colors.text.textInverse }]}>Thanks!</Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    width: BADGE_SIZE,
    alignItems: 'center',
  },
  badgeImage: {
    width: BADGE_SIZE - 16,
    height: BADGE_SIZE - 16,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  dialogOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  dialogCardWrapper: {
    alignSelf: 'stretch',
  },
  dialogCard: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  dialogBadgeImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  dialogDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  dialogBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  dialogBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
