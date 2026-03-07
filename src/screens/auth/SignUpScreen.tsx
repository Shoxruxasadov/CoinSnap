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
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error.message);
      return;
    }
    if (data.session) {
      navigation.replace('Main');
    } else if (data.user && !data.session) {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please confirm your email to sign in.'
      );
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
        <Text style={[styles.title, { color: colors.text.textBase }]}>Sign Up</Text>
        <Text style={[styles.subtitle, { color: colors.text.textTertiary }]}>
          Create your account to get started
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text.textBaseTint }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface.onBgAlt,
                color: colors.text.textBase,
                borderColor: colors.border.border3,
              },
            ]}
            placeholder="Your name"
            placeholderTextColor={colors.text.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

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
          <Text style={[styles.label, { color: colors.text.textBaseTint }]}>Create password</Text>
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

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.background.bgInverse }]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.textWhite} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.text.textWhite }]}>Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={[styles.footerText, { color: colors.text.textTertiary }]}>
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
          <Text style={[styles.footerLink, { color: colors.text.textBrand }]}>Sign In</Text>
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
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    height: 56,
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
