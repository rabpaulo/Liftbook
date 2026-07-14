import type { RirValue } from "@/utils/training-types";

export type PreviousTemplateSetValues = {
  position: number;
  weight: number;
  repetitions: number;
  rir: RirValue;
};

export type TemplateSetSeed = {
  position: number;
  weight: number | null;
  repetitions: number | null;
  rir: RirValue;
};

export function buildTemplateSetSeeds(
  defaultSetCount: number | null,
  previousSets: readonly PreviousTemplateSetValues[],
  copyPreviousValues: boolean,
): TemplateSetSeed[] {
  const previousByPosition = new Map(previousSets.map((set) => [set.position, set]));
  const previousSetCount = previousSets.length === 0
    ? 0
    : Math.max(...previousSets.map((set) => set.position)) + 1;
  const setCount = defaultSetCount ?? (copyPreviousValues ? previousSetCount : 0);

  return Array.from({ length: setCount }, (_, position) => {
    const previous = copyPreviousValues ? previousByPosition.get(position) : undefined;
    return {
      position,
      weight: previous?.weight ?? null,
      repetitions: previous?.repetitions ?? null,
      rir: previous?.rir ?? null,
    };
  });
}
