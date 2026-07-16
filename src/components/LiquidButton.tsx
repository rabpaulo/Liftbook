import { ReactNode } from "react";
import { Pressable, PressableProps, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LiquidButtonProps = PressableProps & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
};

export function LiquidButton({ children, style, variant = "secondary", disabled, ...props }: LiquidButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const isDestructive = variant === "destructive";
  const isGhost = variant === "ghost";

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
              : isGhost
                ? "transparent"
                : theme.backgroundElement,
          borderColor: isPrimary
            ? theme.accent
            : isDestructive
              ? theme.danger
              : isGhost
                ? "transparent"
                : theme.divider,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === "function" ? style({ pressed, hovered: false }) : style,
      ]}
      {...props}
    >
      <ThemedText
        type="label"
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
    borderRadius: Radius.md,
    borderWidth: 1,
    flexShrink: 1,
    justifyContent: "center",
    maxWidth: "100%",
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  label: { flexShrink: 1, textAlign: "center" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
