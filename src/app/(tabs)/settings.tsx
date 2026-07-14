import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, TrainingScreen } from "@/components/TrainingPrimitives";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { BodyweightGoal, WeightUnit, useBodyweight } from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { ThemePreference, useThemePreference } from "@/hooks/use-theme-preference";
import { showToast } from "@/utils/toast";
import { fromKilograms, toKilograms } from "@/utils/weight-units";

const GOALS = [
  { value: "lose", label: "Lose" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain" },
] as const;

export default function SettingsScreen() {
  const { settings, updateSettings } = useBodyweight();
  return (
    <SettingsForm
      key={`${settings.goal}-${settings.weightUnit}-${settings.weeklyTarget}`}
      initialSettings={settings}
      updateSettings={updateSettings}
    />
  );
}

function SettingsForm({ initialSettings, updateSettings }: {
  initialSettings: ReturnType<typeof useBodyweight>["settings"];
  updateSettings: ReturnType<typeof useBodyweight>["updateSettings"];
}) {
  const theme = useTheme();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const [goal, setGoal] = useState<BodyweightGoal>(initialSettings.goal);
  const [unit, setUnit] = useState<WeightUnit>(initialSettings.weightUnit);
  const [weeklyTarget, setWeeklyTarget] = useState(
    fromKilograms(initialSettings.weeklyTarget, initialSettings.weightUnit).toFixed(1),
  );

  const changeTheme = async (preference: ThemePreference) => {
    const success = await setThemePreference(preference);
    if (!success) showToast("Could not change theme", "Please try again.", theme, "error");
  };

  const parsedWeeklyTarget = () => {
    const target = Number(weeklyTarget.replace(",", "."));
    return Number.isFinite(target) && target > 0
      ? toKilograms(target, unit)
      : initialSettings.weeklyTarget;
  };

  const persistBodyweightSettings = async (
    nextGoal: BodyweightGoal,
    nextUnit: WeightUnit,
    nextWeeklyTarget: number,
  ) => {
    const success = await updateSettings({
      goal: nextGoal,
      weightUnit: nextUnit,
      weeklyTarget: nextWeeklyTarget,
    });
    if (!success) showToast("Could not save settings", "Please try again.", theme, "error");
  };

  const changeUnit = (nextUnit: WeightUnit) => {
    const current = Number(weeklyTarget.replace(",", "."));
    const kilograms = Number.isFinite(current) && current > 0
      ? toKilograms(current, unit)
      : initialSettings.weeklyTarget;
    setWeeklyTarget(fromKilograms(kilograms, nextUnit).toFixed(1));
    setUnit(nextUnit);
    void persistBodyweightSettings(goal, nextUnit, kilograms);
  };

  const changeGoal = (nextGoal: BodyweightGoal) => {
    setGoal(nextGoal);
    void persistBodyweightSettings(nextGoal, unit, parsedWeeklyTarget());
  };

  const saveWeeklyTarget = () => {
    const target = Number(weeklyTarget.replace(",", "."));
    if (!Number.isFinite(target) || target <= 0) {
      showToast("Invalid target", "Enter a weekly target greater than zero.", theme, "error");
      setWeeklyTarget(fromKilograms(initialSettings.weeklyTarget, unit).toFixed(1));
      return;
    }
    void persistBodyweightSettings(goal, unit, toKilograms(target, unit));
  };

  return (
    <TrainingScreen>
      <ScreenHeader title="Settings" subtitle="Preferences" />

      <LiquidCard style={styles.card}>
        <View style={styles.copy}>
          <ThemedText type="subtitle">Theme</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
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
          <ThemedText type="subtitle">Weight unit</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Used for bodyweight and workout weights. Existing data stays unchanged.
          </ThemedText>
        </View>
        <SegmentedControl<WeightUnit>
          label="Weight unit"
          value={unit}
          onChange={changeUnit}
          options={[{ value: "kg", label: "kg" }, { value: "lbs", label: "lbs" }]}
        />
      </LiquidCard>

      <LiquidCard style={styles.card}>
        <View style={styles.copy}>
          <ThemedText type="subtitle">Bodyweight goal</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose your direction and desired weekly rate.
          </ThemedText>
        </View>
        <SegmentedControl<BodyweightGoal>
          label="Bodyweight goal"
          value={goal}
          onChange={changeGoal}
          options={GOALS}
        />
        <View style={styles.targetRow}>
          <View style={styles.targetCopy}>
            <ThemedText type="smallBold">Weekly target</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{unit}/week</ThemedText>
          </View>
          <LiquidInput
            accessibilityLabel={`Weekly target in ${unit}`}
            value={weeklyTarget}
            onChangeText={setWeeklyTarget}
            onEndEditing={saveWeeklyTarget}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={styles.input}
          />
        </View>
      </LiquidCard>
      <ThemedText type="small" themeColor="textSecondary" style={styles.autoSaveCopy}>
        Changes are saved automatically.
      </ThemedText>
    </TrainingScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  copy: { gap: Spacing.one },
  targetRow: { alignItems: "center", flexDirection: "row", gap: Spacing.three },
  targetCopy: { flex: 1 },
  input: { width: 120 },
  autoSaveCopy: { textAlign: "center" },
});
