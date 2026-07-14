import { ReactNode } from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { radius, spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LiquidButtonProps = PressableProps & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
};

export function LiquidButton({ children, style, variant = "secondary", disabled, ...props }: LiquidButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary
            ? theme.accent
            : isDestructive
              ? theme.dangerSoft
              : theme.backgroundElement,
          borderColor: isPrimary
            ? theme.accent
            : isDestructive
              ? theme.danger
              : theme.divider,
          borderWidth: pressed ? 2 : 1,
        },
        typeof style === "function" ? style({ pressed, hovered: false }) : style,
      ]}
      {...props}
    >
      <ThemedText
        type="smallBold"
        style={[
          styles.label,
          { color: isPrimary ? theme.textOnAccent : isDestructive ? theme.danger : theme.text },
        ]}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    flexShrink: 1,
    justifyContent: "center",
    maxWidth: "100%",
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { flexShrink: 1, textAlign: "center" },
});
