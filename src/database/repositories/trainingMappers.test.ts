import { describe, expect, it } from "vitest";

import { mapSet, type SetRow } from "@/database/repositories/trainingMappers";
import type { RirValue } from "@/utils/training-types";

describe("RIR database conversion", () => {
  const row = (rir: RirValue): SetRow => ({ id: "s", session_exercise_id: "e", position: 0, weight: 80, repetitions: 8, rir, comment: "Controlled eccentric", is_completed: 1, video_uri: null, created_at: "now", updated_at: "now" });
  it("maps nullable, zero, and 2+ stored RIR values without coercion", () => {
    expect(mapSet(row(null)).rir).toBeNull();
    expect(mapSet(row(0)).rir).toBe(0);
    expect(mapSet(row(2)).rir).toBe(2);
    expect(mapSet(row(2)).comment).toBe("Controlled eccentric");
    expect(mapSet(row(2)).isCompleted).toBe(true);
  });
});
