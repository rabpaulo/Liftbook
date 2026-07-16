import { createContext, useCallback, useContext, useRef, type ComponentRef, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type ScrollBy = (distance: number) => number;

const TrainingScrollContext = createContext<ScrollBy>(() => 0);

export function useTrainingScroll() {
  return useContext(TrainingScrollContext);
}

export function TrainingScreen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const scrollBy = useCallback<ScrollBy>((distance) => {
    const maximum = Math.max(0, contentHeight.current - viewportHeight.current);
    const nextOffset = Math.max(0, Math.min(scrollOffset.current + distance, maximum));
    const appliedDistance = nextOffset - scrollOffset.current;
    if (appliedDistance === 0) return 0;
    scrollOffset.current = nextOffset;
    scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
    return appliedDistance;
  }, []);
  const content = (
    <TrainingScrollContext.Provider value={scrollBy}>
      <View style={styles.content}>{children}</View>
    </TrainingScrollContext.Provider>
  );
  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(_width, height) => { contentHeight.current = height; }}
            onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
            onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 }]}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.scroll, styles.screen, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom }]}>{content}</View>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="section">{title}</ThemedText>
      {action}
    </View>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="barbell-outline" size={28} color={theme.textSecondary} />
      <ThemedText type="bodyMedium">{title}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>{message}</ThemedText>
      {action}
    </View>
  );
}

export function SegmentedControl<T extends string | number | null>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { borderColor: theme.divider }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={`${option.value ?? "null"}`}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.accentSoft }]}
          >
            <ThemedText
              type="label"
              style={[styles.segmentLabel, { color: selected ? theme.accent : theme.textSecondary }]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { alignItems: "center", paddingHorizontal: Spacing.md },
  content: { width: "100%", maxWidth: MaxContentWidth, gap: Spacing.md },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.sm },
  empty: { alignItems: "center", borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg },
  centerText: { textAlign: "center", maxWidth: 360 },
  segmented: { borderRadius: Radius.md, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  segment: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 38, minWidth: 40, paddingHorizontal: Spacing.sm },
  segmentLabel: { fontVariant: ["tabular-nums"], textAlign: "center", width: "100%" },
});
