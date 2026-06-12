import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout } from '@/constants/layout';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBodyweight } from '@/hooks/useBodyweight';
import { showToast } from '@/utils/toast';
import { useMemo, useState } from 'react';
import { Alert, FlatList, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BodyweightScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const [number, onChangeNumber] = useState('');
  const { logs, addLog } = useBodyweight();
  const weeklyData = useMemo(() => {
    const groups: Record<string, any[]> = {};

    logs.forEach(log => {
      const [day, month, year] = log.date.split('/');
      const date = new Date(2000 + Number(year), Number(month) - 1, Number(day));
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

      const monday = new Date(date);
      monday.setDate(date.getDate() - dayOfWeek + 1);
      const weekKey = monday.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(log);
    });

    return Object.entries(groups).map(([weekStart, entries]) => {
      const avg = entries.reduce((sum, e) => sum + e.weight, 0) / entries.length;

      return {
        id: weekStart,
        weekStart,
        avg: avg.toFixed(1),
        entries
      };
    });
  }, [logs]);

  const showWeekDetails = (entries: any[]) => {
    const details = entries.map(e => `${e.date}: ${e.weight} kg`).join('\n');
    Alert.alert('Weekly logs', details);
  };

  const dateTime = new Date();
  const date = dateTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const handleSave = async () => {
    const success = await addLog(date, number);
    if (success) {
      showToast("Bodyweight logged!", theme);
      onChangeNumber('');
    }
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
          <ThemedText>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={weeklyData}
        keyExtractor={(item) => item.id}
        style={{ width: '100%', marginTop: Spacing.five }}
        contentContainerStyle={{ gap: Spacing.three }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.logItem, { backgroundColor: theme.backgroundElement }]}
            onLongPress={() => showWeekDetails(item.entries)}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <ThemedText>{item.weekStart}</ThemedText>
            <ThemedText type="default"> Average: {item.avg}kg</ThemedText>
          </TouchableOpacity>
        )}
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
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Layout.padding,
    borderRadius: Layout.radius,
    width: '100%',
  } as const,
};