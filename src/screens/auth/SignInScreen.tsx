import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStack';
import { useThemeColors } from '../../theme/useThemeColors';
import { supabase } from '../../lib/supabase';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignIn'>;
};

export default function SignInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', error.message);
      return;
    }
    if (data.session) {
      navigation.replace('Main');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background.bgWhite,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text.textBase }]}>Sign In</Text>
        <Text style={[styles.subtitle, { color: colors.text.textTertiary }]}>
          Enter your registered email
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text.textBaseTint }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface.onBgAlt,
                color: colors.text.textBase,
                borderColor: colors.border.border3,
              },
            ]}
            placeholder="ex: example@gmail.com"
            placeholderTextColor={colors.text.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text.textBaseTint }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface.onBgAlt,
                  color: colors.text.textBase,
                  borderColor: colors.border.border3,
                },
              ]}
              placeholder="Enter password"
              placeholderTextColor={colors.text.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={hidePassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setHidePassword((v) => !v)}
            >
              {hidePassword ? (
                <EyeOff size={22} color={colors.text.textTertiary} />
              ) : (
                <Eye size={22} color={colors.text.textAlt} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={[styles.forgotText, { color: colors.text.textBrand }]}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.background.bgInverse }]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.textInverse} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.text.textWhite }]}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={[styles.footerText, { color: colors.text.textTertiary }]}>
          Don't have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={[styles.footerLink, { color: colors.text.textBrand }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 60,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    height: 52,
    borderWidth: 1,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '500',
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
  },
});
