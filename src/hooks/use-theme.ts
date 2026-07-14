/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/hooks/use-theme-preference';

export function useTheme() {
  const { resolvedTheme } = useThemePreference();
  return Colors[resolvedTheme];
}
