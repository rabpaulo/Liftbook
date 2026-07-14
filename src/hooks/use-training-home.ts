import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { workoutSessionRepository } from "@/database/repositories/workoutSessionRepository";
import { workoutTemplateRepository } from "@/database/repositories/workoutTemplateRepository";
import type { WorkoutHistoryItem, WorkoutTemplate } from "@/utils/training-types";

export function useTrainingHome() {
  const [todayWorkout, setTodayWorkout] = useState<WorkoutHistoryItem | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [today, savedTemplates] = await Promise.all([
        workoutSessionRepository.workoutToday(),
        workoutTemplateRepository.list(),
      ]);
      setTodayWorkout(today);
      setTemplates(savedTemplates);
    } catch (cause) {
      if (__DEV__) console.error(cause);
      setError("Training data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { todayWorkout, templates, loading, error, refresh };
}
