import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { initDB } from "@/database/database";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect } from "react";
import { Text, View, useColorScheme } from "react-native";
import Toast from "react-native-toast-message";

const toastConfig = {
  customToast: ({ text1, props }: any) => (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#15e915",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: props.backgroundColor,
      }}
    >
      <Text style={{ color: props.textColor }}>{text1}</Text>
    </View>
  ),
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter: require("../../assets/fonts/static/Inter_18pt-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/static/Inter_18pt-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/static/Inter_18pt-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/static/Inter_18pt-Bold.ttf"),
    "Inter-ExtraBold": require("../../assets/fonts/static/Inter_18pt-ExtraBold.ttf"),
    "Inter-Light": require("../../assets/fonts/static/Inter_18pt-Light.ttf"),
    "Inter-Italic": require("../../assets/fonts/static/Inter_18pt-Italic.ttf"),
  });

  {/*
    Corrigi um bug do expo-sqlite: o Expo faz um "cache" da conexão no JavaScript, mas o Android destrói a conexão nativa para economizar memória no background. 
    Quando você volta, o Expo tenta usar o cache morto.
    Para resolver, force o fechamento do banco quando o app for minimizado.
    Isso obriga o Expo a recriar a conexão do zero quando você voltar.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "background") {
          // Fecha o banco para limpar o cache quando o app minimizar
          const db = await SQLite.openDatabaseAsync("liftbook.db");
          await db.closeAsync();
        }
      },
    );
    return () => subscription.remove();
  }, []);
  */}

  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <AppTabs />
        <Toast config={toastConfig} />
      </View>
    </ThemeProvider>
  );
}
