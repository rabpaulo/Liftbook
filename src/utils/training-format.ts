import type { RirValue } from "@/utils/training-types";

export function normalizeDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeInteger(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "" || !/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function formatRir(rir: RirValue) {
  if (rir === null) return "?";
  return rir === 2 ? "2+" : String(rir);
}

export function formatWorkoutDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function defaultWorkoutName(date = new Date()) {
  return `Workout — ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
