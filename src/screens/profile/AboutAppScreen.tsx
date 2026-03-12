import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight, Mail } from 'lucide-react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import { triggerSelection } from '../../lib/haptics';
import Constants from 'expo-constants';

export default function AboutAppScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useThemeColors();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleBack = () => {
    triggerSelection();
    navigation.goBack();
  };

  const handleEmail = () => {
    triggerSelection();
    Linking.openURL('mailto:coinsnap@app.info');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.bgBaseElevated }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={28} color={colors.text.textBase} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.textBase }]}>About app</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.appName, { color: colors.text.textBase }]}>Cointerest</Text>
        <Text style={[styles.version, { color: colors.text.textTertiary }]}>Version {appVersion}</Text>

        <Text style={[styles.sectionTitle, { color: colors.text.textBase }]}>About This App</Text>
        <Text style={[styles.description, { color: colors.text.textTertiary }]}>
          Identify any coin instantly with advanced AI. Our app recognizes coins from around the world, analyzes condition using the Sheldon grading scale, and provides historical details, metal composition, and estimated market value — all within seconds.
        </Text>

        <TouchableOpacity
          style={[styles.emailRow, { borderTopColor: colors.border.border2 }]}
          onPress={handleEmail}
          activeOpacity={0.7}
        >
          <Mail size={22} color={colors.text.textBase} />
          <Text style={[styles.emailText, { color: colors.text.textBase }]}>coinsnap@app.info</Text>
          <ChevronRight size={20} color={colors.text.textTertiary} />
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  version: {
    fontSize: 15,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  emailText: {
    flex: 1,
    fontSize: 16,
  },
});
