import { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { ExercisePicker } from "@/components/ExercisePicker";
import { EmptyState, TrainingScreen, useTrainingScroll } from "@/components/TrainingPrimitives";
import { workoutTemplateRepository } from "@/database/repositories/workoutTemplateRepository";
import type { TemplateExercise, WorkoutTemplateDetail } from "@/utils/training-types";
import { normalizeInteger } from "@/utils/training-format";
import { EdgeAutoScroller } from "@/utils/edge-auto-scroller";
import { useTheme } from "@/hooks/use-theme";
import { useStartTemplateWorkout } from "@/hooks/use-start-template-workout";
import { useAppDialog } from "@/components/AppDialog";

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { showDialog, showMessage } = useAppDialog();
  const startTemplateWorkout = useStartTemplateWorkout();
  const [template, setTemplate] = useState<WorkoutTemplateDetail | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [picker, setPicker] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    const value = await workoutTemplateRepository.getById(id);
    setTemplate(value); setName(value?.name ?? ""); setNotes(value?.notes ?? "");
  }, [id]);
  useEffect(() => {
    if (!id) return;
    void workoutTemplateRepository.getById(id).then((value) => {
      setTemplate(value); setName(value?.name ?? ""); setNotes(value?.notes ?? "");
    });
  }, [id]);

  if (!template) return <TrainingScreen><ScreenHeader title="Template" showBack /><ThemedText themeColor="textSecondary">Loading template…</ThemedText></TrainingScreen>;

  const saveInfo = async () => {
    try { await workoutTemplateRepository.update(template.id, name, notes); await load(); }
    catch (cause) { await showMessage("Could not save template", cause instanceof Error ? cause.message : "Try again."); }
  };

  const menu = async () => {
    const action = await showDialog({
      title: "Template actions",
      message: template.name,
      icon: "albums-outline",
      actions: [
        { id: "duplicate", label: "Duplicate template", variant: "primary" },
        { id: "delete", label: "Delete template", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    try {
      if (action === "duplicate") {
        const copy = await workoutTemplateRepository.duplicate(template.id);
        router.replace({ pathname: "/training/template/[id]", params: { id: copy.id } });
      }
      if (action === "delete") {
        const confirmation = await showDialog({
          title: "Delete template?",
          message: "Historical workouts keep their snapshots. Existing workout records will remain unchanged.",
          icon: "trash-outline",
          actions: [
            { id: "delete", label: "Delete template", variant: "destructive" },
            { id: "cancel", label: "Cancel", variant: "ghost" },
          ],
        });
        if (confirmation === "delete") {
          await workoutTemplateRepository.delete(template.id);
          router.back();
        }
      }
    } catch (cause) {
      await showMessage("Could not update template", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  const reorderExercise = async (exerciseId: string, targetIndex: number) => {
    const sourceIndex = template.exercises.findIndex((exercise) => exercise.id === exerciseId);
    const boundedTarget = Math.max(0, Math.min(targetIndex, template.exercises.length - 1));
    if (sourceIndex === -1 || sourceIndex === boundedTarget) return;

    const exercises = [...template.exercises];
    const [moved] = exercises.splice(sourceIndex, 1);
    exercises.splice(boundedTarget, 0, moved);
    setTemplate({ ...template, exercises });
    try {
      await workoutTemplateRepository.reorderExercises(
        template.id,
        exercises.map((exercise) => exercise.id),
      );
    } catch (cause) {
      await load();
      await showMessage("Could not reorder exercises", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  return (
    <TrainingScreen>
      <ScreenHeader title="Edit template" subtitle="Structure" showBack right={<Pressable accessibilityLabel="Template actions" onPress={() => void menu()}><Ionicons name="ellipsis-horizontal" size={26} color={theme.text} /></Pressable>} />
      <LiquidInput value={name} onChangeText={setName} onBlur={() => void saveInfo()} placeholder="Template name" />
      <LiquidInput value={notes} onChangeText={setNotes} onBlur={() => void saveInfo()} placeholder="Template notes" multiline />
      <LiquidButton variant="primary" onPress={() => void startTemplateWorkout(template.id)}>Start this workout</LiquidButton>
      <View style={styles.row}><ThemedText type="section" style={{ flex: 1 }}>Exercises</ThemedText><Pressable onPress={() => setPicker(true)} accessibilityLabel="Add exercise"><Ionicons name="add-circle-outline" size={28} color={theme.accent} /></Pressable></View>
      {template.exercises.length === 0 ? <EmptyState title="Empty template" message="Add exercises to build this workout." /> : template.exercises.map((item, index) => <TemplateExerciseCard key={item.id} item={item} index={index} total={template.exercises.length} onChanged={load} onReorder={(targetIndex) => reorderExercise(item.id, targetIndex)} />)}
      <LiquidButton onPress={() => setPicker(true)}>Add exercise</LiquidButton>
      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onSelect={async (exercise) => { await workoutTemplateRepository.addExercise(template.id, exercise.id); await load(); }} />
    </TrainingScreen>
  );
}

function TemplateExerciseCard({ item, index, total, onChanged, onReorder }: {
  item: TemplateExercise;
  index: number;
  total: number;
  onChanged: () => Promise<void>;
  onReorder: (targetIndex: number) => Promise<void>;
}) {
  const theme = useTheme();
  const { showMessage } = useAppDialog();
  const { height: windowHeight } = useWindowDimensions();
  const scrollBy = useTrainingScroll();
  const [sets, setSets] = useState(item.defaultSetCount === null ? "" : String(item.defaultSetCount));
  const [height, setHeight] = useState(80);
  const [dragging, setDragging] = useState(false);
  const [dragY] = useState(() => new Animated.Value(0));
  const [autoScroller] = useState(() => new EdgeAutoScroller(
    scrollBy,
    (distance) => dragY.setValue(distance),
  ));

  const finishDrag = useCallback((distance: number) => {
    setDragging(false);
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    const offset = Math.round(distance / (height + Spacing.md));
    const targetIndex = Math.max(0, Math.min(index + offset, total - 1));
    if (targetIndex !== index) void onReorder(targetIndex);
  }, [dragY, height, index, onReorder, total]);

  const cancelDrag = useCallback(() => {
    setDragging(false);
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
  }, [dragY]);

  const dragGesture = useMemo(() => Gesture.Pan()
    .enabled(total > 1)
    .activateAfterLongPress(300)
    .shouldCancelWhenOutside(false)
    .runOnJS(true)
    .onStart(() => {
      dragY.stopAnimation();
      dragY.setValue(0);
      autoScroller.begin();
      setDragging(true);
    })
    .onUpdate((event) => {
      const edgeDirection = event.absoluteY < 160
        ? -1
        : event.absoluteY > windowHeight - 160
          ? 1
          : 0;
      autoScroller.update(event.translationY, edgeDirection);
    })
    .onEnd((event) => finishDrag(autoScroller.finish(event.translationY)))
    .onFinalize((_event, success) => {
      if (!success) {
        autoScroller.cancel();
        cancelDrag();
      }
    }), [autoScroller, cancelDrag, dragY, finishDrag, total, windowHeight]);

  useEffect(() => () => autoScroller.cancel(), [autoScroller]);

  const save = async () => {
    if (sets.trim() === "") {
      await workoutTemplateRepository.updateExercise(item.id, null);
      await onChanged();
      return;
    }
    const count = normalizeInteger(sets);
    if (count === null || count < 1) { await showMessage("Invalid set count", "Use at least one set."); return; }
    await workoutTemplateRepository.updateExercise(item.id, count); await onChanged();
  };
  return (
    <Animated.View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[styles.draggableCard, dragging && styles.draggingCard, { transform: [{ translateY: dragY }] }]}
    >
      <LiquidCard style={[styles.exerciseCard, dragging && { borderColor: theme.accent }]}>
        <View style={styles.row}>
          <GestureDetector gesture={dragGesture}>
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`Reorder ${item.exercise.name}`}
              accessibilityHint="Hold and drag, or use accessibility actions to move the exercise"
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "decrement" && index > 0) void onReorder(index - 1);
                if (event.nativeEvent.actionName === "increment" && index < total - 1) void onReorder(index + 1);
              }}
              style={styles.dragHandle}
            >
              <Ionicons name="reorder-three" size={26} color={dragging ? theme.accent : theme.textSecondary} />
            </View>
          </GestureDetector>
          <View style={{ flex: 1 }}><ThemedText type="bodyMedium">{item.exercise.name}</ThemedText><ThemedText type="caption" themeColor="textSecondary">{item.exercise.category}</ThemedText></View>
          <LiquidInput style={styles.setInput} value={sets} onChangeText={setSets} onBlur={() => void save()} keyboardType="number-pad" placeholder="Sets" />
          <Pressable accessibilityLabel="Remove exercise" onPress={() => void workoutTemplateRepository.removeExercise(item.id).then(onChanged)}><Ionicons name="trash-outline" size={22} color={theme.danger} /></Pressable>
        </View>
      </LiquidCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  draggableCard: { zIndex: 0 },
  draggingCard: { elevation: 8, opacity: 0.96, zIndex: 10 },
  dragHandle: { alignItems: "center", height: 44, justifyContent: "center", width: 32 },
  exerciseCard: { gap: Spacing.md },
  setInput: { minHeight: 44, width: 76 },
});
