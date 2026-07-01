import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";

export default function SettingsScreen(){
    const theme = useTheme();

    return(
        <ThemedView
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.background,
            }}
        >
            <ThemedText>Settings screen</ThemedText>
        </ThemedView>
    )
}
