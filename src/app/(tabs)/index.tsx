import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppDialog } from "@/components/AppDialog";
import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTrainingHome } from "@/hooks/use-training-home";
import { workoutService } from "@/utils/workout-service";
import { EmptyState, SectionHeader, TrainingScreen } from "@/components/TrainingPrimitives";
import { isWorkoutEmpty } from "@/utils/training-validation";
import { useTheme } from "@/hooks/use-theme";

export default function TrainingHomeScreen() {
  const theme = useTheme();
  const { todayWorkout, templates, loading, error, refresh } = useTrainingHome();
  const { showDialog, showMessage } = useAppDialog();
  const [starting, setStarting] = useState(false);

  const startEmpty = async () => {
    if (starting) return;
    let currentWorkout;
    try {
      currentWorkout = await workoutService.getTodayWorkout();
    } catch (cause) {
      await showMessage("Could not load today’s workout", cause instanceof Error ? cause.message : "Try again.");
      return;
    }
    if (currentWorkout) {
      const isEmpty = isWorkoutEmpty(currentWorkout);
      const action = await showDialog({
        title: "Workout already exists today",
        message: isEmpty
          ? "Discard the empty workout before starting a new one."
          : "Open today’s workout instead of starting another one.",
        icon: isEmpty ? "trash-outline" : "calendar-outline",
        actions: isEmpty
          ? [
              { id: "discard", label: "Discard and start", variant: "destructive" },
              { id: "cancel", label: "Cancel", variant: "ghost" },
            ]
          : [
              { id: "open", label: "Open today’s workout", variant: "primary" },
              { id: "cancel", label: "Cancel", variant: "ghost" },
            ],
      });
      if (action === "open") {
        router.push({ pathname: "/training/today/[id]", params: { id: currentWorkout.id } });
      } else if (action === "discard") {
        try {
          await workoutService.deleteWorkout(currentWorkout.id);
          await startNewEmpty();
        } catch (cause) {
          await showMessage("Could not replace workout", cause instanceof Error ? cause.message : "Try again.");
          await refresh();
        }
      }
      return;
    }
    await startNewEmpty();
  };

  const startNewEmpty = async () => {
    setStarting(true);
    try {
      const workout = await workoutService.startEmptyWorkout();
      router.push({ pathname: "/training/today/[id]", params: { id: workout.id } });
    } catch (cause) {
      await showMessage("Could not start workout", cause instanceof Error ? cause.message : "Try again.");
      await refresh();
    } finally {
      setStarting(false);
    }
  };

  return (
    <TrainingScreen>
      <ScreenHeader title="Training"/>
      {error ? <Pressable onPress={() => void refresh()}><ThemedText themeColor="danger">{error} Tap to retry.</ThemedText></Pressable> : null}

      <SectionHeader title="Start workout" />
      <View style={styles.actions}>
        <ActionCard icon="albums-outline" title="Start from template" detail={templates.length ? `${templates.length} saved templates` : "Create your first template"} onPress={() => router.push("/training/templates")} />
        <ActionCard icon="add-circle-outline" title="Start empty workout" detail="Build it as you train" onPress={() => void startEmpty()} />
      </View>

      <View style={styles.manageRow}>
        <LiquidButton style={{ flex: 1 }} onPress={() => router.push("/training/exercises")}>Exercise library</LiquidButton>
        <LiquidButton style={{ flex: 1 }} onPress={() => router.push("/training/history")}>History</LiquidButton>
      </View>

      <SectionHeader title="Today’s workout" />
      {loading ? <ThemedText themeColor="textSecondary">Loading training…</ThemedText> : !todayWorkout ? (
        <EmptyState title="No training logged today" message="Log a set to see today’s workout here." />
      ) : (
        <Pressable onPress={() => router.push({ pathname: "/training/today/[id]", params: { id: todayWorkout.id } })}>
          <LiquidCard style={styles.historyCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodyMedium">{todayWorkout.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">Today</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {todayWorkout.exerciseCount} exercises · {todayWorkout.completedSetCount} logged sets
            </ThemedText>
          </LiquidCard>
        </Pressable>
      )}
    </TrainingScreen>
  );
}

function ActionCard({ icon, title, detail, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; detail: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.actionCard, { borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icon} size={28} color={theme.accent} />
      <ThemedText type="section">{title}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">{detail}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: Spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  actionCard: { borderRadius: Radius.lg, borderWidth: 1, flex: 1, gap: Spacing.xs, minHeight: 130, minWidth: 150, padding: Spacing.md },
  manageRow: { flexDirection: "row", gap: Spacing.sm },
  historyCard: { gap: Spacing.sm },
});
