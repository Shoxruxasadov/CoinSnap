import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View, Text, StyleSheet, Animated } from 'react-native';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import { useSettingsStore } from './src/store/settingsStore';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import { useEffect, useRef } from 'react';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { Check } from 'lucide-react-native';
import { useAuthStore } from './src/store/authStore';
import { useSupabaseSession } from './src/lib/useSupabaseSession';
import RootStack from './src/navigation/RootStack';
import tamaguiConfig from './tamagui.config';

const FadeToast = ({ text1 }: { text1?: string }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[toastStyles.container, { opacity }]}>
      <View style={toastStyles.iconWrap}>
        <Check size={20} color="#fff" strokeWidth={3} />
      </View>
      <Text style={toastStyles.text}>{text1}</Text>
    </Animated.View>
  );
};

const toastConfig = {
  success: ({ text1 }: BaseToastProps) => <FadeToast text1={text1} />,
};

const toastStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5DB075',
    height: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
});

SplashScreen.preventAutoHideAsync();

export default function App() {
  const colorScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const { session, loading } = useSupabaseSession();
  const isSkipped = useAuthStore((s) => s.isSkipped);

  const effectiveScheme = themeMode === 'system' ? colorScheme : themeMode;
  const statusBarStyle = effectiveScheme === 'dark' ? 'light' : 'dark';

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    'SFCompactRounded-Heavy': require('./assets/font/SF-Compact-Rounded-Heavy.ttf'),
    'SFCompactRounded-Bold': require('./assets/font/SF-Compact-Rounded-Bold.ttf'),
    'SFCompactRounded-Semibold': require('./assets/font/SF-Compact-Rounded-Semibold.ttf'),
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, loading]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (loading) {
    return null;
  }

  const isLoggedIn = !!session;

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme ?? 'light'}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StatusBar style={statusBarStyle} />
            <NavigationContainer>
              <RootStack
                isLoggedIn={isLoggedIn}
                isSkipped={isSkipped}
              />
            </NavigationContainer>
          </BottomSheetModalProvider>
          <Toast config={toastConfig} position="bottom" bottomOffset={100} visibilityTime={2000} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </TamaguiProvider>
  );
}
