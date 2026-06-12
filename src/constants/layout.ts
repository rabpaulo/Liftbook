import { StyleSheet } from 'react-native';

/** Shared spacing, radii, and list layouts for a consistent UI. */
export const Layout = {
  padding: 20,
  paddingSm: 16,
  gap: 16,
  gapSm: 10,
  radius: 12,
  radiusSm: 8,
  radiusPill: 999,
} as const;

/** Standard FlatList / ScrollView content container */
export const listContent = {
  padding: Layout.padding,
  paddingBottom: Layout.padding * 2,
  gap: Layout.gap,
} as const;

/** Stack screen with a flex-growing list */
export const stackListStyles = StyleSheet.create({
  flex: { flex: 1 },
  content: { ...listContent, flexGrow: 1 },
});