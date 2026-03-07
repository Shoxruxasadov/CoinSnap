import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
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
import { useEffect } from 'react';
import { useAuthStore } from './src/store/authStore';
import { useSupabaseSession } from './src/lib/useSupabaseSession';
import RootStack from './src/navigation/RootStack';
import tamaguiConfig from './tamagui.config';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const colorScheme = useColorScheme();
  const { session, loading } = useSupabaseSession();
  const isSkipped = useAuthStore((s) => s.isSkipped);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
            <StatusBar style="dark" />
            <NavigationContainer>
              <RootStack
                isLoggedIn={isLoggedIn}
                isSkipped={isSkipped}
              />
            </NavigationContainer>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </TamaguiProvider>
  );
}
