import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: Typography.caption,
        tabBarStyle: {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.divider,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Training",
          tabBarLabel: "Training",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "barbell" : "barbell-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bodyweight"
        options={{
          title: "Bodyweight",
          tabBarLabel: "Bodyweight",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "scale" : "scale-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
