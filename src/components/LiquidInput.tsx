import { useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function LiquidInput({ style, onBlur, onFocus, placeholderTextColor, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor ?? theme.textSecondary}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: focused ? theme.accent : theme.glassTokens.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
});
