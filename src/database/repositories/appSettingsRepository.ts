import { db } from "@/database/database";
import type { ThemePreference } from "@/hooks/use-theme-preference";

export const appSettingsRepository = {
  async getThemePreference(): Promise<ThemePreference> {
    const row = await db.getFirstAsync<{ theme_preference: string }>(
      "SELECT theme_preference FROM app_settings WHERE id = 1",
    );
    if (row?.theme_preference === "light" || row?.theme_preference === "dark") {
      return row.theme_preference;
    }
    return "system";
  },

  async setThemePreference(preference: ThemePreference) {
    await db.runAsync(
      `INSERT INTO app_settings (id, theme_preference)
       VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET theme_preference = excluded.theme_preference`,
      preference,
    );
  },
};
