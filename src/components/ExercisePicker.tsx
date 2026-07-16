import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LiquidButton } from "@/components/LiquidButton";
import { CategoryDropdown } from "@/components/CategoryDropdown";
import { LiquidInput } from "@/components/LiquidInput";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { exerciseRepository } from "@/database/repositories/exerciseRepository";
import type { Exercise } from "@/utils/training-types";
import { useTheme } from "@/hooks/use-theme";

export function ExercisePicker({ visible, onClose, onSelect }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => Promise<void> | void;
}) {
  const theme = useTheme();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void exerciseRepository.list({ search, category }).then(setExercises);
  }, [category, search, visible]);

  useEffect(() => {
    if (!visible) return;
    void exerciseRepository.categories().then(setCategories);
  }, [visible]);

  const create = async () => {
    setError(null);
    if (!name.trim() || !newCategory.trim()) {
      setError("Name and category are required.");
      return;
    }
    const duplicate = await exerciseRepository.findDuplicateName(name);
    if (duplicate && !duplicateWarning) {
      setDuplicateWarning(`“${duplicate.name}” already exists. Create this variation anyway?`);
      return;
    }
    try {
      const exercise = await exerciseRepository.create({ name, category: newCategory, notes });
      await onSelect(exercise);
      setName(""); setNewCategory(""); setNotes(""); setCreating(false); setDuplicateWarning(null);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Exercise could not be created.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={["top", "right", "bottom", "left"]} style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ThemedView style={styles.modal}>
            <View style={styles.content}>
              <View style={styles.header}>
                <ThemedText type="section">Add exercise</ThemedText>
                <Pressable accessibilityRole="button" accessibilityLabel="Close exercise picker" onPress={onClose} style={styles.iconButton}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </Pressable>
              </View>
              {creating ? (
                <ScrollView
                  style={styles.formScroll}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.form}
                >
                  <LiquidInput value={name} onChangeText={(value) => { setName(value); setDuplicateWarning(null); }} placeholder="Exercise name" />
                  <CategoryDropdown value={newCategory} onChange={setNewCategory} categories={categories} />
                  <LiquidInput value={notes} onChangeText={setNotes} placeholder="Setup notes or cues (optional)" multiline />
                  {duplicateWarning ? <ThemedText type="caption" themeColor="warning">{duplicateWarning}</ThemedText> : null}
                  {error ? <ThemedText type="caption" themeColor="danger">{error}</ThemedText> : null}
                  <LiquidButton style={styles.fullWidthButton} variant="primary" onPress={() => void create()}>{duplicateWarning ? "Create anyway" : "Create and add"}</LiquidButton>
                  <LiquidButton style={styles.fullWidthButton} variant="ghost" onPress={() => { setCreating(false); setDuplicateWarning(null); setError(null); }}>Back to library</LiquidButton>
                </ScrollView>
              ) : (
                <>
                  <LiquidInput value={search} onChangeText={setSearch} placeholder="Search exercises" />
                  <CategoryDropdown
                    value={category ?? ""}
                    onChange={(value) => setCategory(value || null)}
                    categories={categories}
                    label="Filter category"
                    placeholder="All categories"
                    allowClear
                    allowCreate={false}
                  />
                  <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
                    {exercises.map((exercise) => (
                      <Pressable
                        key={exercise.id}
                        onPress={() => void Promise.resolve(onSelect(exercise)).then(onClose).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Exercise could not be added."))}
                        style={[styles.exercise, { borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}
                      >
                        <View style={styles.exerciseText}>
                          <ThemedText type="bodyMedium">{exercise.name}</ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">{exercise.category}</ThemedText>
                          {exercise.notes ? <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>{exercise.notes}</ThemedText> : null}
                        </View>
                        <Ionicons name="add-circle-outline" size={24} color={theme.accent} />
                      </Pressable>
                    ))}
                    {error ? <ThemedText type="caption" themeColor="danger" style={{ textAlign: "center" }}>{error}</ThemedText> : null}
                    {exercises.length === 0 ? <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: "center" }}>No matching exercises.</ThemedText> : null}
                  </ScrollView>
                  <View style={styles.footer}>
                    <LiquidButton style={styles.fullWidthButton} variant="primary" onPress={() => setCreating(true)}>Create custom exercise</LiquidButton>
                  </View>
                </>
              )}
            </View>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  modal: { alignItems: "center", flex: 1, padding: Spacing.md },
  content: { flex: 1, gap: Spacing.md, maxWidth: MaxContentWidth, minWidth: 0, width: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  list: { flex: 1, minHeight: 0, width: "100%" },
  listContent: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  exercise: { alignItems: "center", borderRadius: Radius.lg, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, minHeight: 72, padding: Spacing.md },
  exerciseText: { flex: 1, minWidth: 0 },
  footer: { flexShrink: 0, maxWidth: "100%", width: "100%" },
  fullWidthButton: { alignSelf: "stretch", flexShrink: 1, maxWidth: "100%", width: "100%" },
  formScroll: { flex: 1, minHeight: 0, width: "100%" },
  form: { gap: Spacing.md, paddingBottom: Spacing.sm },
});
