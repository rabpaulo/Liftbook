import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { spacing } from "@/constants/theme";

type LiquidHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: ReactNode;
};

export function LiquidHeader({ title, subtitle, showBack = false, right }: LiquidHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleBlock}>
        <ThemedText type={showBack ? "subtitle" : "title"} numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
});
