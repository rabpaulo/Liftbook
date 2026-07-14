import type { WorkoutSessionDetail, WorkoutSet } from "@/utils/training-types";

export function isValidRepetitionCount(repetitions: number | null) {
  return repetitions === null || (Number.isInteger(repetitions) && repetitions >= 1);
}

export function isSetLogged(set: WorkoutSet) {
  return set.weight !== null
    && set.repetitions !== null
    && isValidRepetitionCount(set.repetitions);
}

export function isWorkoutEmpty(workout: WorkoutSessionDetail) {
  return !workout.exercises.some((exercise) =>
    exercise.sets.some((set) => isSetLogged(set)),
  );
}
