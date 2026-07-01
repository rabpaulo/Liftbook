import { useState } from "react";

import {
  Alert,
  FlatList,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import WeightStatsCard from "@/components/WeightStatsCard";
import { Layout } from "@/constants/layout";
import { Spacing } from "@/constants/theme";
import { useBodyweight } from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { showToast } from "@/utils/toast";

export default function BodyweightScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [number, onChangeNumber] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  const { weeklyData, addLog, removeLog, updateLog, checkEntryToday } = useBodyweight();

  {/*
   LOOKOUT FOR THIS
   Pretty sure this is going to break because of the start and end of week
   Being different from the hook
  */}
  const dateTime = new Date();
  const dayOfWeek = dateTime.getDay(); // 0 (Dom) a 6 (Sáb)
  const date = dateTime.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const diff = dateTime.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

  const weekStart = new Date(dateTime);
  weekStart.setDate(diff);

  const weekStartDate = weekStart.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

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
    if (editingId) {
      const success = await updateLog(editingId, weightNumber);
      if (success) {
        showToast("Success", "Your weight log has been updated.", theme, "success");
        setEditingId(null);
        onChangeNumber("");
      }
    } else {
      const alreadyLogged = await checkEntryToday();
      if (alreadyLogged) {
        showToast("Error", "You have already registered your weight today.", theme, "error");
        return;
      }

      const success = await addLog(date, weightNumber);
      if (success) {
        showToast("Success", "Your weight log has been added.", theme, "success");
        onChangeNumber("");
      }
    }
  };

  const toggleWeek = (id: string) => {
    setExpandedWeeks((prev) =>
      prev.includes(id)
        ? prev.filter((weekId) => weekId !== id)
        : [...prev, id],
    );
  };

  const handleLongPressLog = (log: any) => {
    Alert.alert("Options", `Log: ${log.weight}kg on ${log.date}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Edit",
        onPress: () => {
          setEditingId(log.id);
          onChangeNumber(log.weight.toString());
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeLog(log.id),
      },
    ]);
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: safeAreaInsets.top,
          paddingBottom: safeAreaInsets.bottom - Spacing.five,
          paddingHorizontal: Spacing.four,
        },
      ]}
    >
      <WeightStatsCard/>
      <FlatList
        data={weeklyData}
        keyExtractor={(item) => item.id}
        style={{ width: "100%", marginTop: Spacing.five }}
        contentContainerStyle={{ gap: Spacing.three }}
        renderItem={({ item }) => {
          const isExpanded = expandedWeeks.includes(item.id);

          return (
            <View style={{ width: "100%" }}>
              {/* Header do Dropdown: Data do começo da semana - Média */}
              <TouchableOpacity
                style={{
                  padding: Layout.padding,
                  borderColor: theme.textSecondary,
                  borderWidth: 1,
                  borderRadius: Layout.radius,
                  backgroundColor: theme.backgroundElement,
                  alignItems: "center",
                }}
                onPress={() => toggleWeek(item.id)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

                  {/* Left side: Date and Entries count */}
                  <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
                    <ThemedText type="default">{item.id}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                      {item.count} {item.count === 1 ? 'Entry' : 'Entries'}
                    </ThemedText>
                  </View>

                  {/* Middle side: Average and Up/Down indicator */}
                  <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                    <ThemedText type="default">{item.avg} kg</ThemedText>
                    <ThemedText style={{ fontSize: 12 }}>
                      {item.diff > 0 ? `▲ +${item.diff} kg` : item.diff < 0 ? `▼ -${Math.abs(item.diff)} kg` : `+0 kg`}
                    </ThemedText>
                  </View>

                  {/* Right side: Input field */}
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {item.id == weekStartDate ? (
                      < TextInput
                        style={{
                          color: theme.text,
                          borderColor: theme.textSecondary,
                          fontFamily: 'Inter-SemiBold',
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 8,
                          width: 80,
                          textAlign: 'center',
                        }}
                        onChangeText={onChangeNumber}
                        onSubmitEditing={() => handleSave()}
                        value={number}
                        placeholder="Log"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    ) : (
                      <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                        Log disabled
                      </ThemedText>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Itens do Dropdown: Data do log - Peso do dia */}
              {isExpanded && (
                <View style={{ marginTop: Spacing.two, gap: Spacing.one }}>
                  {item.entries.map((log: any) => (
                    <TouchableOpacity
                      key={log.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: Spacing.two,
                        paddingHorizontal: Spacing.four,
                        backgroundColor: theme.backgroundElement,
                        borderRadius: Layout.radius,
                        opacity: 0.8,
                      }}
                      onLongPress={() => handleLongPressLog(log)}
                      delayLongPress={500}
                    >
                      <ThemedText style={{ fontSize: 14 }}>
                        {log.date}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 14 }}>
                        {log.weight} kg
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />
    </ThemedView>
  );
}

export const styles = {
  center: { gap: Layout.gap, width: "100%", alignItems: "center" } as const,
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  } as const,
  input: {
    borderWidth: 1,
    borderRadius: Layout.radius,
    padding: Layout.paddingSm,
    width: "40%",
    flex: 1,
  } as const,
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: Spacing.five,
  } as const,
  saveButton: {
    marginLeft: Spacing.three,
    paddingVertical: Layout.paddingSm,
    paddingHorizontal: Layout.padding,
    borderRadius: Layout.radius,
  } as const,
};