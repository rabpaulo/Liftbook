import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);

  const load = useCallback(async () => {
    const [nextItems, nextCategories] = await Promise.all([
      exerciseRepository.list({ search, category: category || null }),
      exerciseRepository.categories(),
    ]);
    setItems(nextItems);
    setCategories(nextCategories);
  }, [category, search]);
  useEffect(() => {
    void Promise.all([
      exerciseRepository.list({ search, category: category || null }),
      exerciseRepository.categories(),
    ]).then(([nextItems, nextCategories]) => {
      setItems(nextItems);
      setCategories(nextCategories);
    });
  }, [category, search]);

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
      <ThemedText type="caption" themeColor="textSecondary">{items.length} exercise{items.length === 1 ? "" : "s"}</ThemedText>
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
          <LiquidCard style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText type="bodyMedium">{exercise.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">{exercise.category}</ThemedText>
                {exercise.notes ? <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>{exercise.notes}</ThemedText> : null}
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

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.modal}>
        <View style={styles.row}><ThemedText type="title" style={{ flex: 1 }}>{exercise ? "Edit exercise" : "New exercise"}</ThemedText><Pressable onPress={onClose} accessibilityLabel="Close"><Ionicons name="close" size={28} color={theme.text} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <LiquidInput value={name} onChangeText={(value) => { setName(value); setWarning(null); }} placeholder="Exercise name" />
          <CategoryDropdown value={category} onChange={setCategory} categories={categories} />
          <LiquidInput value={notes} onChangeText={setNotes} placeholder="Setup notes or cues" multiline />
          {warning ? <ThemedText type="caption" themeColor="warning">{warning}</ThemedText> : null}
          {error ? <ThemedText type="caption" themeColor="danger">{error}</ThemedText> : null}
          <LiquidButton variant="primary" onPress={() => void save()}>{warning ? "Save anyway" : "Save exercise"}</LiquidButton>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.xs },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  modal: { flex: 1, gap: Spacing.md, padding: Spacing.md, paddingTop: Spacing.lg },
  form: { gap: Spacing.md, paddingBottom: Spacing.xl },
});
