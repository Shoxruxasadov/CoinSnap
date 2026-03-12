import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeColors } from "../theme/useThemeColors";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import GetStartedScreen from "../screens/auth/GetStartedScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import MainStack from "./MainStack";

export type RootStackParamList = {
  Onboarding: undefined;
  GetStarted: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function getInitialRoute(
  isLoggedIn: boolean,
  isSkipped: boolean,
): keyof RootStackParamList {
  if (isLoggedIn || isSkipped) return "Main";
  return "Onboarding";
}

type RootStackProps = {
  isLoggedIn: boolean;
  isSkipped: boolean;
};

export default function RootStack({
  isLoggedIn,
  isSkipped,
}: RootStackProps) {
  const initialRoute = getInitialRoute(isLoggedIn, isSkipped);
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.bgAlt },
        animation: "slide_from_right",
        fullScreenGestureEnabled: true,
        animationDuration: 300,
      }}
    >
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen
        name="Main"
        component={MainStack}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
