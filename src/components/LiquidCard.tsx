import { ReactNode } from "react";
import { StyleSheet, View, ViewProps } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LiquidCardProps = ViewProps & {
  children?: ReactNode;
};

export function LiquidCard({
  children,
  style,
  ...props
}: LiquidCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        styles.padded,
        {
          backgroundColor: theme.glassTokens.background,
          borderColor: theme.glassTokens.border,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  padded: {
    padding: Spacing.md,
  },
});
