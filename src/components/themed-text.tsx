import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    fontWeight: 600,
  },
  default: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    fontWeight: 500,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.sans,
    fontWeight: 800,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Fonts.sans,
    fontWeight: 700,
  },
});
