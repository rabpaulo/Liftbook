import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiquidButton } from "@/components/LiquidButton";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type AppDialogAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
};

type AppDialogOptions = {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  actions: readonly AppDialogAction[];
};

type AppDialogContextValue = {
  showDialog(options: AppDialogOptions): Promise<string | null>;
  showMessage(title: string, message: string, icon?: AppDialogOptions["icon"]): Promise<void>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);
  const pendingResolution = useRef<((value: string | null) => void) | null>(null);

  const closeDialog = useCallback((result: string | null) => {
    const resolve = pendingResolution.current;
    pendingResolution.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const showDialog = useCallback((options: AppDialogOptions) => {
    pendingResolution.current?.(null);
    return new Promise<string | null>((resolve) => {
      pendingResolution.current = resolve;
      setDialog(options);
    });
  }, []);

  const showMessage = useCallback(async (
    title: string,
    message: string,
    icon: AppDialogOptions["icon"] = "alert-circle-outline",
  ) => {
    await showDialog({
      title,
      message,
      icon,
      actions: [{ id: "close", label: "Close", variant: "primary" }],
    });
  }, [showDialog]);

  const value = useMemo(() => ({ showDialog, showMessage }), [showDialog, showMessage]);

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => closeDialog(null)}
        statusBarTranslucent
        transparent
        visible={dialog !== null}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          onPress={() => closeDialog(null)}
          style={styles.backdrop}
        >
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.dialog,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.divider,
                marginTop: insets.top + Spacing.md,
                marginBottom: insets.bottom + Spacing.md,
              },
            ]}
          >
            {dialog ? (
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name={dialog.icon ?? "options-outline"} size={24} color={theme.text} />
                </View>
                <View style={styles.copy}>
                  <ThemedText type="section" style={styles.centerText}>{dialog.title}</ThemedText>
                  {dialog.message ? (
                    <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
                      {dialog.message}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  {dialog.actions.map((action) => (
                    <LiquidButton
                      key={action.id}
                      onPress={() => closeDialog(action.id)}
                      variant={action.variant ?? "secondary"}
                    >
                      {action.label}
                    </LiquidButton>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const value = useContext(AppDialogContext);
  if (!value) throw new Error("useAppDialog must be used within AppDialogProvider.");
  return value;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  dialog: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    maxHeight: "90%",
    maxWidth: Math.min(MaxContentWidth, 440),
    overflow: "hidden",
    width: "100%",
  },
  content: { gap: Spacing.md, padding: Spacing.lg },
  icon: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: Radius.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  copy: { gap: Spacing.sm },
  centerText: { textAlign: "center" },
  actions: { gap: Spacing.sm },
});
