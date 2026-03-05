import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Switch,
} from 'react-native';
import {
  Trophy,
  CurrencyDollar,
  Globe,
  Moon,
  Vibrate,
  FileText,
  Lightbulb,
  Star,
  UserPlus,
  Info,
  SignOut,
  CaretRight,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';

const ACCENT = '#c9a227';
const ICON_SIZE = 20;
const ICON_COLOR = '#333';

function SettingRow({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <Text style={styles.settingLabel}>{label}</Text>
      {value != null && <Text style={styles.settingValue}>{value}</Text>}
      {showArrow && <CaretRight size={18} color="#999" weight="regular" />}
    </TouchableOpacity>
  );
}

function SettingToggle({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIconWrap}>{icon}</View>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ddd', true: '#4ade80' }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [darkMode, setDarkMode] = React.useState(true);
  const [vibration, setVibration] = React.useState(true);

  const handleLogout = () => {
    const root = navigation.getParent();
    const rootStack = root?.getParent?.() ?? root;
    rootStack?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Onboarding' }] })
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.userCard}>
          <View style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>James Walker</Text>
            <Text style={styles.userMeta}>Logged via email</Text>
          </View>
          <CaretRight size={20} color="#999" weight="regular" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.proBanner}>
          <View>
            <Text style={styles.proBannerTitle}>Upgrade to PRO</Text>
            <Text style={styles.proBannerSub}>Enjoy exclusive features and benefits</Text>
          </View>
          <View style={styles.proBannerCoins} />
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>General</Text>
        <View style={styles.section}>
          <SettingRow icon={<Trophy size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Achievements" value="5/20" onPress={() => {}} />
        </View>

        <Text style={styles.sectionHeader}>Personalization</Text>
        <View style={styles.section}>
          <SettingRow icon={<CurrencyDollar size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Currency" value="USD" onPress={() => {}} />
          <SettingRow icon={<Globe size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Language" value="English" onPress={() => {}} />
          <SettingToggle icon={<Moon size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
          <SettingToggle icon={<Vibrate size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Vibration" value={vibration} onValueChange={setVibration} />
        </View>
        

        <Text style={styles.sectionHeader}>Legal</Text>
        <View style={styles.section}>
          <SettingRow icon={<FileText size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Privacy Policy" onPress={() => {}} />
          <SettingRow icon={<FileText size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Terms of Use" onPress={() => {}} />
        </View>

        <Text style={styles.sectionHeader}>Other</Text>
        <View style={styles.section}>
          <SettingRow icon={<Lightbulb size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Feature Request" onPress={() => {}} />
          <SettingRow icon={<Star size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Rate the App" onPress={() => {}} />
          <SettingRow icon={<UserPlus size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="Invite friends" onPress={() => {}} />
          <SettingRow icon={<Info size={ICON_SIZE} color={ICON_COLOR} weight="regular" />} label="App Info" onPress={() => {}} />
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={styles.settingIconWrap}>
              <SignOut size={ICON_SIZE} color="#dc2626" weight="regular" />
            </View>
            <Text style={[styles.settingLabel, styles.logoutLabel]}>Logout</Text>
            <CaretRight size={18} color="#999" weight="regular" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f6',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  userMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  proBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  proBannerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  proBannerCoins: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,162,39,0.3)',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIconWrap: {
    marginRight: 12,
    width: ICON_SIZE,
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  settingValue: {
    fontSize: 15,
    color: '#666',
    marginRight: 8,
  },
  logoutLabel: {
    color: '#dc2626',
  },
});
