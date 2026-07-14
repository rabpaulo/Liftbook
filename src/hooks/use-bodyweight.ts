import { BodyweightRepository } from "@/database/repositories/bodyweightRepository";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

export type BodyweightGoal = "lose" | "maintain" | "gain";
export type WeightUnit = "kg" | "lbs";
export type TrendStatus = "success" | "danger" | "neutral";

export interface BodyweightLog {
  id: number;
  date: string; // DD/MM/YY
  weight: number;
  image_uri?: string | null;
}

export interface BodyweightSettings {
  goal: BodyweightGoal;
  weeklyTarget: number;
  weightUnit: WeightUnit;
}

export interface WeeklyData {
  id: string;
  count: number;
  avg: string;
  diff: string | null;
  entries: BodyweightLog[];
}

export const defaultBodyweightSettings: BodyweightSettings = {
  goal: "maintain",
  weeklyTarget: 0.2,
  weightUnit: "kg",
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", DATE_FORMAT);
}

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(2000 + year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Monday of the week containing `date` (weeks run Mon–Sun)
function getMonday(date: Date): Date {
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  return addDays(date, -(dayOfWeek - 1));
}

function average(entries: BodyweightLog[]): number {
  return entries.reduce((sum, e) => sum + e.weight, 0) / entries.length;
}

function normalizeGoal(goal: string | null | undefined): BodyweightGoal {
  if (goal === "lose" || goal === "gain" || goal === "maintain") return goal;
  return defaultBodyweightSettings.goal;
}

function getDesiredWeeklyChange(settings: BodyweightSettings) {
  if (settings.goal === "lose") return -settings.weeklyTarget;
  if (settings.goal === "gain") return settings.weeklyTarget;
  return 0;
}

export function getBodyweightTrendStatus(
  trend: number | null,
  settings: BodyweightSettings,
): TrendStatus {
  if (trend === null) return "neutral";

  const target = Math.max(settings.weeklyTarget, 0.1);
  const tolerance = Math.max(0.15, target * 0.25);
  const desiredChange = getDesiredWeeklyChange(settings);

  return Math.abs(trend - desiredChange) <= tolerance ? "success" : "danger";
}

export function useBodyweight() {
  const repo = BodyweightRepository;
  const [logs, setLogs] = useState<BodyweightLog[]>([]);
  const [settings, setSettings] = useState<BodyweightSettings>(defaultBodyweightSettings);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await repo.findAll();
      setLogs(data);
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  }, [repo]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await repo.getSettings();
      setSettings({
        goal: normalizeGoal(data?.goal),
        weeklyTarget: data?.weekly_target && data.weekly_target > 0
          ? data.weekly_target
          : defaultBodyweightSettings.weeklyTarget,
        weightUnit: data?.weight_unit === "lbs" ? "lbs" : "kg",
      });
    } catch (error) {
      console.error("Error loading bodyweight settings:", error);
    }
  }, [repo]);

  useFocusEffect(useCallback(() => {
    fetchLogs();
    fetchSettings();
  }, [fetchLogs, fetchSettings]));

  const weeklyData = useMemo<WeeklyData[]>(() => {
    const groups: Record<string, { monday: Date; entries: BodyweightLog[] }> = {};

    logs.forEach((log) => {
      const monday = getMonday(parseDate(log.date));
      const weekKey = formatDate(monday);
      if (!groups[weekKey]) groups[weekKey] = { monday, entries: [] };
      groups[weekKey].entries.push(log);
    });

    return Object.entries(groups)
      .map(([weekStart, { monday, entries }]) => {
        const avg = average(entries);
        const prevWeek = groups[formatDate(addDays(monday, -7))];
        const diff = prevWeek ? (avg - average(prevWeek.entries)).toFixed(2) : null;

        return {
          id: weekStart,
          count: entries.length,
          avg: avg.toFixed(2),
          diff,
          entries,
        };
      })
      .sort((a, b) => parseDate(b.id).getTime() - parseDate(a.id).getTime());
  }, [logs]);

  const bodyweightTrend = useMemo(() => {
    const latestTrend = weeklyData.find((week) => week.diff !== null)?.diff;
    if (latestTrend === undefined || latestTrend === null) return null;
    const parsedTrend = Number(latestTrend);
    return Number.isFinite(parsedTrend) ? parsedTrend : null;
  }, [weeklyData]);

  const bodyweightGoal = useMemo(() => getDesiredWeeklyChange(settings), [settings]);
  const trendStatus = useMemo(
    () => getBodyweightTrendStatus(bodyweightTrend, settings),
    [bodyweightTrend, settings],
  );

  const removeLog = async (id: number) => {
    try {
      await repo.remove(id);
      await fetchLogs();
    } catch (error) {
      console.error("Error deleting log:", error);
    }
  };

  const updateLog = async (id: number, weightValue: string | number) => {
    const weight = typeof weightValue === "number" ? weightValue : parseFloat(weightValue);
    if (isNaN(weight)) return false;
    try {
      await repo.update(id, weight);
      await fetchLogs();
      return true;
    } catch (error) {
      console.error("Error updating log:", error);
      return false;
    }
  };

  const addLog = async (date: string, weightValue: string | number, imageUri?: string | null) => {
    const weight = typeof weightValue === "number" ? weightValue : parseFloat(weightValue);
    if (isNaN(weight)) return false;
    try {
      await repo.create(date, weight, imageUri);
      await fetchLogs();
      return true;
    } catch (error) {
      console.error("Error saving weight:", error);
      return false;
    }
  };

  const updateLogImage = async (id: number, imageUri: string | null) => {
    try {
      await repo.updateImage(id, imageUri);
      await fetchLogs();
      return true;
    } catch (error) {
      console.error("Error updating bodyweight photo:", error);
      return false;
    }
  };

  const checkEntryToday = async (date = formatDate(new Date())) => {
    return await repo.existsByDate(date);
  };

  const updateSettings = async (nextSettings: BodyweightSettings) => {
    const weeklyTarget = Number.isFinite(nextSettings.weeklyTarget) && nextSettings.weeklyTarget > 0
      ? nextSettings.weeklyTarget
      : defaultBodyweightSettings.weeklyTarget;
    const normalizedSettings = {
      goal: normalizeGoal(nextSettings.goal),
      weeklyTarget,
      weightUnit: nextSettings.weightUnit === "lbs" ? "lbs" as const : "kg" as const,
    };

    try {
      await repo.upsertSettings(
        normalizedSettings.goal,
        normalizedSettings.weeklyTarget,
        normalizedSettings.weightUnit,
      );
      setSettings(normalizedSettings);
      return true;
    } catch (error) {
      console.error("Error saving bodyweight settings:", error);
      return false;
    }
  };

  return {
    weeklyData,
    settings,
    bodyweightGoal,
    bodyweightTrend,
    trendStatus,
    addLog,
    removeLog,
    updateLog,
    updateLogImage,
    updateSettings,
    checkEntryToday,
  };
}
