import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { appSettingsRepository } from "@/database/repositories/appSettingsRepository";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<boolean>;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void appSettingsRepository.getThemePreference().then((storedPreference) => {
      if (active) setStoredPreference(storedPreference);
    }).catch((error: unknown) => console.error("Error loading theme preference:", error));
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    try {
      await appSettingsRepository.setThemePreference(nextPreference);
      setStoredPreference(nextPreference);
      return true;
    } catch (error) {
      console.error("Error saving theme preference:", error);
      return false;
    }
  }, []);

  const resolvedTheme: ResolvedTheme = preference === "system"
    ? systemTheme === "dark" ? "dark" : "light"
    : preference;
  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error("useThemePreference must be used inside ThemePreferenceProvider.");
  return context;
}
