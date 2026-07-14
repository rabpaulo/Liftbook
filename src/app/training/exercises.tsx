import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAppDialog } from "@/components/AppDialog";
import { CategoryDropdown } from "@/components/CategoryDropdown";
import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { EmptyState, TrainingScreen } from "@/components/TrainingPrimitives";
import { Spacing } from "@/constants/theme";
import { exerciseRepository } from "@/database/repositories/exerciseRepository";
import { useTheme } from "@/hooks/use-theme";
import type { Exercise } from "@/utils/training-types";

export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);

  const load = useCallback(async () => {
    const [nextItems, nextCategories] = await Promise.all([
      exerciseRepository.list({ search, category: category || null, includeArchived: showArchived }),
      exerciseRepository.categories(),
    ]);
    setItems(nextItems);
    setCategories(nextCategories);
  }, [category, search, showArchived]);
  useEffect(() => {
    void Promise.all([
      exerciseRepository.list({ search, category: category || null, includeArchived: showArchived }),
      exerciseRepository.categories(),
    ]).then(([nextItems, nextCategories]) => {
      setItems(nextItems);
      setCategories(nextCategories);
    });
  }, [category, search, showArchived]);

  const hasFilters = Boolean(search.trim() || category);

  return (
    <TrainingScreen>
      <ScreenHeader title="Exercises" subtitle="Library" showBack right={<Pressable accessibilityLabel="Create exercise" onPress={() => setEditing("new")}><Ionicons name="add" size={28} color={theme.accent} /></Pressable>} />
      <LiquidInput value={search} onChangeText={setSearch} placeholder="Search by name" />
      <CategoryDropdown
        value={category}
        onChange={setCategory}
        categories={categories}
        label="Filter category"
        placeholder="All categories"
        allowClear
        allowCreate={false}
      />
      <Pressable onPress={() => setShowArchived((value) => !value)} style={styles.archiveToggle}>
        <Ionicons name={showArchived ? "checkbox" : "square-outline"} size={22} color={theme.accent} />
        <ThemedText type="smallBold">Show archived exercises</ThemedText>
      </Pressable>
      {items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching exercises" : "No exercises"}
          message={hasFilters ? "Try another name or category." : "Create a resistance exercise to begin."}
          action={hasFilters
            ? <LiquidButton variant="secondary" onPress={() => { setSearch(""); setCategory(""); }}>Clear filters</LiquidButton>
            : <LiquidButton variant="primary" onPress={() => setEditing("new")}>Create exercise</LiquidButton>}
        />
      ) : items.map((exercise) => (
        <Pressable key={exercise.id} onPress={() => setEditing(exercise)}>
          <LiquidCard style={[styles.card, exercise.isArchived && { opacity: 0.65 }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{exercise.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{exercise.category}{exercise.isArchived ? " · Archived" : ""}</ThemedText>
                {exercise.notes ? <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{exercise.notes}</ThemedText> : null}
              </View>
              <Ionicons name="create-outline" size={22} color={theme.textSecondary} />
            </View>
          </LiquidCard>
        </Pressable>
      ))}
      {editing ? <ExerciseEditor exercise={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} /> : null}
    </TrainingScreen>
  );
}

function ExerciseEditor({ exercise, categories, onClose, onSaved }: { exercise: Exercise | null; categories: readonly string[]; onClose: () => void; onSaved: () => void }) {
  const theme = useTheme();
  const { showDialog, showMessage } = useAppDialog();
  const [name, setName] = useState(exercise?.name ?? "");
  const [category, setCategory] = useState(exercise?.category ?? "");
  const [notes, setNotes] = useState(exercise?.notes ?? "");
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!name.trim() || !category.trim()) { setError("Name and category are required."); return; }
    const duplicate = await exerciseRepository.findDuplicateName(name, exercise?.id);
    if (duplicate && !warning) { setWarning(`“${duplicate.name}” already exists. Save this variation anyway?`); return; }
    try {
      if (exercise) await exerciseRepository.update(exercise.id, { name, category, notes });
      else await exerciseRepository.create({ name, category, notes });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Exercise could not be saved.");
    }
  };

  const toggleArchive = async () => {
    if (!exercise) return;
    const action = await showDialog({
      title: exercise.isArchived ? "Restore exercise?" : "Archive exercise?",
      message: exercise.isArchived
        ? "It will return to the default exercise picker."
        : "Historical workout snapshots will remain unchanged.",
      icon: exercise.isArchived ? "refresh-outline" : "archive-outline",
      actions: [
        {
          id: "confirm",
          label: exercise.isArchived ? "Restore exercise" : "Archive exercise",
          variant: exercise.isArchived ? "primary" : "destructive",
        },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action !== "confirm") return;
    try {
      await exerciseRepository.setArchived(exercise.id, !exercise.isArchived);
      onSaved();
    } catch (cause) {
      await showMessage("Could not update exercise", cause instanceof Error ? cause.message : "Try again.");
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.modal}>
        <View style={styles.row}><ThemedText type="subtitle" style={{ flex: 1 }}>{exercise ? "Edit exercise" : "New exercise"}</ThemedText><Pressable onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={28} color={theme.text} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <LiquidInput value={name} onChangeText={(value) => { setName(value); setWarning(null); }} placeholder="Exercise name" />
          <CategoryDropdown value={category} onChange={setCategory} categories={categories} />
          <LiquidInput value={notes} onChangeText={setNotes} placeholder="Setup notes or cues" multiline />
          {warning ? <ThemedText type="small" themeColor="warning">{warning}</ThemedText> : null}
          {error ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}
          <LiquidButton variant="primary" onPress={() => void save()}>{warning ? "Save anyway" : "Save exercise"}</LiquidButton>
          {exercise ? <LiquidButton variant={exercise.isArchived ? "secondary" : "destructive"} onPress={() => void toggleArchive()}>{exercise.isArchived ? "Restore exercise" : "Archive exercise"}</LiquidButton> : null}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  archiveToggle: { alignItems: "center", flexDirection: "row", gap: Spacing.two, minHeight: 44 },
  card: { gap: Spacing.one },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  modal: { flex: 1, gap: Spacing.three, padding: Spacing.three, paddingTop: Spacing.four },
  form: { gap: Spacing.three, paddingBottom: Spacing.five },
});
