import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { initDB } from '@/database/database';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';


const toastConfig = {
  customToast: ({ text1, props }: any) => (
    <View 
      style={{ 
        borderRadius: 8, 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: props.backgroundColor,
        borderLeftWidth: 5,
        borderLeftColor: '#15e915'
      }}>
      <Text style={{ color: props.textColor }}>
        {text1}
      </Text>
    </View>
  )
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <AppTabs />
        <Toast config={toastConfig} />
      </View>
    </ThemeProvider>
  );
}