import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { LiquidCard } from "@/components/LiquidCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, TrainingScreen } from "@/components/TrainingPrimitives";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useBodyweight, type WeightUnit } from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { ThemePreference, useThemePreference } from "@/hooks/use-theme-preference";
import { showToast } from "@/utils/toast";

export default function SettingsScreen() {
  const { settings, updateWeightUnit } = useBodyweight();
  return (
    <SettingsForm
      key={settings.weightUnit}
      initialSettings={settings}
      updateWeightUnit={updateWeightUnit}
    />
  );
}

function SettingsForm({ initialSettings, updateWeightUnit }: {
  initialSettings: ReturnType<typeof useBodyweight>["settings"];
  updateWeightUnit: ReturnType<typeof useBodyweight>["updateWeightUnit"];
}) {
  const theme = useTheme();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const [unit, setUnit] = useState<WeightUnit>(initialSettings.weightUnit);

  const changeTheme = async (preference: ThemePreference) => {
    const success = await setThemePreference(preference);
    if (!success) showToast("Could not change theme", "Please try again.", theme, "error");
  };

  const changeUnit = async (nextUnit: WeightUnit) => {
    setUnit(nextUnit);
    const success = await updateWeightUnit(nextUnit);
    if (!success) showToast("Could not save settings", "Please try again.", theme, "error");
  };

  return (
    <TrainingScreen>
      <ScreenHeader title="Settings" subtitle="Preferences" />

      <LiquidCard style={styles.card}>
        <View style={styles.copy}>
          <ThemedText type="section">Theme</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Follow your device or choose a fixed appearance.
          </ThemedText>
        </View>
        <SegmentedControl<ThemePreference>
          label="App theme"
          value={themePreference}
          onChange={(preference) => void changeTheme(preference)}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </LiquidCard>

      <LiquidCard style={styles.card}>
        <View style={styles.copy}>
          <ThemedText type="section">Weight unit</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            Used for bodyweight and workout weights. Existing data stays unchanged.
          </ThemedText>
        </View>
        <SegmentedControl<WeightUnit>
          label="Weight unit"
          value={unit}
          onChange={(nextUnit) => void changeUnit(nextUnit)}
          options={[{ value: "kg", label: "kg" }, { value: "lbs", label: "lbs" }]}
        />
      </LiquidCard>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.autoSaveCopy}>
        Changes are saved automatically.
      </ThemedText>
    </TrainingScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  copy: { gap: Spacing.xs },
  autoSaveCopy: { textAlign: "center" },
});
