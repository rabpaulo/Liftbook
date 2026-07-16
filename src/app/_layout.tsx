import { Fonts, Radius, Spacing, Typography } from "@/constants/theme";
import { initDB } from "@/database/database";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemePreferenceProvider, useThemePreference } from "@/hooks/use-theme-preference";
import { useTheme } from "@/hooks/use-theme";
import { AppDialogProvider } from "@/components/AppDialog";

const toastConfig = {
  success: ({ text1, props }: any) => (
    <ToastContent text1={text1} props={props} />
  ),
  error: ({ text1, text2, props }: any) => (
    <ToastContent text1={text1} text2={text2} props={props} />
  ),
};

function ToastContent({ text1, text2, props }: { text1?: string; text2?: string; props: any }) {
  return (
    <View
      style={[
        styles.toast,
        { borderColor: props.borderColor, backgroundColor: props.backgroundColor },
      ]}
    >
      {text1 ? <Text style={[styles.toastTitle, { color: props.textColor }]}>{text1}</Text> : null}
      {text2 ? <Text style={[styles.toastMessage, { color: props.textColor }]}>{text2}</Text> : null}
    </View>
  );
}

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    [Fonts.regular]: require("../../assets/fonts/static/Inter_18pt-Regular.ttf"),
    [Fonts.medium]: require("../../assets/fonts/static/Inter_18pt-Medium.ttf"),
    [Fonts.semibold]: require("../../assets/fonts/static/Inter_18pt-SemiBold.ttf"),
    [Fonts.bold]: require("../../assets/fonts/static/Inter_18pt-Bold.ttf"),
    [Fonts.extraBold]: require("../../assets/fonts/static/Inter_18pt-ExtraBold.ttf"),
    [Fonts.displayBold]: require("../../assets/fonts/static/Inter_28pt-Bold.ttf"),
    [Fonts.displayExtraBold]: require("../../assets/fonts/static/Inter_28pt-ExtraBold.ttf"),
  });

  const initialize = useCallback(async () => {
    setDatabaseError(null);
    try {
      await initDB();
      setDatabaseReady(true);
    } catch (error) {
      if (__DEV__) console.error("Database initialization failed", error);
      setDatabaseError(error instanceof Error ? error.message : "Liftbook could not prepare its offline database.");
    }
  }, []);

  useEffect(() => {
    void initDB().then(
      () => setDatabaseReady(true),
      (error: unknown) => {
        if (__DEV__) console.error("Database initialization failed", error);
        setDatabaseError(error instanceof Error ? error.message : "Liftbook could not prepare its offline database.");
      },
    );
  }, []);

  if (!fontsLoaded || (!databaseReady && !databaseError)) return null;

  if (databaseError) {
    return (
      <View style={styles.databaseError}>
        <Text style={styles.databaseErrorTitle}>Database unavailable</Text>
        <Text style={styles.databaseErrorMessage}>{databaseError} Your existing data has not been deleted.</Text>
        <Pressable accessibilityRole="button" onPress={() => void initialize()} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
          <Text style={styles.retryButtonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider><AppDialogProvider><AppShell /></AppDialogProvider></ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const theme = useTheme();
  const { resolvedTheme } = useThemePreference();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast config={toastConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    maxWidth: 520,
    minWidth: 240,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toastTitle: Typography.label,
  toastMessage: Typography.caption,
  databaseError: {
    alignItems: "center",
    backgroundColor: "#000000",
    flex: 1,
    gap: Spacing.md,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  databaseErrorTitle: { ...Typography.title, color: "#FFFFFF", textAlign: "center" },
  databaseErrorMessage: { ...Typography.body, color: "#BFBFBF", maxWidth: 520, textAlign: "center" },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  retryButtonLabel: { ...Typography.label, color: "#000000" },
});
