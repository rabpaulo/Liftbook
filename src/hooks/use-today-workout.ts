import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

import { workoutSessionRepository } from "@/database/repositories/workoutSessionRepository";
import { workoutSetRepository, type WorkoutSetUpdate } from "@/database/repositories/workoutSetRepository";
import { videoService } from "@/utils/video-service";
import { workoutService } from "@/utils/workout-service";
import type { Exercise, WorkoutSessionDetail } from "@/utils/training-types";

export function useTodayWorkout(id: string) {
  const [workout, setWorkout] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingActions = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try {
      const todayWorkout = await workoutSessionRepository.getToday();
      if (!todayWorkout || todayWorkout.id !== id) {
        setError("This workout is no longer editable today.");
        setWorkout(null);
        return;
      }
      const value = await workoutSessionRepository.getById(id);
      if (!value) {
        setError("Workout not found.");
        setWorkout(null);
        return;
      }
      for (const exercise of value.exercises) {
        if (exercise.exerciseId) {
          exercise.previousSets = await workoutSessionRepository.previousPerformance(exercise.exerciseId, value.startedAt);
          exercise.priorPersonalRecords = await workoutSessionRepository.personalRecordsBefore(
            exercise.exerciseId,
            value.startedAt,
          );
        }
      }
      setWorkout(value);
      setError(null);
    } catch (cause) {
      if (__DEV__) console.error(cause);
      setError("The workout could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const once = useCallback(async (key: string, action: () => Promise<void>) => {
    if (pendingActions.current.has(key)) return;
    pendingActions.current.add(key);
    try {
      await action();
      await refresh();
    } finally {
      pendingActions.current.delete(key);
    }
  }, [refresh]);

  return {
    workout,
    loading,
    error,
    async updateWorkout(patch: { name?: string; notes?: string | null }) {
      await workoutSessionRepository.update(id, patch);
      setWorkout((current) => current ? { ...current, ...patch } : current);
    },
    async addExercise(exercise: Exercise) {
      await once(`add-exercise-${exercise.id}`, () => workoutSessionRepository.addExercise(id, exercise));
    },
    async removeExercise(exerciseId: string) {
      await once(`remove-exercise-${exerciseId}`, async () => {
        const uris = await workoutSessionRepository.removeExercise(exerciseId);
        await videoService.removeMany(uris);
      });
    },
    async reorderExercises(orderedIds: readonly string[]) {
      const actionKey = "reorder-exercises";
      if (pendingActions.current.has(actionKey)) return;
      if (!workout) throw new Error("Today’s workout not found.");
      const exercisesById = new Map(workout.exercises.map((exercise) => [exercise.id, exercise]));
      if (
        orderedIds.length !== exercisesById.size
        || new Set(orderedIds).size !== exercisesById.size
        || orderedIds.some((exerciseId) => !exercisesById.has(exerciseId))
      ) {
        throw new Error("Exercise order is out of date.");
      }

      pendingActions.current.add(actionKey);
      setWorkout((current) => current ? {
        ...current,
        exercises: orderedIds.map((exerciseId, position) => ({
          ...exercisesById.get(exerciseId)!,
          position,
        })),
      } : current);
      try {
        await workoutSessionRepository.reorderExercises(id, orderedIds);
      } catch (cause) {
        await refresh();
        throw cause;
      } finally {
        pendingActions.current.delete(actionKey);
      }
    },
    async updateExerciseNotes(exerciseId: string, notes: string | null) {
      await workoutSessionRepository.updateExerciseNotes(exerciseId, notes);
      await refresh();
    },
    async addSet(sessionExerciseId: string, copyWeight: number | null) {
      await once(`add-set-${sessionExerciseId}`, async () => { await workoutSetRepository.add(sessionExerciseId, copyWeight); });
    },
    async updateSet(setId: string, patch: WorkoutSetUpdate) {
      const updated = await workoutSetRepository.update(setId, patch);
      setWorkout((current) => current ? {
        ...current,
        exercises: current.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => set.id === setId ? updated : set),
        })),
      } : current);
      return updated;
    },
    async deleteSet(setId: string) {
      await once(`delete-set-${setId}`, async () => {
        const uri = await workoutSetRepository.remove(setId);
        await videoService.remove(uri);
      });
    },
    deleteWorkout: () => workoutService.deleteWorkout(id),
  };
}
