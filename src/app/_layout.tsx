import { Radius } from "@/constants/theme";
import { initDB } from "@/database/database";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemePreferenceProvider, useThemePreference } from "@/hooks/use-theme-preference";
import { useTheme } from "@/hooks/use-theme";
import { AppDialogProvider } from "@/components/AppDialog";

const toastConfig = {
  success: ({ text1, props }: any) => (
    <View
      style={{
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: props.borderColor,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: props.backgroundColor,
      }}
    >
      <Text style={{ color: props.textColor }}>{text1}</Text>
    </View>
  ),
  error: ({ text1, text2, props }: any) => (
    <View
      style={{
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: props.borderColor,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: props.backgroundColor,
      }}
    >
      <Text style={{ color: props.textColor, fontSize: 16, fontWeight: "bold" }}>{text1}</Text>
      <Text style={{ color: props.textColor, fontSize: 12 }}>{text2}</Text>
    </View>
  ),
};

export default function RootLayout() {
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/static/Inter_18pt-Regular.ttf"),
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: "#000000" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" }}>Database unavailable</Text>
        <Text style={{ color: "#BFBFBF", fontSize: 15, textAlign: "center" }}>{databaseError} Your existing data has not been deleted.</Text>
        <Pressable onPress={() => void initialize()} style={{ minHeight: 48, borderRadius: 16, backgroundColor: "#FFFFFF", paddingHorizontal: 24, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#000000", fontWeight: "700" }}>Try again</Text>
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
