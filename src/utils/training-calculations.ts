import type {
  ExerciseBestPerformance,
  ExercisePersonalRecords,
  SetPersonalRecord,
  WorkoutSessionDetail,
  WorkoutSet,
  WorkoutSummary,
} from "@/utils/training-types";
import { isSetLogged } from "@/utils/training-validation";

export function calculateEstimatedOneRepMax(weight: number, repetitions: number) {
  if (weight <= 0 || repetitions < 1 || repetitions > 12) return null;
  return weight * (1 + repetitions / 30);
}

export function calculateBestPerformance(sets: readonly WorkoutSet[]): ExerciseBestPerformance {
  const valid = sets.filter(
    (set) => isSetLogged(set),
  );
  if (valid.length === 0) {
    return { highestWeight: null, estimatedOneRepMax: null };
  }

  const highestWeight = Math.max(...valid.map((set) => set.weight ?? 0));
  const bestEstimated = valid.reduce<number | null>((best, set) => {
    const estimated = calculateEstimatedOneRepMax(set.weight ?? 0, set.repetitions ?? 0);
    if (estimated === null) return best;
    return best === null || estimated > best ? estimated : best;
  }, null);

  return {
    highestWeight,
    estimatedOneRepMax: bestEstimated,
  };
}

export function calculateSetPersonalRecords(
  sets: readonly WorkoutSet[],
  priorRecords: ExercisePersonalRecords = {
    highestWeight: null,
    highestRepetitions: null,
  },
): SetPersonalRecord[] {
  let highestWeight = priorRecords.highestWeight;
  let highestRepetitions = priorRecords.highestRepetitions;

  return sets.map((set) => {
    if (!isSetLogged(set)) return { weight: false, repetitions: false };

    const weight = set.weight!;
    const repetitions = set.repetitions!;
    const personalRecord = {
      weight: highestWeight === null || weight > highestWeight,
      repetitions: highestRepetitions === null || repetitions > highestRepetitions,
    };

    highestWeight = highestWeight === null ? weight : Math.max(highestWeight, weight);
    highestRepetitions = highestRepetitions === null
      ? repetitions
      : Math.max(highestRepetitions, repetitions);

    return personalRecord;
  });
}

export function calculateWorkoutSummary(
  session: WorkoutSessionDetail,
): WorkoutSummary {
  let completedResistanceSets = 0;

  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (!isSetLogged(set)) continue;
      completedResistanceSets += 1;
    }
  }

  return {
    exerciseCount: session.exercises.length,
    completedResistanceSets,
    completedSetCount: completedResistanceSets,
  };
}
