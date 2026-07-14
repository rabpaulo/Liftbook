import { workoutSessionRepository } from "@/database/repositories/workoutSessionRepository";
import { videoService } from "@/utils/video-service";
import { createWorkoutLifecycle } from "@/utils/workout-lifecycle";

export { DailyWorkoutExistsError } from "@/utils/workout-lifecycle";

const lifecycle = createWorkoutLifecycle(workoutSessionRepository);

export const workoutService = {
  ...lifecycle,
  async deleteWorkout(id: string) {
    const uris = await workoutSessionRepository.delete(id);
    await videoService.removeMany(uris);
  },
  duplicateWorkoutForToday(id: string, prefill = false) {
    return workoutSessionRepository.duplicateForToday(id, prefill);
  },
  duplicateWorkoutAsTemplate(id: string, replaceTemplateId?: string) {
    return workoutSessionRepository.saveAsTemplate(id, replaceTemplateId);
  },
};
