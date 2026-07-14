import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { LiquidButton } from "@/components/LiquidButton";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { EmptyState, TrainingScreen } from "@/components/TrainingPrimitives";
import { workoutTemplateRepository } from "@/database/repositories/workoutTemplateRepository";
import { useStartTemplateWorkout } from "@/hooks/use-start-template-workout";
import type { WorkoutTemplate } from "@/utils/training-types";
import { useTheme } from "@/hooks/use-theme";

export default function TemplatesScreen() {
  const theme = useTheme();
  const startTemplateWorkout = useStartTemplateWorkout();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => setTemplates(await workoutTemplateRepository.list()), []);
  useEffect(() => { void workoutTemplateRepository.list().then(setTemplates); }, []);

  return (
    <TrainingScreen>
      <ScreenHeader title="Templates" subtitle="Saved workouts" showBack right={<Pressable accessibilityLabel="Create template" onPress={() => setCreating(true)}><Ionicons name="add" size={28} color={theme.accent} /></Pressable>} />
      {templates.length === 0 ? <EmptyState title="No templates" message="Save reusable exercise structures for future workouts." action={<LiquidButton variant="primary" onPress={() => setCreating(true)}>Create template</LiquidButton>} /> : templates.map((template) => (
        <LiquidCard key={template.id} style={styles.card}>
          <Pressable style={styles.row} onPress={() => router.push({ pathname: "/training/template/[id]", params: { id: template.id } })}>
            <View style={{ flex: 1 }}><ThemedText type="smallBold">{template.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{template.notes || "No template notes"}</ThemedText></View>
            <Ionicons name="chevron-forward" size={21} color={theme.textSecondary} />
          </Pressable>
          <LiquidButton variant="primary" onPress={() => void startTemplateWorkout(template.id)}>Start workout</LiquidButton>
        </LiquidCard>
      ))}
      {creating ? <CreateTemplateModal onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); void load(); router.push({ pathname: "/training/template/[id]", params: { id } }); }} /> : null}
    </TrainingScreen>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}><ThemedView style={[styles.dialog, { borderColor: theme.divider }]}>
        <ThemedText type="subtitle">New template</ThemedText>
        <LiquidInput autoFocus value={name} onChangeText={setName} placeholder="Template name" />
        <LiquidInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
        {error ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}
        <LiquidButton variant="primary" onPress={() => void workoutTemplateRepository.create(name, notes).then((value) => onCreated(value.id)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not create template."))}>Create</LiquidButton>
        <LiquidButton variant="ghost" onPress={onClose}>Cancel</LiquidButton>
      </ThemedView></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.two, minHeight: 48 },
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", flex: 1, justifyContent: "center", padding: Spacing.three },
  dialog: { borderRadius: 22, borderWidth: 1, gap: Spacing.three, maxWidth: 520, padding: Spacing.three, width: "100%" },
});
