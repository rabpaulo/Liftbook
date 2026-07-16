import * as ImagePicker from "expo-image-picker";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiquidButton } from "@/components/LiquidButton";
import { useAppDialog, type AppDialogAction } from "@/components/AppDialog";
import { LiquidCard } from "@/components/LiquidCard";
import { LiquidInput } from "@/components/LiquidInput";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing, Typography } from "@/constants/theme";
import {
  BodyweightGoal,
  BodyweightLog,
  getBodyweightTrendStatus,
  TrendStatus,
  useBodyweight,
} from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { getBodyweightPhasePlannedEnd } from "@/utils/bodyweight-phases";
import { showToast } from "@/utils/toast";
import { formatWeight, fromKilograms, toKilograms } from "@/utils/weight-units";

function parseBodyweightDate(dateString: string) {
  const [day = 0, month = 0, year = 0] = dateString.split("/").map(Number);
  return new Date(2000 + year, month - 1, day).getTime();
}

function formatBodyweightDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function BodyweightScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { showDialog } = useAppDialog();

  const [number, onChangeNumber] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [savingWeight, setSavingWeight] = useState(false);

  const {
    weeklyData,
    settings,
    goalSettings,
    activePhase,
    bodyweightGoal,
    bodyweightTrend,
    trendStatus,
    addLog,
    removeLog,
    updateLog,
    updateLogImage,
    checkEntryToday,
  } = useBodyweight();

  const todayLabel = formatBodyweightDate(new Date());

  const handleSave = async () => {
    if (!number || number.trim() === "") {
      showToast("Error", "You can't log an empty weight.", theme, "error");
      return;
    }
    const weightNumber = parseFloat(number.replace(",", "."));
    if (isNaN(weightNumber) || weightNumber <= 0) {
      showToast("Error", "You are trying to log an invalid number.", theme, "error");
      return;
    }
    if (savingWeight) return;
    setSavingWeight(true);
    try {
      if (editingId !== null) {
        const success = await updateLog(editingId, toKilograms(weightNumber, settings.weightUnit));
        if (success) {
          showToast("Success", "Your weight log has been updated.", theme, "success");
          setEditingId(null);
          onChangeNumber("");
        } else {
          showToast("Error", "Your weight log could not be updated.", theme, "error");
        }
      } else {
        const logDate = formatBodyweightDate(new Date());
        const alreadyLogged = await checkEntryToday(logDate);
        if (alreadyLogged) {
          showToast("Error", "You have already registered your weight today.", theme, "error");
          return;
        }

        const success = await addLog(
          logDate,
          toKilograms(weightNumber, settings.weightUnit),
          selectedImageUri,
        );
        if (success) {
          showToast("Success", "Your weight log has been added.", theme, "success");
          onChangeNumber("");
          setSelectedImageUri(null);
        } else {
          showToast("Error", "Your weight log could not be saved.", theme, "error");
        }
      }
    } catch (error) {
      console.error("Error logging bodyweight:", error);
      showToast("Error", "Your weight log could not be saved.", theme, "error");
    } finally {
      setSavingWeight(false);
    }
  };

  const pickBodyweightPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Error", "Photo permission is required.", theme, "error");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    return result.assets[0].uri;
  };

  const selectPhotoForNewLog = async () => {
    const uri = await pickBodyweightPhoto();
    if (uri) setSelectedImageUri(uri);
  };

  const attachPhotoToLog = async (log: BodyweightLog) => {
    const uri = await pickBodyweightPhoto();
    if (!uri) return;
    const success = await updateLogImage(log.id, uri);
    showToast(
      success ? "Success" : "Error",
      success ? "Photo attached to bodyweight log." : "Photo could not be attached.",
      theme,
      success ? "success" : "error",
    );
  };

  const toggleWeek = (id: string) => {
    setExpandedWeeks((prev) =>
      prev.includes(id)
        ? prev.filter((weekId) => weekId !== id)
        : [...prev, id],
    );
  };

  const handleLongPressLog = async (log: BodyweightLog) => {
    const actions: AppDialogAction[] = [];
    if (log.image_uri) actions.push({ id: "photo", label: "Open photo", variant: "primary" });
    actions.push(
      { id: "attach", label: log.image_uri ? "Change photo" : "Add photo" },
      { id: "edit", label: "Edit entry" },
      { id: "delete", label: "Delete entry", variant: "destructive" },
      { id: "cancel", label: "Cancel", variant: "ghost" },
    );
    const action = await showDialog({
      title: "Bodyweight entry",
      message: `${formatWeight(log.weight, settings.weightUnit)} on ${log.date}`,
      icon: "scale-outline",
      actions,
    });
    if (action === "photo") setPreviewImageUri(log.image_uri ?? null);
    if (action === "attach") await attachPhotoToLog(log);
    if (action === "edit") {
      setEditingId(log.id);
      onChangeNumber(fromKilograms(log.weight, settings.weightUnit).toFixed(1));
    }
    if (action === "delete") await removeLog(log.id);
  };

  const getStatusColors = (status: TrendStatus) => {
    if (status === "success") return { color: theme.success, backgroundColor: theme.successSoft };
    if (status === "danger") return { color: theme.danger, backgroundColor: theme.dangerSoft };
    return { color: theme.textSecondary, backgroundColor: theme.backgroundSelected };
  };

  const formatSignedWeight = (value: number | null) => {
    if (value === null) return `-- ${settings.weightUnit}/week`;
    const sign = value > 0 ? "+" : "";
    return `${sign}${fromKilograms(value, settings.weightUnit).toFixed(2)} ${settings.weightUnit}/week`;
  };

  const goalCopy = {
    lose: "Lose weight",
    maintain: "Maintain",
    gain: "Gain weight",
  } satisfies Record<BodyweightGoal, string>;

  const statusColors = getStatusColors(trendStatus);
  const latestLog = weeklyData
    .flatMap((week) => week.entries)
    .sort((a, b) => parseBodyweightDate(b.date) - parseBodyweightDate(a.date))[0];

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom - Spacing.md,
          paddingHorizontal: Spacing.md,
        },
      ]}
    >
      <View style={styles.content}>
        <FlatList
          data={weeklyData}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={(
            <>
        <View style={styles.headerBlock}>
          <ScreenHeader title="Bodyweight" subtitle="Logs" />
        </View>

        <LiquidCard style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalCopy}>
              <ThemedText type="label" themeColor="accent">
                Current bodyweight
              </ThemedText>
              <ThemedText type="display" style={styles.tabularText}>
                {latestLog ? formatWeight(latestLog.weight, settings.weightUnit) : `-- ${settings.weightUnit}`}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {activePhase && goalSettings
                  ? `${activePhase.name} · ${goalCopy[goalSettings.goal]} at ${fromKilograms(goalSettings.weeklyTarget, settings.weightUnit).toFixed(1)} ${settings.weightUnit}/week`
                  : "No active phase · create one to set a bodyweight goal"}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
              <ThemedText type="label" style={{ color: statusColors.color }}>
                {!activePhase ? "No goal" : trendStatus === "success" ? "On pace" : trendStatus === "danger" ? "Off pace" : "No trend"}
              </ThemedText>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <ThemedText type="caption" themeColor="textSecondary">
                Bodyweight trending
              </ThemedText>
              <ThemedText type="numeric" style={{ color: statusColors.color }}>
                {formatSignedWeight(bodyweightTrend)}
              </ThemedText>
            </View>
            <View style={styles.metricBlock}>
              <ThemedText type="caption" themeColor="textSecondary">
                Bodyweight goal
              </ThemedText>
              <ThemedText type="numeric">
                {formatSignedWeight(bodyweightGoal)}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/bodyweight/phases" as Href)}
            style={[styles.phaseRow, { borderTopColor: theme.divider }]}
          >
            <View style={styles.flexText}>
              <ThemedText type="label">
                {activePhase ? "Active phase" : "Bodyweight phases"}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {activePhase
                  ? `${activePhase.durationWeeks} ${activePhase.durationWeeks === 1 ? "week" : "weeks"} · ends ${getBodyweightPhasePlannedEnd(activePhase).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : "Add a named goal with a duration and weekly trend."}
              </ThemedText>
            </View>
            <ThemedText type="label" themeColor="accent">Manage</ThemedText>
          </TouchableOpacity>
        </LiquidCard>

        <LiquidCard style={styles.logCard}>
          <View style={styles.logHeading}>
            <View style={styles.flexText}>
              <ThemedText type="section">
                {editingId !== null ? "Edit bodyweight" : "Log bodyweight"}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {editingId !== null ? "Update the selected entry" : `Today · ${todayLabel}`}
              </ThemedText>
            </View>
          </View>

          <View style={styles.weightInputRow}>
            <LiquidInput
              accessibilityLabel={`Bodyweight in ${settings.weightUnit}`}
              style={styles.weightInput}
              onChangeText={onChangeNumber}
              value={number}
              placeholder="0.0"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={() => void handleSave()}
            />
            <View style={[styles.unitBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="label">{settings.weightUnit}</ThemedText>
            </View>
          </View>

          <View style={styles.logActions}>
            {editingId !== null ? (
              <LiquidButton
                style={styles.logAction}
                variant="ghost"
                disabled={savingWeight}
                onPress={() => { setEditingId(null); onChangeNumber(""); }}
              >
                Cancel
              </LiquidButton>
            ) : (
              <TouchableOpacity
                disabled={savingWeight}
                style={[
                  styles.photoButton,
                  {
                    backgroundColor: selectedImageUri ? theme.accentSoft : theme.backgroundSelected,
                    borderColor: selectedImageUri ? theme.accent : theme.divider,
                  },
                ]}
                onPress={selectPhotoForNewLog}
              >
                <ThemedText
                  type="label"
                  style={{ color: selectedImageUri ? theme.accent : theme.textSecondary }}
                >
                  {selectedImageUri ? "Photo selected" : "Add photo"}
                </ThemedText>
              </TouchableOpacity>
            )}
            <LiquidButton
              style={styles.logAction}
              variant="primary"
              disabled={savingWeight}
              onPress={() => void handleSave()}
            >
              {savingWeight ? "Saving…" : editingId !== null ? "Update entry" : "Log bodyweight"}
            </LiquidButton>
          </View>
        </LiquidCard>

        {selectedImageUri && (
          <TouchableOpacity
            style={[
              styles.selectedPhotoRow,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.divider },
            ]}
            onPress={() => setPreviewImageUri(selectedImageUri)}
          >
            <Image source={{ uri: selectedImageUri }} style={styles.selectedPhotoThumb} />
            <View style={styles.flexText}>
              <ThemedText type="bodyMedium">Photo ready</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">It will be saved with today&apos;s log.</ThemedText>
            </View>
            <TouchableOpacity onPress={() => setSelectedImageUri(null)}>
              <ThemedText type="label" themeColor="danger">Remove</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        <View style={styles.historyHeading}>
          <ThemedText type="section">Weekly history</ThemedText>
        </View>
            </>
          )}
          renderItem={({ item }) => {
            const isExpanded = expandedWeeks.includes(item.id);
            const weekTrend = item.diff === null ? null : Number(item.diff);
            const weekStatus = goalSettings
              ? getBodyweightTrendStatus(
                Number.isFinite(weekTrend) ? weekTrend : null,
                goalSettings,
              )
              : "neutral";
            const weekStatusColors = getStatusColors(weekStatus);

            return (
              <View style={styles.weekGroup}>
                <TouchableOpacity
                  style={[
                    styles.weekCard,
                    {
                      borderColor: theme.glassTokens.border,
                      backgroundColor: theme.glassTokens.background,
                    },
                  ]}
                  onPress={() => toggleWeek(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.weekSummaryRow}>
                    <View style={styles.weekCopyLeft}>
                      <ThemedText type="bodyMedium">{item.id}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {item.count} {item.count === 1 ? 'Entry' : 'Entries'}
                      </ThemedText>
                    </View>
                    <View style={styles.weekCopyRight}>
                      <ThemedText type="numeric">{formatWeight(Number(item.avg), settings.weightUnit, 2)}</ThemedText>
                      <ThemedText type="caption" style={{ color: weekStatusColors.color }}>
                        {weekTrend === null
                          ? "No trend"
                          : weekTrend > 0
                            ? `▲ +${fromKilograms(weekTrend, settings.weightUnit).toFixed(2)} ${settings.weightUnit}`
                            : weekTrend < 0
                              ? `▼ -${fromKilograms(Math.abs(weekTrend), settings.weightUnit).toFixed(2)} ${settings.weightUnit}`
                              : `+0 ${settings.weightUnit}`}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.weekEntries}>
                    {item.entries.map((log) => (
                      <TouchableOpacity
                        key={log.id}
                        style={[
                          styles.logRow,
                          { backgroundColor: theme.backgroundElement, borderColor: theme.divider },
                        ]}
                        onLongPress={() => void handleLongPressLog(log)}
                        delayLongPress={500}
                      >
                        {log.image_uri ? (
                          <TouchableOpacity onPress={() => setPreviewImageUri(log.image_uri ?? null)}>
                            <Image source={{ uri: log.image_uri }} style={styles.logPhotoThumb} />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.emptyPhotoThumb, { borderColor: theme.divider }]} />
                        )}
                        <View style={styles.logCopy}>
                          <ThemedText type="bodyMedium">
                            {log.date}
                          </ThemedText>
                          <ThemedText type="caption" themeColor="textSecondary">
                            {log.image_uri ? "Photo attached" : "Long press to add photo"}
                          </ThemedText>
                        </View>
                        <ThemedText type="numeric">
                          {formatWeight(log.weight, settings.weightUnit)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>
      <Modal
        visible={previewImageUri !== null}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.photoPreview}
          onPress={() => setPreviewImageUri(null)}
        >
          {previewImageUri ? (
            <Image source={{ uri: previewImageUri }} resizeMode="contain" style={styles.previewImage} />
          ) : null}
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  headerBlock: {
    marginTop: Spacing.xl,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  logCard: {
    gap: Spacing.md,
    width: "100%",
    marginTop: Spacing.md,
  },
  logHeading: {
    alignItems: "center",
    flexDirection: "row",
  },
  weightInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  weightInput: {
    ...Typography.numeric,
    flex: 1,
    minHeight: 58,
  },
  unitBadge: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 58,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: Spacing.md,
  },
  logActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  logAction: {
    flex: 1,
  },
  goalCard: {
    width: "100%",
    marginTop: Spacing.md,
  },
  goalHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  goalCopy: { flexGrow: 1, flexShrink: 1, minWidth: 200 },
  tabularText: { fontVariant: ["tabular-nums"] },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  metricBlock: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 140,
  },
  phaseRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  listContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  photoButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  selectedPhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  selectedPhotoThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },
  historyHeading: { marginTop: Spacing.lg },
  weekGroup: { width: "100%" },
  weekCard: {
    alignItems: "center",
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  weekSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  weekCopyLeft: { alignItems: "flex-start", flex: 1, gap: Spacing.xs },
  weekCopyRight: { alignItems: "flex-end", flex: 1, gap: Spacing.xs },
  weekEntries: { gap: Spacing.xs, marginTop: Spacing.sm },
  logRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  logCopy: { flex: 1 },
  flexText: { flex: 1 },
  logPhotoThumb: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
  },
  emptyPhotoThumb: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  photoPreview: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "94%",
    height: "86%",
  },
});
