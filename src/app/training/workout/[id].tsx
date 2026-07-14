import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppDialog } from "@/components/AppDialog";
import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { EmptyState, TrainingScreen } from "@/components/TrainingPrimitives";
import { WorkoutSetRow } from "@/components/WorkoutSetRow";
import { WorkoutSetTabs } from "@/components/WorkoutSetTabs";
import { workoutSessionRepository } from "@/database/repositories/workoutSessionRepository";
import { workoutService } from "@/utils/workout-service";
import type { WorkoutSessionDetail } from "@/utils/training-types";
import {
  calculateBestPerformance,
  calculateSetPersonalRecords,
  calculateWorkoutSummary,
} from "@/utils/training-calculations";
import { formatWorkoutDate } from "@/utils/training-format";
import { useTheme } from "@/hooks/use-theme";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatWeight } from "@/utils/weight-units";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const weightUnit = useWeightUnit();
  const { showDialog, showMessage } = useAppDialog();
  const [workout, setWorkout] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const value = id ? await workoutSessionRepository.getById(id) : null;
      if (value) {
        for (const exercise of value.exercises) {
          if (!exercise.exerciseId) continue;
          exercise.priorPersonalRecords = await workoutSessionRepository.personalRecordsBefore(
            exercise.exerciseId,
            value.startedAt,
          );
        }
      }
      if (!cancelled) {
        setWorkout(value);
        setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setWorkout(null);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <TrainingScreen><ThemedText themeColor="textSecondary">Loading workout…</ThemedText></TrainingScreen>;
  if (!workout) return <TrainingScreen><ScreenHeader title="Workout" showBack /><EmptyState title="Workout not found" message="It may have been deleted." /></TrainingScreen>;

  const summary = calculateWorkoutSummary(workout);
  const duplicate = async (prefill: boolean) => {
    try {
      const todayWorkout = await workoutService.getTodayWorkout();
      if (todayWorkout) {
        const action = await showDialog({
          title: "Workout already exists today",
          message: "Open today’s workout instead of creating another one.",
          icon: "calendar-outline",
          actions: [
            { id: "open", label: "Open today’s workout", variant: "primary" },
            { id: "cancel", label: "Cancel", variant: "ghost" },
          ],
        });
        if (action === "open") {
          router.push({ pathname: "/training/today/[id]", params: { id: todayWorkout.id } });
        }
        return;
      }
      const copy = await workoutService.duplicateWorkoutForToday(workout.id, prefill);
      router.push({ pathname: "/training/today/[id]", params: { id: copy.id } });
    }
    catch (cause) { await showMessage("Could not duplicate workout", cause instanceof Error ? cause.message : "Try again."); }
  };
  const duplicateMenu = async () => {
    const action = await showDialog({
      title: "Duplicate workout for today",
      message: "Choose whether to prefill the recorded values.",
      icon: "copy-outline",
      actions: [
        { id: "prefill", label: "Prefill recorded values", variant: "primary" },
        { id: "blank", label: "Start with blank values" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action === "prefill" || action === "blank") await duplicate(action === "prefill");
  };
  const saveTemplate = async () => {
    let replaceTemplateId: string | undefined;
    if (workout.templateId) {
      const action = await showDialog({
        title: "Save as template",
        message: "Create a new template or replace the original. Workout history will not change.",
        icon: "albums-outline",
        actions: [
          { id: "create", label: "Create new template", variant: "primary" },
          { id: "replace", label: "Replace original", variant: "destructive" },
          { id: "cancel", label: "Cancel", variant: "ghost" },
        ],
      });
      if (action !== "create" && action !== "replace") return;
      if (action === "replace") replaceTemplateId = workout.templateId;
    }
    try {
      await workoutService.duplicateWorkoutAsTemplate(workout.id, replaceTemplateId);
      await showMessage("Template saved", "The workout structure is now reusable.", "checkmark-circle-outline");
    } catch (cause) {
      await showMessage("Could not save template", cause instanceof Error ? cause.message : "Try again.");
    }
  };
  const remove = async () => {
    const action = await showDialog({
      title: "Delete workout?",
      message: "Its sets and locally stored videos will be permanently deleted.",
      icon: "trash-outline",
      actions: [
        { id: "delete", label: "Delete workout", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action !== "delete") return;
    try {
      await workoutService.deleteWorkout(workout.id);
      router.replace("/training/history");
    } catch (cause) {
      await showMessage("Could not delete workout", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  return (
    <TrainingScreen>
      <ScreenHeader title={workout.name} subtitle="Workout" showBack right={<Pressable accessibilityLabel="Delete workout" onPress={() => void remove()}><Ionicons name="trash-outline" size={23} color={theme.danger} /></Pressable>} />
      <LiquidCard style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">{formatWorkoutDate(workout.startedAt)}</ThemedText>
        <ThemedText type="small">{summary.exerciseCount} exercises</ThemedText>
        {workout.notes ? <ThemedText>{workout.notes}</ThemedText> : null}
      </LiquidCard>
      <LiquidCard style={styles.card}>
        <ThemedText type="subtitle">Totals</ThemedText>
        <View style={styles.metrics}>
          <Metric label="Resistance sets" value={String(summary.completedResistanceSets)} />
        </View>
      </LiquidCard>
      {workout.exercises.map((exercise) => {
        const best = calculateBestPerformance(exercise.sets);
        const personalRecords = calculateSetPersonalRecords(
          exercise.sets,
          exercise.priorPersonalRecords,
        );
        return <LiquidCard key={exercise.id} style={styles.card}>
          <ThemedText type="subtitle">{exercise.exerciseName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{exercise.exerciseCategory}</ThemedText>
          {exercise.exerciseNotes ? <ThemedText type="small">{exercise.exerciseNotes}</ThemedText> : null}
          {best?.highestWeight !== null && best ? <ThemedText type="small" themeColor="textSecondary">Best: {formatWeight(best.highestWeight, weightUnit)}{best.estimatedOneRepMax ? ` · estimated 1RM ${formatWeight(best.estimatedOneRepMax, weightUnit)}` : ""}</ThemedText> : null}
          <WorkoutSetTabs sets={exercise.sets} renderSet={(set, setIndex, tabbed) => (
            <WorkoutSetRow key={`${set.id}-${weightUnit}`} personalRecord={personalRecords[setIndex]} set={set} unit={weightUnit} readOnly showPosition={!tabbed} />
          )} />
        </LiquidCard>;
      })}
      <LiquidButton onPress={() => void duplicateMenu()}>Duplicate for today</LiquidButton>
      <LiquidButton onPress={() => void saveTemplate()}>Save as template</LiquidButton>
      <LiquidButton variant="destructive" onPress={() => void remove()}>Delete workout</LiquidButton>
    </TrainingScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="smallBold">{value}</ThemedText></View>; }

const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.three },
  metric: { gap: Spacing.one, minWidth: 120 },
});
