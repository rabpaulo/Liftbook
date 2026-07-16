import { useState, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { WorkoutSet } from "@/utils/training-types";

export function WorkoutSetTabs({
  sets,
  renderSet,
}: {
  sets: WorkoutSet[];
  renderSet: (set: WorkoutSet, index: number, tabbed: boolean) => ReactNode;
}) {
  const theme = useTheme();
  const [selection, setSelection] = useState<{ selectedId: string | null; setIds: string[] }>(() => ({
    selectedId: sets[0]?.id ?? null,
    setIds: sets.map((set) => set.id),
  }));
  const currentIds = sets.map((set) => set.id);
  const idsChanged = selection.setIds.length !== currentIds.length
    || selection.setIds.some((id, index) => id !== currentIds[index]);

  if (idsChanged) {
    const addedId = currentIds.find((id) => !selection.setIds.includes(id));
    let nextSelectedId: string | null = selection.selectedId;

    if (addedId) nextSelectedId = addedId;
    else if (!nextSelectedId || !currentIds.includes(nextSelectedId)) {
      const deletedIndex = nextSelectedId ? selection.setIds.indexOf(nextSelectedId) : 0;
      nextSelectedId = currentIds.length === 0
        ? null
        : currentIds[Math.min(Math.max(deletedIndex, 0), currentIds.length - 1)];
    }

    setSelection({ selectedId: nextSelectedId, setIds: currentIds });
  }

  if (sets.length === 0) return null;
  if (sets.length === 1) return <>{renderSet(sets[0], 0, false)}</>;

  const previousSelectedIndex = selection.selectedId
    ? selection.setIds.indexOf(selection.selectedId)
    : 0;
  const fallbackIndex = Math.min(Math.max(previousSelectedIndex, 0), sets.length - 1);
  const effectiveSelectedId = sets.some((set) => set.id === selection.selectedId)
    ? selection.selectedId
    : sets[fallbackIndex].id;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.tabList, { borderBottomColor: theme.divider }]}
      >
        {sets.map((set, index) => {
          const selected = set.id === effectiveSelectedId;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={`Set ${index + 1}`}
              accessibilityState={{ selected }}
              key={set.id}
              onPress={() => {
                Keyboard.dismiss();
                setSelection((current) => ({ ...current, selectedId: set.id }));
              }}
              style={({ pressed }) => [
                styles.tab,
                { borderBottomColor: selected ? theme.accent : "transparent" },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText
                type="label"
                style={{ color: selected ? theme.text : theme.textSecondary }}
              >
                Set {index + 1}
              </ThemedText>
              {set.isCompleted ? (
                <Ionicons
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  name="checkmark-circle"
                  size={16}
                  color={theme.success}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {sets.map((set, index) => {
        const selected = set.id === effectiveSelectedId;
        return (
          <View
            accessibilityElementsHidden={!selected}
            importantForAccessibility={selected ? "auto" : "no-hide-descendants"}
            key={set.id}
            style={!selected && styles.hidden}
          >
            {renderSet(set, index, true)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  tabList: { borderBottomWidth: 1, flexGrow: 1 },
  tab: {
    alignItems: "center",
    borderBottomWidth: 2,
    borderRadius: Radius.sm,
    flexGrow: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 84,
    paddingHorizontal: Spacing.md,
  },
  hidden: { display: "none" },
});
