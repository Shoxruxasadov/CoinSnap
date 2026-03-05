import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import GetStartedScreen from "../screens/auth/GetStartedScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import MainTabs from "./MainTabs";

export type RootStackParamList = {
  Onboarding: undefined;
  GetStarted: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function getInitialRoute(
  hasSeenOnboarding: boolean,
  hasCompletedAuthFlow: boolean,
): keyof RootStackParamList {
  if (!hasSeenOnboarding) return "Onboarding";
  if (!hasCompletedAuthFlow) return "GetStarted";
  return "Main";
}

type RootStackProps = {
  hasSeenOnboarding: boolean;
  hasCompletedAuthFlow: boolean;
};

export default function RootStack({
  hasSeenOnboarding,
  hasCompletedAuthFlow,
}: RootStackProps) {
  const initialRoute = getInitialRoute(hasSeenOnboarding, hasCompletedAuthFlow);

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#fff" },
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
        component={MainTabs}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
