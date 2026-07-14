import type { WorkoutSessionDetail } from "@/utils/training-types";
import { defaultWorkoutName } from "@/utils/training-format";

export interface WorkoutLifecycleRepository {
  getToday(date?: Date): Promise<WorkoutSessionDetail | null>;
  startEmpty(name: string, startedAt?: Date): Promise<WorkoutSessionDetail>;
  startFromTemplate(
    templateId: string,
    copyPreviousValues?: boolean,
    startedAt?: Date,
  ): Promise<WorkoutSessionDetail>;
}

export class DailyWorkoutExistsError extends Error {
  constructor(public readonly workout: WorkoutSessionDetail) {
    super("A workout already exists for today.");
  }
}

export function createWorkoutLifecycle(repository: WorkoutLifecycleRepository, now: () => Date = () => new Date()) {
  async function ensureNoWorkoutToday() {
    const workout = await repository.getToday(now());
    if (workout) throw new DailyWorkoutExistsError(workout);
  }
  return {
    async startEmptyWorkout(name = defaultWorkoutName(now())) {
      await ensureNoWorkoutToday();
      return repository.startEmpty(name, now());
    },
    async startWorkoutFromTemplate(templateId: string, copyPreviousValues = false) {
      await ensureNoWorkoutToday();
      return repository.startFromTemplate(templateId, copyPreviousValues, now());
    },
    getTodayWorkout: () => repository.getToday(now()),
  };
}
