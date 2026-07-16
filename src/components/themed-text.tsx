import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'display'
  | 'title'
  | 'section'
  | 'body'
  | 'bodyMedium'
  | 'label'
  | 'caption'
  | 'numeric'
  | 'default'
  | 'small'
  | 'smallBold'
  | 'subtitle';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: Typography.display,
  title: Typography.title,
  section: Typography.section,
  body: Typography.body,
  bodyMedium: Typography.bodyMedium,
  label: Typography.label,
  caption: Typography.caption,
  numeric: Typography.numeric,
  default: Typography.body,
  small: Typography.caption,
  smallBold: Typography.label,
  subtitle: Typography.section,
});
