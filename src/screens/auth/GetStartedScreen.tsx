import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootStack";
import { useAuthStore } from "../../store/authStore";
import { useThemeColors } from "../../theme/useThemeColors";
import { signInWithApple, signInWithGoogle } from "../../lib/auth";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "GetStarted">;
};

export default function GetStartedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const setSkipped = useAuthStore((s) => s.setSkipped);
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);

  const canGoBack = navigation.canGoBack();

  const handleSkip = () => {
    setSkipped();
    navigation.navigate("Main");
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const onAuthSuccess = () => {
    navigation.navigate("Main");
  };

  const handleApple = async () => {
    setLoading("apple");
    const result = await signInWithApple();
    setLoading(null);
    if (result.ok) onAuthSuccess();
    else if (result.error !== "Canceled") Alert.alert("Error", result.error);
  };

  const handleGoogle = async () => {
    setLoading("google");
    const result = await signInWithGoogle();
    setLoading(null);
    if (result.ok) onAuthSuccess();
    else if (result.error !== "Canceled") Alert.alert("Error", result.error);
  };

  const handleContinueEmail = () => navigation.navigate("SignIn");

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: colors.background.bgBaseElevated,
        },
      ]}
    >
      {canGoBack ? (
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={24} color={colors.text.textBase} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 8 }]}
          onPress={handleSkip}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: colors.text.textBrand }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.logoSection}>
        <View
          style={[
            styles.logoIcon,
            {
              borderColor: colors.text.textBase,
              backgroundColor: colors.background.bgWhite,
            },
          ]}
        >
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View style={styles.logoInsetOverlay} pointerEvents="none" />
        </View>
        <Text style={[styles.appName, { color: colors.text.textBase }]}>
          Coin Snap
        </Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.buttons}>
        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[
              styles.btnApple,
              { backgroundColor: colors.background.bgInverse },
            ]}
            onPress={handleApple}
            disabled={loading !== null}
            activeOpacity={0.8}
          >
            {loading === "apple" ? (
              <ActivityIndicator color={colors.text.textInverse} />
            ) : (
              <>
                <Ionicons
                  name="logo-apple"
                  size={22}
                  color={colors.text.textInverse}
                />
                <Text
                  style={[
                    styles.btnAppleLabel,
                    { color: colors.text.textInverse },
                  ]}
                >
                  Continue with Apple
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.btnSecondary,
            {
              backgroundColor: colors.surface.onBgAlt,
              borderColor: colors.border.border3,
            },
          ]}
          onPress={handleGoogle}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === "google" ? (
            <ActivityIndicator color={colors.text.textBase} />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={22}
                color={colors.text.textBase}
              />
              <Text
                style={[
                  styles.btnSecondaryLabel,
                  { color: colors.text.textBase },
                ]}
              >
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btnSecondary,
            {
              backgroundColor: colors.surface.onBgAlt,
              borderColor: colors.border.border3,
            },
          ]}
          onPress={handleContinueEmail}
          activeOpacity={0.8}
        >
          <Ionicons name="mail" size={22} color={colors.text.textBase} />
          <Text
            style={[styles.btnSecondaryLabel, { color: colors.text.textBase }]}
          >
            Continue with Email
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.legal, { color: colors.text.textTertiary }]}>
        By tapping continue you are agree to our{" "}
        <Text
          style={[styles.legalLink, { color: colors.text.textBrand }]}
          onPress={() =>
            Linking.openURL("https://webnum.com//coinsnap-privacy-policy")
          }
        >
          Privacy Policy
        </Text>{" "}
        and{" "}
        <Text
          style={[styles.legalLink, { color: colors.text.textBrand }]}
          onPress={() =>
            Linking.openURL("https://webnum.com/coinsnap-terms-of-use")
          }
        >
          Terms of Use
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skipBtn: {
    position: "absolute",
    right: 20,
    zIndex: 1,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 1,
  },
  logoSection: {
    alignItems: "center",
    marginTop: "50%",
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  logoInsetOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
  },
  spacer: {
    flex: 1,
  },
  buttons: {
    gap: 12,
    paddingBottom: 100,
  },
  btnApple: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 56,
    gap: 10,
  },
  btnAppleLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 54,
    gap: 10,
  },
  btnSecondaryLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  legal: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
    fontSize: 13,
    textAlign: "center",
  },
  legalLink: {
    fontWeight: "500",
  },
});
