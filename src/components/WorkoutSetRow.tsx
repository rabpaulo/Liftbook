import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { useAppDialog, type AppDialogAction } from "@/components/AppDialog";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/theme";
import { SegmentedControl } from "@/components/TrainingPrimitives";
import type { WorkoutSetUpdate } from "@/database/repositories/workoutSetRepository";
import { videoService } from "@/utils/video-service";
import type { RirValue, SetPersonalRecord, WorkoutSet } from "@/utils/training-types";
import { formatRir, normalizeDecimal, normalizeInteger } from "@/utils/training-format";
import { useTheme } from "@/hooks/use-theme";
import type { WeightUnit } from "@/hooks/use-bodyweight";
import { showToast } from "@/utils/toast";
import { formatWeight, fromKilograms, toKilograms } from "@/utils/weight-units";

export function WorkoutSetRow({ set, personalRecord, previous, onUpdate, onDelete, unit = "kg", readOnly = false, showPosition = true }: {
  set: WorkoutSet;
  personalRecord?: SetPersonalRecord;
  previous?: string;
  onUpdate?: (patch: WorkoutSetUpdate) => Promise<WorkoutSet>;
  onDelete?: () => Promise<void>;
  unit?: WeightUnit;
  readOnly?: boolean;
  showPosition?: boolean;
}) {
  const theme = useTheme();
  const { showDialog, showMessage } = useAppDialog();
  const [weight, setWeight] = useState(set.weight === null ? "" : fromKilograms(set.weight, unit).toFixed(1).replace(/\.0$/, ""));
  const [repetitions, setRepetitions] = useState(set.repetitions?.toString() ?? "");
  const [comment, setComment] = useState(set.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (patch: WorkoutSetUpdate) => {
    if (!onUpdate || saving) return set;
    setSaving(true);
    try {
      const updated = await onUpdate(patch);
      setError(null);
      return updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Set could not be saved.");
      setWeight(set.weight === null ? "" : fromKilograms(set.weight, unit).toFixed(1).replace(/\.0$/, ""));
      setRepetitions(set.repetitions?.toString() ?? "");
      setComment(set.comment ?? "");
      return set;
    } finally {
      setSaving(false);
    }
  };

  const persistWeight = () => {
    const value = weight;
    const parsed = normalizeDecimal(value);
    if (value.trim() && parsed === null) { setError("Enter a valid non-negative number."); return; }
    void save({ weight: parsed === null ? null : toKilograms(parsed, unit) });
  };

  const persistRepetitions = () => {
    const parsed = normalizeInteger(repetitions);
    if (repetitions.trim() && parsed === null) { setError("Repetitions must be a non-negative integer."); return; }
    if (parsed === 0) {
      setRepetitions(set.repetitions?.toString() ?? "");
      setError(null);
      showToast("Set not saved", "A set must have at least 1 repetition.", theme, "error");
      return;
    }
    void save({ repetitions: parsed });
  };

  const persistComment = () => {
    const normalized = comment.trim() || null;
    if (normalized === set.comment) {
      setComment(normalized ?? "");
      return;
    }
    void save({ comment: normalized }).then((updated) => setComment(updated.comment ?? ""));
  };

  const attach = (method: "library" | "camera") => {
    void (async () => {
      try {
        const uri = method === "library" ? await videoService.pickFromLibrary() : await videoService.record();
        if (!uri) return;
        const previousUri = set.videoUri;
        const updated = await save({ videoUri: uri });
        if (updated.videoUri === uri && previousUri) await videoService.remove(previousUri);
        if (updated.videoUri !== uri) await videoService.remove(uri);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Video could not be attached.");
      }
    })();
  };

  const videoMenu = async () => {
    if (readOnly) {
      if (!set.videoUri) return;
      if (videoService.exists(set.videoUri)) setPreviewUri(set.videoUri);
      else await showMessage("Video unavailable", "The attached local video file is missing.", "videocam-off-outline");
      return;
    }
    const actions: AppDialogAction[] = [
      { id: "library", label: "Choose from library", variant: "primary" },
      { id: "camera", label: "Record video" },
    ];
    if (set.videoUri) {
      actions.unshift({ id: "view", label: "View attached video", variant: "primary" });
      actions.push({ id: "remove", label: "Remove video", variant: "destructive" });
    }
    actions.push({ id: "cancel", label: "Cancel", variant: "ghost" });
    const action = await showDialog({
      title: "Set video",
      message: set.videoUri ? "View or replace the attached video." : "Attach a video to this set.",
      icon: "videocam-outline",
      actions,
    });
    if (action === "library") attach("library");
    if (action === "camera") attach("camera");
    if (action === "view") {
      if (videoService.exists(set.videoUri)) setPreviewUri(set.videoUri);
      else setError("The attached video file is missing.");
    }
    if (action === "remove") {
      const updated = await save({ videoUri: null });
      if (updated.videoUri === null) await videoService.remove(set.videoUri);
    }
  };

  const deleteSet = async () => {
    const action = await showDialog({
      title: "Delete set?",
      message: "This set and its attached video will be permanently deleted.",
      icon: "trash-outline",
      actions: [
        { id: "delete", label: "Delete set", variant: "destructive" },
        { id: "cancel", label: "Cancel", variant: "ghost" },
      ],
    });
    if (action === "delete") {
      try {
        await onDelete?.();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Set could not be deleted.");
      }
    }
  };

  if (readOnly) {
    return (
      <View style={[styles.readOnly, { borderColor: theme.divider }]}>
        <View style={styles.readOnlySummary}>
          {showPosition ? <ThemedText type="label">{set.position + 1}</ThemedText> : null}
          <ThemedText type="numeric" style={styles.readOnlyValue}>
            {`${set.weight === null ? "—" : formatWeight(set.weight, unit)} × ${set.repetitions ?? "—"}${set.rir === null ? "" : ` @ ${formatRir(set.rir)} RIR`}`}
          </ThemedText>
          <PersonalRecordBadge personalRecord={personalRecord} />
          {set.videoUri ? <Pressable accessibilityLabel="View attached video" onPress={() => void videoMenu()}><Ionicons name="videocam-outline" size={22} color={theme.accent} /></Pressable> : null}
        </View>
        {set.comment ? (
          <View style={styles.savedComment}>
            <Ionicons name="chatbox-outline" size={17} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flexText}>{set.comment}</ThemedText>
          </View>
        ) : null}
        {previewUri ? <VideoModal uri={previewUri} onClose={() => setPreviewUri(null)} /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: set.isCompleted ? theme.success : theme.divider, backgroundColor: set.isCompleted ? theme.successSoft : theme.backgroundElement }]}>
      <View style={styles.topRow}>
        {showPosition ? <View style={[styles.number, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="label">{set.position + 1}</ThemedText></View> : null}
        {previous ? <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.flexText}>Prev: {previous}</ThemedText> : <View style={styles.flexText} />}
        <IconButton label={set.videoUri ? "Manage attached video" : "Attach video"} icon={set.videoUri ? "videocam" : "videocam-outline"} onPress={() => void videoMenu()} />
        <IconButton label="Delete set" icon="trash-outline" onPress={() => void deleteSet()} />
      </View>

      <View style={styles.fields}>
        <NumberField
          label={unit.toUpperCase()}
          personalRecordLabel={personalRecord?.weight ? "New weight personal record" : undefined}
          value={weight}
          onChangeText={setWeight}
          onBlur={persistWeight}
        />
        <NumberField
          keyboardType="number-pad"
          label="REPS"
          personalRecordLabel={personalRecord?.repetitions ? "New repetitions personal record" : undefined}
          value={repetitions}
          onChangeText={setRepetitions}
          onBlur={persistRepetitions}
        />
        <View style={styles.rir}>
          <ThemedText type="caption" themeColor="textSecondary">RIR</ThemedText>
          <SegmentedControl<RirValue>
            label="Repetitions in reserve"
            value={set.rir}
            onChange={(rir) => void save({ rir })}
            options={[{ value: null, label: "?" }, { value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2+" }]}
          />
        </View>
      </View>
      <View style={styles.commentField}>
        <ThemedText type="caption" themeColor="textSecondary">COMMENT</ThemedText>
        <TextInput
          accessibilityLabel="Set comment"
          multiline
          onBlur={persistComment}
          onChangeText={setComment}
          placeholder="Add a comment about this set"
          placeholderTextColor={theme.textMuted}
          textAlignVertical="top"
          value={comment}
          style={[styles.commentInput, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.surfaceSoft }]}
        />
      </View>
      {error ? <ThemedText type="caption" themeColor="danger">{error}</ThemedText> : null}
      {previewUri ? <VideoModal uri={previewUri} onClose={() => setPreviewUri(null)} /> : null}
    </View>
  );
}

function NumberField({ label, personalRecordLabel, ...props }: React.ComponentProps<typeof TextInput> & {
  label: string;
  personalRecordLabel?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
        {personalRecordLabel ? (
          <View accessible accessibilityLabel={personalRecordLabel} accessibilityRole="image">
            <Ionicons name="trophy" size={16} color={theme.accent} />
          </View>
        ) : null}
      </View>
      <TextInput
        {...props}
        keyboardType={props.keyboardType ?? "decimal-pad"}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { color: theme.text, borderColor: theme.divider, backgroundColor: theme.surfaceSoft }]}
      />
    </View>
  );
}

