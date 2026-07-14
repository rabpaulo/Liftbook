import { useCallback, useMemo, useState, type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { EmptyState, TrainingScreen } from "@/components/TrainingPrimitives";
import { workoutSessionRepository } from "@/database/repositories/workoutSessionRepository";
import type { WorkoutHistoryItem } from "@/utils/training-types";
import { formatWorkoutDate } from "@/utils/training-format";
import { useTheme } from "@/hooks/use-theme";

export default function HistoryScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setItems(await workoutSessionRepository.listHistory(search)); setLoading(false); }, [search]);
  useFocusEffect(useCallback(() => {
    const timer = setTimeout(() => void load(), 180);
    return () => clearTimeout(timer);
  }, [load]));

  const groups = useMemo(() => {
    const result = new Map<string, WorkoutHistoryItem[]>();
    for (const item of items) {
      const key = new Date(item.startedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      result.set(key, [...(result.get(key) ?? []), item]);
    }
    return [...result.entries()];
  }, [items]);

  return (
    <TrainingScreen>
      <ScreenHeader title="History" subtitle="Workouts" showBack />
      <LiquidInput value={search} onChangeText={setSearch} placeholder="Search workouts or exercises" />
      {loading ? <ThemedText themeColor="textSecondary">Loading history…</ThemedText> : groups.length === 0 ? <EmptyState title="No workouts found" message="Log a set or try another search." /> : groups.map(([month, workouts]) => (
        <View key={month} style={styles.group}>
          <ThemedText type="subtitle">{month}</ThemedText>
          {workouts.map((workout) => (
            <Pressable
              accessibilityLabel={`${workout.name}, ${formatWorkoutDate(workout.startedAt)}, ${workout.exerciseCount} exercises, ${workout.completedSetCount} logged sets`}
              accessibilityRole="button"
              key={workout.id}
              onPress={() => router.push({ pathname: "/training/workout/[id]", params: { id: workout.id } })}
            >
              <LiquidCard style={styles.card}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={styles.name}>{workout.name}</ThemedText>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.details}>
                  <HistoryDetail icon="calendar-outline" label={formatWorkoutDate(workout.startedAt)} />
                  <HistoryDetail icon="barbell-outline" label={`${workout.exerciseCount} exercises`} />
                  <HistoryDetail icon="checkmark-circle-outline" label={`${workout.completedSetCount} logged sets`} />
                </View>
              </LiquidCard>
            </Pressable>
          ))}
        </View>
      ))}
    </TrainingScreen>
  );
}

function HistoryDetail({ icon, label }: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={17} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two, marginTop: Spacing.two },
  card: { gap: Spacing.two },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  name: { flex: 1, minWidth: 0 },
  details: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  detail: { alignItems: "center", flexDirection: "row", gap: Spacing.one },
});
