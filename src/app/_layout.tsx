import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { initDB } from '@/database/database';
import { useFonts } from 'expo-font';
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
  const [fontsLoaded] = useFonts({
    Inter: require('../../assets/fonts/static/Inter_18pt-Regular.ttf'),
    'Inter-Medium': require('../../assets/fonts/static/Inter_18pt-Medium.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/static/Inter_18pt-SemiBold.ttf'),
    'Inter-Bold': require('../../assets/fonts/static/Inter_18pt-Bold.ttf'),
    'Inter-ExtraBold': require('../../assets/fonts/static/Inter_18pt-ExtraBold.ttf'),
    'Inter-Light': require('../../assets/fonts/static/Inter_18pt-Light.ttf'),
    'Inter-Italic': require('../../assets/fonts/static/Inter_18pt-Italic.ttf'),
  });
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  if (!fontsLoaded) return null;

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