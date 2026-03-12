import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
  Alert,
  Image,
  Share,
  Linking,
} from 'react-native';
import {
  Trophy,
  DollarSign,
  Globe,
  Moon,
  Volume2,
  FileText,
  Lightbulb,
  Star,
  UserPlus,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/MainStack';
import * as StoreReview from 'expo-store-review';
import { supabase } from '../../lib/supabase';
import { useSupabaseSession } from '../../lib/useSupabaseSession';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeColors, useEffectiveColorScheme } from '../../theme/useThemeColors';
import { AvatarIcon } from '../../components/icons/AvatarIcon';
import ProCardTexture from '../../../assets/profile/texture.svg';

const ICON_SIZE = 24;

function getDisplayName(session: { user: { user_metadata?: { full_name?: string; name?: string }; email?: string } } | null): string {
  if (!session?.user) return 'Anonymous';
  const metadata = session.user.user_metadata;
  const name = metadata?.full_name || metadata?.name;
  if (name && String(name).trim()) return String(name).trim();
  return 'Unknown';
}

function getAvatarUrl(session: { user: { user_metadata?: { avatar_url?: string; picture?: string } } } | null): string | null {
  if (!session?.user?.user_metadata) return null;
  const u = session.user.user_metadata;
  return u.avatar_url || u.picture || null;
}

function getLoginMethod(session: { user: { app_metadata?: { provider?: string } } } | null): string {
  if (!session?.user?.app_metadata?.provider) return 'Logged in';
  const p = session.user.app_metadata.provider;
  if (p === 'google') return 'Logged via Google';
  if (p === 'apple') return 'Logged via Apple';
  return 'Logged via email';
}

function SettingRow({
  index,
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  colors,
}: {
  index: number;
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, {borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.border.border2 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIconWrap}>{icon}</View>
      <Text style={[styles.settingLabel, { color: colors.text.textBase }]}>{label}</Text>
      {value != null && <Text style={[styles.settingValue, { color: colors.text.textAlt }]}>{value}</Text>}
      {showArrow && <ChevronRight size={18} color={colors.text.textTertiary} />}
    </TouchableOpacity>
  );
}

