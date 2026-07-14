import { useCallback, useRef } from "react";
import { router } from "expo-router";

import { useAppDialog } from "@/components/AppDialog";
import { workoutService } from "@/utils/workout-service";
import { isWorkoutEmpty } from "@/utils/training-validation";

export function useStartTemplateWorkout() {
  const busy = useRef(false);
  const { showDialog, showMessage } = useAppDialog();

  return useCallback(async (templateId: string) => {
    if (busy.current) return;
    busy.current = true;

    try {
      const todayWorkout = await workoutService.getTodayWorkout();
      if (todayWorkout) {
        const empty = isWorkoutEmpty(todayWorkout);
        const conflictAction = await showDialog({
          title: "Workout already exists today",
          message: empty
            ? "Discard the empty workout before starting this template."
            : "Open today’s workout instead of starting another one.",
          icon: empty ? "trash-outline" : "calendar-outline",
          actions: empty
            ? [
                { id: "discard", label: "Discard and continue", variant: "destructive" },
                { id: "cancel", label: "Cancel", variant: "ghost" },
              ]
            : [
                { id: "open", label: "Open today’s workout", variant: "primary" },
                { id: "cancel", label: "Cancel", variant: "ghost" },
              ],
        });
        if (conflictAction === "open") {
          router.push({ pathname: "/training/today/[id]", params: { id: todayWorkout.id } });
          return;
        }
        if (conflictAction !== "discard") return;
        await workoutService.deleteWorkout(todayWorkout.id);
      }

      const valuesAction = await showDialog({
        title: "Start from template",
        message: "Copy weight, repetitions, and RIR from the last session, or begin with empty values. Comments are never copied.",
        icon: "copy-outline",
        actions: [
          { id: "copy", label: "Copy last session", variant: "primary" },
          { id: "empty", label: "Start with empty values" },
          { id: "cancel", label: "Cancel", variant: "ghost" },
        ],
      });
      if (valuesAction !== "copy" && valuesAction !== "empty") return;
      const workout = await workoutService.startWorkoutFromTemplate(
        templateId,
        valuesAction === "copy",
      );
      router.push({ pathname: "/training/today/[id]", params: { id: workout.id } });
    } catch (cause) {
      await showMessage(
        "Could not start workout",
        cause instanceof Error ? cause.message : "Try again.",
      );
    } finally {
      busy.current = false;
    }
  }, [showDialog, showMessage]);
}
