import { describe, expect, it } from "vitest";

import { buildTemplateSetSeeds } from "@/utils/template-set-prefill";

const previousSets = [
  { position: 0, weight: 80, repetitions: 8, rir: 1 as const },
  { position: 1, weight: 82.5, repetitions: 6, rir: 0 as const },
];

describe("template set prefill", () => {
  it("starts configured sets with empty values", () => {
    expect(buildTemplateSetSeeds(3, previousSets, false)).toEqual([
      { position: 0, weight: null, repetitions: null, rir: null },
      { position: 1, weight: null, repetitions: null, rir: null },
      { position: 2, weight: null, repetitions: null, rir: null },
    ]);
  });

  it("copies only weight, repetitions, and RIR by set position", () => {
    const seeds = buildTemplateSetSeeds(3, previousSets, true);
    expect(seeds).toEqual([
      { position: 0, weight: 80, repetitions: 8, rir: 1 },
      { position: 1, weight: 82.5, repetitions: 6, rir: 0 },
      { position: 2, weight: null, repetitions: null, rir: null },
    ]);
    expect(seeds[0]).not.toHaveProperty("comment");
  });

  it("uses the previous set structure when the template has no set count", () => {
    expect(buildTemplateSetSeeds(null, previousSets, true)).toHaveLength(2);
    expect(buildTemplateSetSeeds(null, previousSets, false)).toEqual([]);
  });
});