function SettingToggle({
  index,
  icon,
  label,
  value,
  onValueChange,
  colors,
}: {
  index: number;
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.settingRow, { borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.border.border2 }]}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <Text style={[styles.settingLabel, { color: colors.text.textBase }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        // trackColor={{ false: colors.border.border3, true: 'red' }}
        // thumbColor="#fff"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const stackNav = navigation.getParent() as NativeStackNavigationProp<MainStackParamList> | undefined;
  const colors = useThemeColors();
  const { session } = useSupabaseSession();
  const resetSkipped = useAuthStore((s) => s.resetSkipped);
  const vibration = useSettingsStore((s) => s.vibration);
  const setVibration = useSettingsStore((s) => s.setVibration);
  const currency = useSettingsStore((s) => s.currency);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const effectiveScheme = useEffectiveColorScheme();

  const isDarkMode = effectiveScheme === 'dark';
  const handleDarkModeChange = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const isLoggedIn = !!session;
  const iconColor = colors.text.textAlt;

  const handleAchievements = () => stackNav?.navigate('Achievements');
  const handleCurrency = () => stackNav?.navigate('Currency');
  const handleFeatureRequest = () => stackNav?.navigate('FeatureRequest');
  const handleAboutApp = () => stackNav?.navigate('AboutApp');

  const handleRateApp = async () => {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (isAvailable) {
      await StoreReview.requestReview();
    } else {
      Linking.openURL('https://apps.apple.com/app/coinsnap');
    }
  };

  const handleInviteFriends = async () => {
    try {
      await Share.share({ message: 'Coin Snap - AI Powered coin scanner!' });
    } catch {}
  };

  const handlePrivacyPolicy = () => Linking.openURL('https://example.com/privacy');
  const handleTermsOfUse = () => Linking.openURL('https://example.com/terms');

  const handleLoginPress = () => {
    const root = navigation.getParent();
    const rootStack = root?.getParent?.() ?? root;
    (rootStack as { navigate: (name: string) => void })?.navigate('GetStarted');
  };

  const performLogout = async () => {
    await supabase.auth.signOut();
    resetSkipped();
    const root = navigation.getParent();
    const rootStack = root?.getParent?.() ?? root;
    rootStack?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] })
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => performLogout() },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.userCard, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]}
          onPress={isLoggedIn ? () => stackNav?.navigate('EditProfile') : handleLoginPress}
          activeOpacity={0.7}
        >
          {getAvatarUrl(session) ? (
            <Image source={{ uri: getAvatarUrl(session)! }} style={styles.userAvatar} />
          ) : (
            <AvatarIcon size={64} />
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text.textBase }]}>{getDisplayName(session)}</Text>
            <Text style={[styles.userMeta, { color: colors.text.textTertiary }]}>
              {isLoggedIn ? getLoginMethod(session) : 'Tap to sign in'}
            </Text>
          </View>
          {isLoggedIn ? (
            <ChevronRight size={24} color={colors.text.textTertiary} />
          ) : (
            <View style={[styles.loginBtn, { backgroundColor: colors.background.brand }]}>
              <Text style={[styles.loginBtnText, { color: colors.text.textWhite }]}>Login</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.proBanner, { backgroundColor: colors.background.bgDark}]} activeOpacity={0.9} onPress={() => stackNav?.navigate('Pro')}>
          <View style={styles.proBannerTexture}>
            <ProCardTexture
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={styles.proBannerContent}>
            <View style={styles.proBannerTextWrap}>
              <Text style={styles.proBannerTitle}>Upgrade to PRO</Text>
              <Text style={styles.proBannerSub}>Enjoy exclusive features and benefits</Text>
            </View>
            <Image
              source={require('../../../assets/profile/coins.png')}
              style={styles.proBannerCoins}
              resizeMode="cover"
            />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { color: colors.text.textAlt }]}>General</Text>
        <View style={[styles.section, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]}>
          <SettingRow index={0} icon={<Trophy size={ICON_SIZE} color={iconColor} />} label="Achievements" value="5/20" onPress={handleAchievements} colors={colors} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text.textAlt }]}>Personalization</Text>
        <View style={[styles.section, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]}>
          <SettingRow index={0} icon={<DollarSign size={ICON_SIZE} color={iconColor} />} label="Currency" value={currency} onPress={handleCurrency} colors={colors} />
          <SettingRow index={1} icon={<Globe size={ICON_SIZE} color={iconColor} />} label="Language" value="English" onPress={() => {}} colors={colors} />
          <SettingToggle index={2} icon={<Moon size={ICON_SIZE} color={iconColor} />} label="Dark Mode" value={isDarkMode} onValueChange={handleDarkModeChange} colors={colors} />
          <SettingToggle index={3} icon={<Volume2 size={ICON_SIZE} color={iconColor} />} label="Vibration" value={vibration} onValueChange={setVibration} colors={colors} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text.textAlt }]}>Legal</Text>
        <View style={[styles.section, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]}>
          <SettingRow index={0} icon={<FileText size={ICON_SIZE} color={iconColor} />} label="Privacy Policy" onPress={handlePrivacyPolicy} colors={colors} />
          <SettingRow index={1} icon={<FileText size={ICON_SIZE} color={iconColor} />} label="Terms of Use" onPress={handleTermsOfUse} colors={colors} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text.textAlt }]}>Other</Text>
        <View style={[styles.section, { backgroundColor: colors.surface.onBgBase, borderColor: colors.border.border3 }]}>
          <SettingRow index={0} icon={<Lightbulb size={ICON_SIZE} color={iconColor} />} label="Feature Request" onPress={handleFeatureRequest} colors={colors} />
          <SettingRow index={1} icon={<Star size={ICON_SIZE} color={iconColor} />} label="Rate the App" onPress={handleRateApp} colors={colors} />
          <SettingRow index={2} icon={<UserPlus size={ICON_SIZE} color={iconColor} />} label="Invite friends" onPress={handleInviteFriends} colors={colors} />
          <SettingRow index={3} icon={<Info size={ICON_SIZE} color={iconColor} />} label="App Info" onPress={handleAboutApp} colors={colors} />
          {isLoggedIn && (
            <TouchableOpacity style={[styles.settingRow, {borderTopWidth: 1, borderTopColor: colors.border.border2 }]} onPress={handleLogout}>
              <View style={styles.settingIconWrap}>
                <LogOut size={ICON_SIZE} color={colors.state.red} />
              </View>
              <Text style={[styles.settingLabel, styles.logoutLabel, {color: colors.state.red}]}>Logout</Text>
              <ChevronRight size={18} color={colors.text.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  loginBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  proBanner: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 82,
  },
  proBannerTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
    width: '100%',
    height: '100%',
  },
  proBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: "100%",
  },
  proBannerTextWrap: {
    flex: 1,
    marginLeft: 16,
  },
  proBannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    color: '#fff',
  },
  proBannerSub: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  proBannerCoins: {
    width: 90,
    height: "100%",
    position: 'absolute',
    right: 0,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    // borderWidth: 1,
    paddingVertical: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    // paddingHorizontal: 16,
    marginHorizontal: 16,
    height: 56,
  },
  settingIconWrap: {
    marginRight: 12,
    width: ICON_SIZE,
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.18,
  },
  settingValue: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.18,
  },
  logoutLabel: {
    color: '#dc2626',
  },
});
