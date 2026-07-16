import type {
  BodyweightGoal,
  BodyweightPhase,
  BodyweightPhaseDraft,
} from "@/utils/bodyweight-types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type BodyweightPhaseStatus = "current" | "completed" | "upcoming";

function calendarDayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_IN_MS;
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getBodyweightPhasePlannedEnd(phase: Pick<BodyweightPhase, "startedOn" | "durationWeeks">) {
  return addCalendarDays(parseLocalDate(phase.startedOn), phase.durationWeeks * 7 - 1);
}

export function getBodyweightPhaseStatus(
  phase: Pick<BodyweightPhase, "startedOn" | "endedOn" | "durationWeeks">,
  today = new Date(),
): BodyweightPhaseStatus {
  const todayDay = calendarDayNumber(today);
  const startDay = calendarDayNumber(parseLocalDate(phase.startedOn));
  if (todayDay < startDay) return "upcoming";
  if (phase.endedOn) return "completed";
  const plannedEndDay = calendarDayNumber(getBodyweightPhasePlannedEnd(phase));
  return todayDay <= plannedEndDay ? "current" : "completed";
}

export function getActiveBodyweightPhase(
  phases: readonly BodyweightPhase[],
  today = new Date(),
) {
  return phases.find((phase) => getBodyweightPhaseStatus(phase, today) === "current") ?? null;
}

export function getBodyweightPhaseProgress(
  phase: Pick<BodyweightPhase, "startedOn" | "durationWeeks">,
  today = new Date(),
) {
  const totalDays = phase.durationWeeks * 7;
  const elapsedDays = Math.min(
    totalDays,
    Math.max(0, calendarDayNumber(today) - calendarDayNumber(parseLocalDate(phase.startedOn)) + 1),
  );
  return {
    currentDay: elapsedDays,
    totalDays,
    progress: totalDays === 0 ? 0 : elapsedDays / totalDays,
  };
}

export function normalizeBodyweightGoal(goal: string | null | undefined): BodyweightGoal {
  return goal === "lose" || goal === "maintain" || goal === "gain" ? goal : "maintain";
}

export function normalizeBodyweightPhaseDraft(draft: BodyweightPhaseDraft): BodyweightPhaseDraft {
  const goal = normalizeBodyweightGoal(draft.goal);
  return {
    name: draft.name.trim(),
    goal,
    durationWeeks: Math.trunc(draft.durationWeeks),
    weeklyTarget: goal === "maintain" ? 0 : draft.weeklyTarget,
  };
}

export function isValidBodyweightPhaseDraft(draft: BodyweightPhaseDraft) {
  const normalized = normalizeBodyweightPhaseDraft(draft);
  return normalized.name.length > 0
    && normalized.name.length <= 80
    && normalized.durationWeeks >= 1
    && normalized.durationWeeks <= 104
    && Number.isFinite(normalized.weeklyTarget)
    && (normalized.goal === "maintain" || normalized.weeklyTarget > 0);
}

