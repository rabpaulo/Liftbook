import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Keyboard, Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { ExercisePicker } from "@/components/ExercisePicker";
import { EmptyState, TrainingScreen } from "@/components/TrainingPrimitives";
import { WorkoutExerciseDrawer } from "@/components/WorkoutExerciseDrawer";
import { WorkoutSetRow } from "@/components/WorkoutSetRow";
import { WorkoutSetTabs } from "@/components/WorkoutSetTabs";
import { useTodayWorkout } from "@/hooks/use-today-workout";
import type { SessionExercise, WorkoutSet } from "@/utils/training-types";
import { formatRir } from "@/utils/training-format";
import { calculateSetPersonalRecords } from "@/utils/training-calculations";
import { reorderToIndex } from "@/utils/training-position";
import { useTheme } from "@/hooks/use-theme";
import { useWeightUnit } from "@/hooks/use-weight-unit";
import { formatWeight } from "@/utils/weight-units";
import { useAppDialog } from "@/components/AppDialog";

export default function TodayWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const weightUnit = useWeightUnit();
  const { showDialog, showMessage } = useAppDialog();
  const training = useTodayWorkout(id ?? "");
  const { workout } = training;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [editingNotes, setEditingNotes] = useState<SessionExercise | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const openExerciseList = useCallback(() => {
    Keyboard.dismiss();
    setDrawerOpen(true);
  }, []);

  const openDrawerGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX(18)
    .failOffsetY([-24, 24])
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX >= 56) openExerciseList();
    }), [openExerciseList]);

  if (training.loading) return <TrainingScreen><ThemedText themeColor="textSecondary">Loading today’s workout…</ThemedText></TrainingScreen>;
  if (!workout) return <TrainingScreen><ScreenHeader title="Workout" showBack /><EmptyState title="Workout unavailable" message={training.error ?? "This workout no longer exists."} /></TrainingScreen>;
  const name = nameDraft ?? workout.name;
  const notes = notesDraft ?? workout.notes ?? "";

  const deleteMenu = async () => {
    const action = await showDialog({
      title: "Delete today’s workout?",
      message: "Its sets and local videos will be permanently deleted.",
      icon: "trash-outline",
      actions: [
        { id: "delete", label: "Delete workout", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action !== "delete") return;
    try {
      await training.deleteWorkout();
      router.replace("/(tabs)");
    } catch (cause) {
      await showMessage("Could not delete workout", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  const persistWorkout = async (patch: { name?: string; notes?: string | null }) => {
    try {
      await training.updateWorkout(patch);
    } catch (cause) {
      setNameDraft(null);
      setNotesDraft(null);
      await showMessage("Could not save workout", cause instanceof Error ? cause.message : "Your previous saved value was restored.");
    }
  };

  const exerciseMenu = async (exercise: SessionExercise) => {
    const action = await showDialog({
      title: exercise.exerciseName,
      message: "Workout exercise actions",
      icon: "barbell-outline",
      actions: [
        { id: "notes", label: "Edit setup notes", variant: "primary" },
        { id: "remove", label: "Remove from workout", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    try {
      if (action === "notes") setEditingNotes(exercise);
      if (action === "remove") {
        const confirmation = await showDialog({
          title: `Remove ${exercise.exerciseName}?`,
          message: "The exercise and its logged sets will be removed from today’s workout. The exercise library will not be affected.",
          icon: "trash-outline",
          actions: [
            { id: "remove", label: "Remove exercise", variant: "destructive" },
            { id: "cancel", label: "Keep exercise", variant: "ghost" },
          ],
        });
        if (confirmation === "remove") await training.removeExercise(exercise.id);
      }
    } catch (cause) {
      await showMessage("Could not update exercise", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  const reorderExercise = async (exerciseId: string, targetIndex: number) => {
    const exercises = reorderToIndex(workout.exercises, exerciseId, targetIndex);
    if (exercises.every((exercise, index) => exercise.id === workout.exercises[index]?.id)) return;
    try {
      await training.reorderExercises(exercises.map((exercise) => exercise.id));
    } catch (cause) {
      await showMessage("Could not reorder exercises", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  const selectedExercise = workout.exercises.find((exercise) => exercise.id === selectedExerciseId)
    ?? workout.exercises[0]
    ?? null;
  const selectedIndex = selectedExercise
    ? workout.exercises.findIndex((exercise) => exercise.id === selectedExercise.id)
    : -1;

  return (
    <View style={styles.screen}>
      <TrainingScreen key={selectedExercise?.id ?? "empty-workout"}>
        <ScreenHeader
          title="Today’s workout"
          showBack
          right={(
            <View style={styles.headerActions}>
              <Pressable accessibilityLabel="Open exercise list" onPress={openExerciseList} style={styles.iconButton}>
                <Ionicons name="list" size={24} color={theme.text} />
              </Pressable>
              <Pressable accessibilityLabel="Delete workout" onPress={() => void deleteMenu()} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={23} color={theme.danger} />
              </Pressable>
            </View>
          )}
        />
        <LiquidInput value={name} onChangeText={setNameDraft} onBlur={() => void persistWorkout({ name })} placeholder="Workout name" />
        <LiquidInput value={notes} onChangeText={setNotesDraft} onBlur={() => void persistWorkout({ notes })} placeholder="Workout notes (optional)" multiline />

        {!selectedExercise ? (
          <EmptyState title="Empty workout" message="Open the exercise list to add your first exercise." />
        ) : (
          <>
            <Pressable
              accessibilityHint="Opens the reorderable exercise list"
              accessibilityLabel={`Selected exercise ${selectedIndex + 1} of ${workout.exercises.length}: ${selectedExercise.exerciseName}`}
              accessibilityRole="button"
              onPress={openExerciseList}
              style={[styles.exerciseSelector, { backgroundColor: theme.backgroundElement, borderColor: theme.divider }]}
            >
              <View style={[styles.selectorIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="list" size={21} color={theme.text} />
              </View>
              <View style={styles.selectorCopy}>
                <ThemedText type="smallBold" numberOfLines={1}>{selectedExercise.exerciseName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Exercise {selectedIndex + 1} of {workout.exercises.length} · Swipe right from the edge
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </Pressable>

            <SelectedExerciseDetails
              exercise={selectedExercise}
              key={selectedExercise.id}
              onMenu={() => void exerciseMenu(selectedExercise)}
              training={training}
              weightUnit={weightUnit}
            />
          </>
        )}
      </TrainingScreen>

      <GestureDetector gesture={openDrawerGesture}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.edgeGestureArea}>
          <View style={[styles.edgeHandle, { backgroundColor: theme.textSecondary }]} />
        </View>
      </GestureDetector>

      <WorkoutExerciseDrawer
        exercises={workout.exercises}
        onAddExercise={() => setPicker(true)}
        onClose={() => setDrawerOpen(false)}
        onReorder={(exerciseId, targetIndex) => void reorderExercise(exerciseId, targetIndex)}
        onSelect={setSelectedExerciseId}
        selectedExerciseId={selectedExercise?.id ?? null}
        visible={drawerOpen}
      />
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={training.addExercise} />
      {editingNotes ? <ExerciseNotesModal exercise={editingNotes} onClose={() => setEditingNotes(null)} onSave={async (value) => { await training.updateExerciseNotes(editingNotes.id, value); setEditingNotes(null); }} /> : null}
    </View>
  );
}

function SelectedExerciseDetails({
  exercise,
  weightUnit,
  training,
  onMenu,
}: {
  exercise: SessionExercise;
  weightUnit: "kg" | "lbs";
  training: ReturnType<typeof useTodayWorkout>;
  onMenu: () => void;
}) {
  const theme = useTheme();
  const personalRecords = calculateSetPersonalRecords(
    exercise.sets,
    exercise.priorPersonalRecords,
  );

  return (
    <LiquidCard style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseTitle}>
          <ThemedText type="subtitle">{exercise.exerciseName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{exercise.exerciseCategory}</ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.exerciseName} options`} onPress={onMenu} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={24} color={theme.text} /></Pressable>
      </View>
      {exercise.exerciseNotes ? <View style={[styles.notes, { backgroundColor: theme.backgroundSelected }]}><Ionicons name="information-circle-outline" size={19} color={theme.textSecondary} /><ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>{exercise.exerciseNotes}</ThemedText></View> : null}
      {exercise.previousSets?.length ? <ThemedText type="small" themeColor="textSecondary">Previous: {exercise.previousSets.map((set) => formatPrevious(set, weightUnit)).join(" · ")}</ThemedText> : <ThemedText type="small" themeColor="textSecondary">No previous completed performance</ThemedText>}
      <View style={styles.sets}>
        <WorkoutSetTabs sets={exercise.sets} renderSet={(set, setIndex, tabbed) => (
          <WorkoutSetRow
            key={`${set.id}-${weightUnit}`}
            personalRecord={personalRecords[setIndex]}
            set={set}
            unit={weightUnit}
            showPosition={!tabbed}
            previous={exercise.previousSets?.[setIndex] ? formatPrevious(exercise.previousSets[setIndex], weightUnit) : undefined}
            onUpdate={(patch) => training.updateSet(set.id, patch)}
            onDelete={() => training.deleteSet(set.id)}
          />
        )} />
      </View>
      <LiquidButton onPress={() => void training.addSet(exercise.id, exercise.sets.at(-1)?.weight ?? null)}>Add set</LiquidButton>
    </LiquidCard>
  );
}

function ExerciseNotesModal({ exercise, onClose, onSave }: { exercise: SessionExercise; onClose: () => void; onSave: (notes: string) => Promise<void> }) {
  const theme = useTheme();
  const [value, setValue] = useState(exercise.exerciseNotes ?? "");
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.overlay}><ThemedView style={[styles.dialog, { borderColor: theme.divider }]}><ThemedText type="subtitle">Setup notes</ThemedText><ThemedText type="small" themeColor="textSecondary">Only this workout snapshot is changed.</ThemedText><LiquidInput autoFocus multiline value={value} onChangeText={setValue} /><LiquidButton variant="primary" onPress={() => void onSave(value)}>Save notes</LiquidButton><LiquidButton variant="ghost" onPress={onClose}>Cancel</LiquidButton></ThemedView></View></Modal>;
}

function formatPrevious(set: WorkoutSet, unit: "kg" | "lbs") {
  return `${set.weight === null ? "—" : formatWeight(set.weight, unit)} × ${set.repetitions ?? "—"}${set.rir === null ? "" : ` @ ${formatRir(set.rir)}`}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: Spacing.one },
  exerciseCard: { gap: Spacing.three },
  exerciseHeader: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  exerciseTitle: { flex: 1, minWidth: 0 },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  exerciseSelector: {
    alignItems: "center",
    borderRadius: Radius.large,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 64,
    padding: Spacing.two,
  },
  selectorIcon: { alignItems: "center", borderRadius: Radius.medium, height: 44, justifyContent: "center", width: 44 },
  selectorCopy: { flex: 1, minWidth: 0 },
  edgeGestureArea: {
    alignItems: "flex-start",
    bottom: 104,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    top: 112,
    width: 32,
    zIndex: 30,
  },
  edgeHandle: { borderRadius: Radius.pill, height: 48, opacity: 0.38, width: 4 },
  notes: { alignItems: "flex-start", borderRadius: Radius.medium, flexDirection: "row", gap: Spacing.two, padding: Spacing.two },
  sets: { gap: Spacing.two },
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", flex: 1, justifyContent: "center", padding: Spacing.three },
  dialog: { borderRadius: Radius.large, borderWidth: 1, gap: Spacing.three, maxWidth: 520, padding: Spacing.three, width: "100%" },
});
