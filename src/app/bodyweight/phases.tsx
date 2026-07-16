import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAppDialog } from "@/components/AppDialog";
import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, SectionHeader, TrainingScreen } from "@/components/TrainingPrimitives";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/theme";
import {
  type BodyweightGoal,
  type BodyweightPhase,
  useBodyweight,
} from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import {
  getBodyweightPhasePlannedEnd,
  getBodyweightPhaseProgress,
  getBodyweightPhaseStatus,
  parseLocalDate,
} from "@/utils/bodyweight-phases";
import { showToast } from "@/utils/toast";
import { fromKilograms, toKilograms } from "@/utils/weight-units";

const GOALS = [
  { value: "lose", label: "Lose" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain" },
] as const;

const GOAL_LABELS = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain weight",
} satisfies Record<BodyweightGoal, string>;

function formatPhaseDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPhaseRange(phase: BodyweightPhase) {
  return `${formatPhaseDate(parseLocalDate(phase.startedOn))} – ${formatPhaseDate(getBodyweightPhasePlannedEnd(phase))}`;
}

export default function BodyweightPhasesScreen() {
  const theme = useTheme();
  const { showDialog } = useAppDialog();
  const {
    settings,
    phases,
    activePhase,
    addPhase,
    updatePhase,
    endPhase,
    removePhase,
  } = useBodyweight();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingPhase, setEditingPhase] = useState<BodyweightPhase | null>(null);
  const [name, setName] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("12");
  const [goal, setGoal] = useState<BodyweightGoal>("maintain");
  const [weeklyTarget, setWeeklyTarget] = useState("0.0");
  const [saving, setSaving] = useState(false);

  const openNewPhase = () => {
    setEditingPhase(null);
    setName("");
    setDurationWeeks("12");
    const nextGoal = activePhase?.goal ?? "maintain";
    setGoal(nextGoal);
    setWeeklyTarget(
      nextGoal === "maintain"
        ? "0.0"
        : fromKilograms(activePhase?.weeklyTarget ?? 0.5, settings.weightUnit).toFixed(1),
    );
    setEditorVisible(true);
  };

  const openEditPhase = (phase: BodyweightPhase) => {
    setEditingPhase(phase);
    setName(phase.name);
    setDurationWeeks(String(phase.durationWeeks));
    setGoal(phase.goal);
    setWeeklyTarget(fromKilograms(phase.weeklyTarget, settings.weightUnit).toFixed(1));
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingPhase(null);
  };

  const changeGoal = (nextGoal: BodyweightGoal) => {
    setGoal(nextGoal);
    if (nextGoal === "maintain") {
      setWeeklyTarget("0.0");
      return;
    }
    const currentTarget = Number(weeklyTarget.replace(",", "."));
    if (!Number.isFinite(currentTarget) || currentTarget <= 0) {
      setWeeklyTarget(fromKilograms(0.5, settings.weightUnit).toFixed(1));
    }
  };

  const savePhase = async () => {
    const parsedDuration = Number(durationWeeks);
    const parsedTarget = goal === "maintain" ? 0 : Number(weeklyTarget.replace(",", "."));
    if (!name.trim()) {
      showToast("Phase name required", "Give this phase a recognizable name.", theme, "error");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 104) {
      showToast("Invalid duration", "Enter a duration from 1 to 104 weeks.", theme, "error");
      return;
    }
    if (goal !== "maintain" && (!Number.isFinite(parsedTarget) || parsedTarget <= 0)) {
      showToast("Invalid weekly trend", "Enter a weekly trend greater than zero.", theme, "error");
      return;
    }

    if (!editingPhase && activePhase) {
      const action = await showDialog({
        title: "Start a new phase?",
        message: `${activePhase.name} will end today and remain in your phase history.`,
        icon: "flag-outline",
        actions: [
          { id: "start", label: "Start new phase", variant: "primary" },
          { id: "cancel", label: "Cancel", variant: "ghost" },
        ],
      });
      if (action !== "start") return;
    }

    if (saving) return;
    setSaving(true);
    const draft = {
      name,
      goal,
      durationWeeks: parsedDuration,
      weeklyTarget: goal === "maintain" ? 0 : toKilograms(parsedTarget, settings.weightUnit),
    };
    const success = editingPhase
      ? await updatePhase(editingPhase.id, draft)
      : await addPhase(draft);
    setSaving(false);
    if (!success) {
      showToast("Could not save phase", "Please try again.", theme, "error");
      return;
    }
    closeEditor();
    showToast(
      editingPhase ? "Phase updated" : "Phase started",
      editingPhase ? "Your changes have been saved." : "Your new bodyweight goal is now active.",
      theme,
      "success",
    );
  };

  const confirmEndPhase = async (phase: BodyweightPhase) => {
    const action = await showDialog({
      title: "End this phase?",
      message: `${phase.name} will move to your phase history.`,
      icon: "stop-circle-outline",
      actions: [
        { id: "end", label: "End phase", variant: "destructive" },
        { id: "cancel", label: "Keep phase", variant: "ghost" },
      ],
    });
    if (action !== "end") return;
    const success = await endPhase(phase.id);
    showToast(
      success ? "Phase ended" : "Could not end phase",
      success ? "The phase remains available in your history." : "Please try again.",
      theme,
      success ? "success" : "error",
    );
  };

  const confirmDeletePhase = async (phase: BodyweightPhase) => {
    const action = await showDialog({
      title: "Delete this phase?",
      message: `${phase.name} will be permanently removed. Your bodyweight logs will not be affected.`,
      icon: "trash-outline",
      actions: [
        { id: "delete", label: "Delete phase", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action !== "delete") return;
    const success = await removePhase(phase.id);
    showToast(
      success ? "Phase deleted" : "Could not delete phase",
      success ? "The phase has been removed." : "Please try again.",
      theme,
      success ? "success" : "error",
    );
  };

  const history = phases.filter((phase) => phase.id !== activePhase?.id);
  const progress = activePhase ? getBodyweightPhaseProgress(activePhase) : null;

  const phaseGoalCopy = (phase: BodyweightPhase) => {
    const target = fromKilograms(phase.weeklyTarget, settings.weightUnit).toFixed(1);
    return `${GOAL_LABELS[phase.goal]} · ${target} ${settings.weightUnit}/week`;
  };

  return (
    <TrainingScreen>
      <ScreenHeader title="Phases" subtitle="Bodyweight" showBack />

      {activePhase && progress ? (
        <LiquidCard style={styles.currentCard}>
          <View style={styles.cardHeading}>
            <View style={styles.flexText}>
              <ThemedText type="label" themeColor="accent">Current phase</ThemedText>
              <ThemedText type="title">{activePhase.name}</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                {phaseGoalCopy(activePhase)}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="label" themeColor="accent">Active</ThemedText>
            </View>
          </View>
          <View style={styles.progressCopy}>
            <ThemedText type="caption" themeColor="textSecondary">
              Day {progress.currentDay} of {progress.totalDays}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {activePhase.durationWeeks} {activePhase.durationWeeks === 1 ? "week" : "weeks"}
            </ThemedText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.accent, width: `${Math.round(progress.progress * 100)}%` },
              ]}
            />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatPhaseRange(activePhase)}
          </ThemedText>
          <View style={styles.actionRow}>
            <LiquidButton style={styles.actionButton} onPress={() => openEditPhase(activePhase)}>
              Edit phase
            </LiquidButton>
            <LiquidButton
              style={styles.actionButton}
              variant="ghost"
              onPress={() => void confirmEndPhase(activePhase)}
            >
              End phase
            </LiquidButton>
          </View>
        </LiquidCard>
      ) : (
        <LiquidCard style={styles.emptyCard}>
          <ThemedText type="section">No active phase</ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
            Start a phase to give your bodyweight goal a name, duration, and weekly trend.
          </ThemedText>
        </LiquidCard>
      )}

      {!editorVisible ? (
        <LiquidButton variant="primary" onPress={openNewPhase}>
          {activePhase ? "Start a new phase" : "Create phase"}
        </LiquidButton>
      ) : (
        <LiquidCard style={styles.editorCard}>
          <View style={styles.cardHeading}>
            <View style={styles.flexText}>
              <ThemedText type="section">{editingPhase ? "Edit phase" : "New phase"}</ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                {editingPhase ? "Update this phase's plan." : "The phase starts today."}
              </ThemedText>
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="label">Phase name</ThemedText>
            <LiquidInput
              accessibilityLabel="Phase name"
              autoCapitalize="sentences"
              maxLength={80}
              onChangeText={setName}
              placeholder="ex: Summer cut"
              returnKeyType="next"
              value={name}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label">Duration</ThemedText>
            <View style={styles.inputWithSuffix}>
              <LiquidInput
                accessibilityLabel="Phase duration in weeks"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setDurationWeeks}
                style={styles.numericInput}
                value={durationWeeks}
              />
              <View style={[styles.suffix, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="label">weeks</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="label">Goal</ThemedText>
            <SegmentedControl<BodyweightGoal>
              label="Phase goal"
              onChange={changeGoal}
              options={GOALS}
              value={goal}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label">Weekly trend</ThemedText>
            <View style={styles.inputWithSuffix}>
              <LiquidInput
                accessibilityLabel={`Weekly phase trend in ${settings.weightUnit}`}
                editable={goal !== "maintain"}
                keyboardType="decimal-pad"
                onChangeText={setWeeklyTarget}
                style={styles.numericInput}
                value={weeklyTarget}
              />
              <View style={[styles.suffix, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="label">{settings.weightUnit}/week</ThemedText>
              </View>
            </View>
            {goal === "maintain" ? (
              <ThemedText type="caption" themeColor="textSecondary">
                Maintaining targets a net change of 0 {settings.weightUnit}/week.
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            <LiquidButton style={styles.actionButton} variant="ghost" disabled={saving} onPress={closeEditor}>
              Cancel
            </LiquidButton>
            <LiquidButton
              style={styles.actionButton}
              variant="primary"
              disabled={saving}
              onPress={() => void savePhase()}
            >
              {saving ? "Saving…" : editingPhase ? "Save changes" : "Start phase"}
            </LiquidButton>
          </View>
        </LiquidCard>
      )}

      <SectionHeader title="Phase history" />
      {history.length === 0 ? (
        <LiquidCard style={styles.emptyHistory}>
          <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
            Completed and replaced phases will appear here.
          </ThemedText>
        </LiquidCard>
      ) : history.map((phase) => {
        const status = getBodyweightPhaseStatus(phase);
        const endedDate = phase.endedOn
          ? formatPhaseDate(parseLocalDate(phase.endedOn))
          : formatPhaseDate(getBodyweightPhasePlannedEnd(phase));
        return (
          <LiquidCard key={phase.id} style={styles.historyCard}>
            <View style={styles.cardHeading}>
              <View style={styles.flexText}>
                <ThemedText type="bodyMedium">{phase.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {phaseGoalCopy(phase)}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {status === "upcoming" ? "Upcoming" : `Ended ${endedDate}`}
              </ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {phase.durationWeeks} {phase.durationWeeks === 1 ? "week" : "weeks"} · {formatPhaseRange(phase)}
            </ThemedText>
            <View style={styles.actionRow}>
              <LiquidButton style={styles.actionButton} onPress={() => openEditPhase(phase)}>
                Edit
              </LiquidButton>
              <LiquidButton
                style={styles.actionButton}
                variant="ghost"
                onPress={() => void confirmDeletePhase(phase)}
              >
                Delete
              </LiquidButton>
            </View>
          </LiquidCard>
        );
      })}
    </TrainingScreen>
  );
}

const styles = StyleSheet.create({
  currentCard: { gap: Spacing.md },
  emptyCard: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  emptyHistory: { alignItems: "center" },
  centerText: { maxWidth: 420, textAlign: "center" },
  cardHeading: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.sm },
  flexText: { flex: 1, gap: Spacing.xs },
  statusBadge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  progressCopy: { flexDirection: "row", justifyContent: "space-between" },
  progressTrack: { borderRadius: Radius.pill, height: 8, overflow: "hidden" },
  progressFill: { borderRadius: Radius.pill, height: "100%" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  actionButton: { flex: 1, minWidth: 130 },
  editorCard: { gap: Spacing.md },
  field: { gap: Spacing.sm },
  inputWithSuffix: { alignItems: "stretch", flexDirection: "row", gap: Spacing.sm },
  numericInput: { ...Typography.numeric, flex: 1 },
  suffix: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minWidth: 96,
    paddingHorizontal: Spacing.md,
  },
  historyCard: { gap: Spacing.md },
});
