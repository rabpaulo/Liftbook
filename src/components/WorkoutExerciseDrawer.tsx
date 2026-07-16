import { Ionicons } from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Animated, BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LiquidButton } from "@/components/LiquidButton";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { EdgeAutoScroller } from "@/utils/edge-auto-scroller";
import type { SessionExercise } from "@/utils/training-types";

export function WorkoutExerciseDrawer({
  exercises,
  selectedExerciseId,
  visible,
  onAddExercise,
  onClose,
  onReorder,
  onSelect,
}: {
  exercises: readonly SessionExercise[];
  selectedExerciseId: string | null;
  visible: boolean;
  onAddExercise: () => void;
  onClose: () => void;
  onReorder: (exerciseId: string, targetIndex: number) => void;
  onSelect: (exerciseId: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(windowWidth * 0.88, 390);
  const [translateX] = useState(() => new Animated.Value(-drawerWidth));
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  const dismiss = useCallback(() => {
    Animated.timing(translateX, {
      duration: 170,
      toValue: -drawerWidth,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [drawerWidth, onClose, translateX]);

  useEffect(() => {
    if (!visible) return;
    translateX.setValue(-drawerWidth);
    Animated.spring(translateX, {
      damping: 24,
      mass: 0.8,
      stiffness: 240,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [drawerWidth, translateX, visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [dismiss, visible]);

  const scrollBy = useCallback((distance: number) => {
    const maximum = Math.max(0, contentHeight.current - viewportHeight.current);
    const nextOffset = Math.max(0, Math.min(scrollOffset.current + distance, maximum));
    const appliedDistance = nextOffset - scrollOffset.current;
    if (appliedDistance === 0) return 0;
    scrollOffset.current = nextOffset;
    scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
    return appliedDistance;
  }, []);

  if (!visible) return null;

  return (
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Close exercise list"
          accessibilityRole="button"
          onPress={() => dismiss()}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.animatedDrawer,
            { transform: [{ translateX }], width: drawerWidth },
          ]}
        >
          <ThemedView
            accessibilityViewIsModal
            style={[
              styles.drawer,
              {
                borderColor: theme.divider,
                paddingBottom: insets.bottom + Spacing.md,
                paddingTop: insets.top + Spacing.md,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <ThemedText type="section">Exercises</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"} · Hold and drag to reorder
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Close exercise list"
                accessibilityRole="button"
                onPress={() => dismiss()}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={(_width, height) => { contentHeight.current = height; }}
              onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
              onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              {exercises.map((exercise, index) => (
                <DraggableExerciseRow
                  exercise={exercise}
                  index={index}
                  key={exercise.id}
                  onMove={(targetIndex) => onReorder(exercise.id, targetIndex)}
                  onSelect={() => {
                    onSelect(exercise.id);
                    dismiss();
                  }}
                  scrollBy={scrollBy}
                  selected={exercise.id === selectedExerciseId}
                  total={exercises.length}
                  windowHeight={windowHeight}
                />
              ))}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.divider }]}>
              <LiquidButton
                accessibilityLabel="Add exercise"
                onPress={onAddExercise}
                variant="primary"
              >
                Add exercise
              </LiquidButton>
            </View>
          </ThemedView>
        </Animated.View>
      </View>
  );
}

function DraggableExerciseRow({
  exercise,
  index,
  onMove,
  onSelect,
  scrollBy,
  selected,
  total,
  windowHeight,
}: {
  exercise: SessionExercise;
  index: number;
  onMove: (targetIndex: number) => void;
  onSelect: () => void;
  scrollBy: (distance: number) => number;
  selected: boolean;
  total: number;
  windowHeight: number;
}) {
  const theme = useTheme();
  const [height, setHeight] = useState(72);
  const [dragging, setDragging] = useState(false);
  const [dragY] = useState(() => new Animated.Value(0));
  const [autoScroller] = useState(() => new EdgeAutoScroller(
    scrollBy,
    (distance) => dragY.setValue(distance),
  ));

  const finishDrag = useCallback((distance: number) => {
    setDragging(false);
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    const targetIndex = index + Math.round(distance / (height + Spacing.sm));
    if (targetIndex !== index) onMove(targetIndex);
  }, [dragY, height, index, onMove]);

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
      const edgeDirection = event.absoluteY < 120
        ? -1
        : event.absoluteY > windowHeight - 120
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

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        style={[
          styles.rowWrapper,
          dragging && styles.draggingRow,
          { transform: [{ translateY: dragY }] },
        ]}
      >
        <Pressable
          accessibilityActions={[
            { name: "decrement", label: "Move up" },
            { name: "increment", label: "Move down" },
          ]}
          accessibilityHint="Tap to view sets. Hold and drag to reorder."
          accessibilityLabel={`${exercise.exerciseName}, ${exercise.sets.length} ${exercise.sets.length === 1 ? "set" : "sets"}`}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "decrement" && index > 0) onMove(index - 1);
            if (event.nativeEvent.actionName === "increment" && index < total - 1) onMove(index + 1);
          }}
          onPress={onSelect}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
              borderColor: dragging || selected ? theme.accent : theme.divider,
            },
            pressed && styles.pressedRow,
          ]}
        >
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={25} color={dragging ? theme.accent : theme.textSecondary} />
          </View>
          <View style={styles.rowCopy}>
            <ThemedText type="bodyMedium" numberOfLines={1}>{exercise.exerciseName}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {exercise.sets.length} {exercise.sets.length === 1 ? "set" : "sets"}
            </ThemedText>
          </View>
          {selected ? <Ionicons name="checkmark-circle" size={21} color={theme.accent} /> : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.52)",
    bottom: 0,
    elevation: 24,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 80,
  },
  animatedDrawer: { bottom: 0, left: 0, position: "absolute", top: 0 },
  drawer: { borderRightWidth: 1, flex: 1, gap: Spacing.md, paddingHorizontal: Spacing.md },
  header: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  headerCopy: { flex: 1, gap: Spacing.xs, minWidth: 0 },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  scroll: { flex: 1, minHeight: 0 },
  list: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  footer: { borderTopWidth: 1, paddingTop: Spacing.md },
  rowWrapper: { zIndex: 0 },
  draggingRow: { elevation: 8, opacity: 0.97, zIndex: 20 },
  row: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  pressedRow: { opacity: 0.78 },
  dragHandle: { alignItems: "center", height: 48, justifyContent: "center", width: 38 },
  rowCopy: { flex: 1, minWidth: 0 },
});
