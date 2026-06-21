import { ImageRepository } from "@/database/repositories/imageRepository";
import { FontAwesome } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Layout } from "@/constants/layout";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useBodyweight } from "@/hooks/use-bodyweight";
import { useTheme } from "@/hooks/use-theme";
import { showToast } from "@/utils/toast";

export default function BodyweightScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [number, onChangeNumber] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  const { weeklyData, addLog, removeLog, updateLog, checkEntryToday } =
    useBodyweight();

  const dateTime = new Date();
  const date = dateTime.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

async function pickAndSaveImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    Alert.alert('Permission required', 'Permission to access photos is required.');
    return null;
  }

  const res: any = await ImagePicker.launchImageLibraryAsync({
    quality: 0.8,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  // handle both old (cancelled, uri) and new (canceled, assets[]) APIs
  if (res.cancelled === true || res.canceled === true) return null;

  const asset = res.assets?.[0] ?? null;
  const uri = res.uri ?? asset?.uri;
  if (!uri) return null;

  // Prefer to copy files on native platforms. 
  // On web, expo-file-system may not support copyAsync — fallback to using original URI.
  const filename = uri.split('/').pop() ?? asset?.fileName ?? `img_${Date.now()}.jpg`;
  const width = res.width ?? asset?.width ?? null;
  const height = res.height ?? asset?.height ?? null;

  const canCopy = Platform.OS !== 'web' && typeof FileSystem.copyAsync === 'function';
  if (canCopy) {
    const dest = FileSystem.documentDirectory + filename;
    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      return { uri: dest, width, height, filename };
    } catch (e) {
      // fallback to original uri if copy fails
      return { uri, width, height, filename };
    }
  }

  // Web or unsupported platform: don't copy, return original uri
  return { uri, width, height, filename };
}
  const handleSave = async () => {
    // 1. Barra valores vazios imediatamente
    if (!number || number.trim() === "") {
      Alert.alert("Error", "Please enter a weight.");
      return;
    }
    // 2. Converte vírgula para ponto e transforma em número real
    const weightNumber = parseFloat(number.replace(",", "."));
    // 3. Verifica se a conversão falhou (ex: o usuário colou um texto bizarro)
    if (isNaN(weightNumber) || weightNumber <= 0) {
      Alert.alert("Error", "Please enter a valid numeric weight.");
      return;
    }
    if (editingId) {
      const success = await updateLog(editingId, weightNumber);
      if (success) {
        showToast("Log updated!", theme);
        setEditingId(null);
        onChangeNumber("");
      }
    } else {
      const alreadyLogged = await checkEntryToday();
      if (alreadyLogged) {
        Alert.alert(
          `Already logged!`,
          `You have already registered your weight today. (${date}).`,
        );
        return;
      }

      const success = await addLog(date, weightNumber);
      if (success) {
        showToast("Bodyweight logged!", theme);
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
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
          paddingHorizontal: Spacing.four,
        },
      ]}
    >
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.textSecondary,
              fontFamily: 'Inter-SemiBold',
            },
          ]}
          onChangeText={onChangeNumber}
          value={number}
          placeholder="Bodyweight (KGs)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        {/* Image picker: picks and saves to app storage + DB */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const img = await pickAndSaveImage();
              if (!img) return;
              await ImageRepository.create(img.uri, img.filename ?? null, img.width ?? null, img.height ?? null);
              showToast('Image saved!', theme);
            } catch (err) {
              console.error("Error saving image:", err);
              Alert.alert('Error', 'Could not save image.');
            }
          }}
        >
          <FontAwesome name="file-picture-o" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: theme.backgroundElement },
          ]}
          onPress={handleSave}
        >
          <ThemedText>{editingId ? "Update" : "Save"}</ThemedText>
        </TouchableOpacity>

        {editingId !== null && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "transparent" }]}
            onPress={() => {
              setEditingId(null);
              onChangeNumber("");
            }}
          >
            <ThemedText style={{ color: theme.textSecondary }}>
              Cancel
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

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
                  borderWidth: 2,
                  borderRadius: Layout.radius,
                  backgroundColor: theme.backgroundElement,
                  alignItems: "center",
                }}
                onPress={() => toggleWeek(item.id)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  {/* Left side: Date and Entries count */}
                  <View style={{ alignItems: 'flex-start', gap: 2 }}>
                    <ThemedText type="default">{item.weekStart}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                      {item.count} {item.count === 1 ? 'Entry' : 'Entries'}
                    </ThemedText>
                  </View>

                  {/* Right side: Average and Up/Down indicator */}
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <ThemedText type="default">{item.avg} kg</ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 12,
                        // Red for weight gain, Green for weight loss. Change if your goal is gaining weight.
                        //color: item.diff > 0 ? '#ef4444' : item.diff < 0 ? '#22c55e' : theme.textSecondary
                      }}
                    >
                      {item.diff > 0 ? `▲ +${item.diff} kg` : item.diff < 0 ? `▼ -${item.diff} kg` : ` 0 kg`}
                    </ThemedText>
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