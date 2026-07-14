import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { BodyweightRepository } from "@/database/repositories/bodyweightRepository";
import type { WeightUnit } from "@/hooks/use-bodyweight";

export function useWeightUnit() {
  const [unit, setUnit] = useState<WeightUnit>("kg");

  useFocusEffect(useCallback(() => {
    let active = true;
    void BodyweightRepository.getSettings().then((settings) => {
      if (active) setUnit(settings?.weight_unit === "lbs" ? "lbs" : "kg");
    }).catch((error: unknown) => console.error("Error loading weight unit:", error));
    return () => { active = false; };
  }, []));

  return unit;
}