function IconButton({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.icon}><Ionicons name={icon} size={21} color={theme.textSecondary} /></Pressable>;
}

function PersonalRecordBadge({ personalRecord }: { personalRecord?: SetPersonalRecord }) {
  const theme = useTheme();
  if (!personalRecord?.weight && !personalRecord?.repetitions) return null;
  const label = personalRecord.weight && personalRecord.repetitions
    ? "New weight and repetitions personal records"
    : personalRecord.weight
      ? "New weight personal record"
      : "New repetitions personal record";
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[styles.personalRecord, { backgroundColor: theme.backgroundSelected }]}
    >
      <Ionicons name="trophy" size={19} color={theme.accent} />
    </View>
  );
}

function VideoModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (instance) => instance.play());
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.videoModal}>
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
        <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={onClose} style={styles.closeVideo}><Ionicons name="close" color="#FFFFFF" size={28} /></Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.md, padding: Spacing.md },
  topRow: { alignItems: "center", flexDirection: "row", gap: Spacing.xs },
  number: { alignItems: "center", borderRadius: Radius.sm, height: 34, justifyContent: "center", width: 34 },
  icon: { alignItems: "center", height: 44, justifyContent: "center", width: 38 },
  personalRecord: { alignItems: "center", borderRadius: Radius.pill, height: 34, justifyContent: "center", width: 34 },
  fields: { alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  field: { flexGrow: 1, gap: Spacing.xs, minWidth: 86 },
  fieldLabel: { alignItems: "center", flexDirection: "row", gap: Spacing.xs },
  input: {
    ...Typography.numeric,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 48,
    minWidth: 80,
    paddingHorizontal: Spacing.sm,
    textAlign: "center",
  },
  rir: { gap: Spacing.xs },
  commentField: { gap: Spacing.xs },
  commentInput: {
    ...Typography.body,
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 72,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  readOnly: { borderBottomWidth: 1, gap: Spacing.xs, minHeight: 44, paddingVertical: Spacing.sm },
  readOnlySummary: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  savedComment: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.xs, paddingLeft: Spacing.md },
  flexText: { flex: 1 },
  readOnlyValue: { flex: 1 },
  videoModal: { backgroundColor: "#000000", flex: 1, justifyContent: "center" },
  video: { height: "75%", width: "100%" },
  closeVideo: { alignItems: "center", justifyContent: "center", position: "absolute", right: 16, top: 48, height: 48, width: 48 },
});
