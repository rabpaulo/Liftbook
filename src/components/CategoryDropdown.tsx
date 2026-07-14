import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { LiquidButton } from "@/components/LiquidButton";
import { LiquidInput } from "@/components/LiquidInput";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SUGGESTED_CATEGORIES } from "@/utils/training-types";
import { fuzzySearch } from "@/utils/fuzzy-search";

export function CategoryDropdown({
  value,
  onChange,
  categories = [],
  label = "Category",
  placeholder = "Select category",
  allowClear = false,
  allowCreate = true,
}: {
  value: string;
  onChange: (category: string) => void;
  categories?: readonly string[];
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  allowCreate?: boolean;
}) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const options = useMemo(() => {
    const values = [...SUGGESTED_CATEGORIES, ...categories, ...(value ? [value] : [])];
    const unique = new Map<string, string>();
    for (const item of values) {
      const trimmed = item.trim();
      if (trimmed) unique.set(trimmed.toLocaleLowerCase(), trimmed);
    }
    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  }, [categories, value]);
  const filteredOptions = useMemo(() => fuzzySearch(options, search), [options, search]);

  const closeMenu = () => {
    setMenuVisible(false);
    setSearch("");
  };

  const saveNewCategory = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const existing = options.find((option) => option.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
    onChange(existing ?? trimmed);
    setDraft("");
    setCreating(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || placeholder}`}
          onPress={() => { setSearch(""); setMenuVisible(true); }}
          style={[styles.selector, { borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText style={{ flex: 1 }} themeColor={value ? "text" : "textSecondary"}>{value || placeholder}</ThemedText>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>
        {allowCreate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new category"
            onPress={() => setCreating((current) => !current)}
            style={[styles.addButton, { borderColor: theme.divider, backgroundColor: theme.backgroundElement }]}
          >
            <Ionicons name={creating ? "close" : "add"} size={24} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>

      {creating ? (
        <View style={styles.createRow}>
          <LiquidInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={saveNewCategory}
            placeholder="New category name"
            returnKeyType="done"
            style={{ flex: 1 }}
          />
          <LiquidButton variant="primary" disabled={!draft.trim()} onPress={saveNewCategory}>Add</LiquidButton>
        </View>
      ) : null}

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Close category menu" style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <ThemedView style={[styles.menu, { borderColor: theme.divider }]}>
            <View style={styles.menuHeader}>
              <ThemedText type="subtitle">{label}</ThemedText>
              <Pressable accessibilityLabel="Close category menu" onPress={closeMenu} style={styles.iconButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <LiquidInput
              accessibilityLabel="Search categories"
              value={search}
              onChangeText={setSearch}
              placeholder="Search categories"
              returnKeyType="search"
              style={styles.searchInput}
            />
            <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
              {allowClear && !search.trim() ? (
                <CategoryOption label="All categories" selected={!value} onPress={() => { onChange(""); closeMenu(); }} />
              ) : null}
              {filteredOptions.map((option) => (
                <CategoryOption
                  key={option.toLocaleLowerCase()}
                  label={option}
                  selected={option.toLocaleLowerCase() === value.toLocaleLowerCase()}
                  onPress={() => { onChange(option); closeMenu(); }}
                />
              ))}
              {filteredOptions.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptySearch}>
                  No matching categories
                </ThemedText>
              ) : null}
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}

function CategoryOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected && { backgroundColor: theme.accentSoft }]}
    >
      <ThemedText type="smallBold" style={{ flex: 1, color: selected ? theme.accent : theme.text }}>{label}</ThemedText>
      {selected ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  row: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  selector: { alignItems: "center", borderRadius: Radius.large, borderWidth: 1, flex: 1, flexDirection: "row", minHeight: 50, paddingHorizontal: Spacing.three },
  addButton: { alignItems: "center", borderRadius: Radius.large, borderWidth: 1, height: 50, justifyContent: "center", width: 50 },
  createRow: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  overlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.55)", flex: 1, justifyContent: "center", padding: Spacing.three },
  menu: { borderRadius: Radius.large, borderWidth: 1, maxHeight: "72%", maxWidth: 520, padding: Spacing.three, width: "100%" },
  menuHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  searchInput: { marginTop: Spacing.two },
  options: { marginTop: Spacing.two },
  option: { alignItems: "center", borderRadius: Radius.medium, flexDirection: "row", minHeight: 48, paddingHorizontal: Spacing.three },
  emptySearch: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.four, textAlign: "center" },
});
