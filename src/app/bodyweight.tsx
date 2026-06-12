import { useState } from 'react';
import { Alert, FlatList, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBodyweight } from '@/hooks/useBodyweight';
import { showToast } from '@/utils/toast';

export default function BodyweightScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [number, onChangeNumber] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  const { weeklyData, addLog, removeLog, updateLog } = useBodyweight();

  const dateTime = new Date();
  const date = dateTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const handleSave = async () => {
    if (editingId) {
      const success = await updateLog(editingId, number);
      if (success) {
        showToast("Log updated!", theme);
        setEditingId(null);
        onChangeNumber('');
      }
    } else {
      const success = await addLog(date, number);
      if (success) {
        showToast("Bodyweight logged!", theme);
        onChangeNumber('');
      }
    }
  };

  const toggleWeek = (id: string) => {
    setExpandedWeeks(prev =>
      prev.includes(id) ? prev.filter(weekId => weekId !== id) : [...prev, id]
    );
  };

  const handleLongPressLog = (log: any) => {
    Alert.alert('Options', `Log: ${log.weight}kg on ${log.date}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit',
        onPress: () => {
          setEditingId(log.id);
          onChangeNumber(log.weight.toString());
        }
      },
      { text: 'Delete', style: 'destructive', onPress: () => removeLog(log.id) },
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
      ]}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
          onChangeText={onChangeNumber}
          value={number}
          placeholder="Bodyweight (KGs)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.backgroundElement }]}
          onPress={handleSave}
        >
          <ThemedText>{editingId ? "Update" : "Save"}</ThemedText>
        </TouchableOpacity>

        {editingId !== null && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: 'transparent' }]}
            onPress={() => { setEditingId(null); onChangeNumber(''); }}
          >
            <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={weeklyData}
        keyExtractor={(item) => item.id}
        style={{ width: '100%', marginTop: Spacing.five }}
        contentContainerStyle={{ gap: Spacing.three }}
        renderItem={({ item }) => {
          const isExpanded = expandedWeeks.includes(item.id);

          return (
            <View style={{ width: '100%' }}>
              {/* Header do Dropdown: Data do começo da semana - Média */}
              <TouchableOpacity
                style={{
                  padding: Layout.padding,
                  borderRadius: Layout.radius,
                  backgroundColor: theme.backgroundElement,
                  alignItems: 'center',
                }}
                onPress={() => toggleWeek(item.id)}
                activeOpacity={0.7}
              >
                <ThemedText type="default">
                  {item.weekStart} - {item.avg} kg
                </ThemedText>
              </TouchableOpacity>

              {/* Itens do Dropdown: Data do log - Peso do dia */}
              {isExpanded && (
                <View style={{ marginTop: Spacing.two, gap: Spacing.one }}>
                  {item.entries.map((log: any) => (
                    <TouchableOpacity
                      key={log.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: Spacing.two,
                        paddingHorizontal: Spacing.four,
                        backgroundColor: theme.backgroundElement,
                        borderRadius: Layout.radius,
                        opacity: 0.8,
                      }}
                      onLongPress={() => handleLongPressLog(log)}
                      delayLongPress={500}
                    >
                      <ThemedText style={{ fontSize: 14 }}>{log.date}</ThemedText>
                      <ThemedText style={{ fontSize: 14 }}>{log.weight} kg</ThemedText>
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
  center: { gap: Layout.gap, width: '100%', alignItems: 'center' } as const,
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center' } as const,
  input: {
    borderWidth: 1,
    borderRadius: Layout.radius,
    padding: Layout.paddingSm,
    width: '40%',
    flex: 1
  } as const,
  row: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: Spacing.five } as const,
  saveButton: {
    marginLeft: Spacing.three,
    paddingVertical: Layout.paddingSm,
    paddingHorizontal: Layout.padding,
    borderRadius: Layout.radius,
  } as const,
};