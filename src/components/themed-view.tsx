import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps;

export function ThemedView({ style, children, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View style={[{ backgroundColor: theme.background }, style]} {...otherProps}>
      {children}
    </View>
  );
}
